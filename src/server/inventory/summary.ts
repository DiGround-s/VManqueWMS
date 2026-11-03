import "server-only";
import { db, Prisma } from "@/server/db";
import { availableQty } from "@/server/domain/stock";

export type StockSummary = { shelf: number; dock: number; committed: number; inProcess: number; available: number };

const EMPTY: StockSummary = { shelf: 0, dock: 0, committed: 0, inProcess: 0, available: 0 };

/**
 * Per-product stock figures, aggregated in SQL (one query per figure, run together).
 * shelf = PICK+RESERVE, committed = open lines of PENDING/IN_WAVE orders,
 * inProcess = picked and not shipped (incl. pending put-backs of cancelled orders).
 */
export async function stockSummary(productIds: string[]): Promise<Map<string, StockSummary>> {
  const out = new Map<string, StockSummary>();
  if (productIds.length === 0) return out;
  const ids = Prisma.join(productIds);
  const [shelf, committed, inProcess] = await Promise.all([
    db.$queryRaw<{ productId: string; shelf: bigint; dock: bigint }[]>`
      SELECT s."productId",
             COALESCE(SUM(s.qty) FILTER (WHERE l.role <> 'DOCK'), 0) AS shelf,
             COALESCE(SUM(s.qty) FILTER (WHERE l.role = 'DOCK'), 0) AS dock
      FROM "StockLevel" s JOIN "Location" l ON l.id = s."locationId"
      WHERE s."productId" IN (${ids})
      GROUP BY s."productId"`,
    db.$queryRaw<{ productId: string; n: bigint }[]>`
      SELECT ol."productId", SUM(ol.qty - ol."pickedQty") AS n
      FROM "OrderLine" ol JOIN "Order" o ON o.id = ol."orderId"
      WHERE o.status IN ('PENDING', 'IN_WAVE') AND ol."productId" IN (${ids})
      GROUP BY ol."productId"`,
    db.$queryRaw<{ productId: string; n: bigint }[]>`
      SELECT "productId", SUM(n) AS n FROM (
        SELECT ol."productId", ol."pickedQty" AS n
        FROM "OrderLine" ol JOIN "Order" o ON o.id = ol."orderId"
        WHERE o.status IN ('IN_WAVE', 'PICKED', 'SORTED', 'PACKED') AND ol."productId" IN (${ids})
        UNION ALL
        SELECT "productId", qty FROM "PutbackTask" WHERE status = 'PENDING' AND "productId" IN (${ids})
      ) x GROUP BY "productId"`,
  ]);
  const get = (id: string) => out.get(id) ?? (out.set(id, { ...EMPTY }), out.get(id)!);
  for (const r of shelf) Object.assign(get(r.productId), { shelf: Number(r.shelf), dock: Number(r.dock) });
  for (const r of committed) get(r.productId).committed = Number(r.n);
  for (const r of inProcess) get(r.productId).inProcess = Number(r.n);
  for (const id of productIds) {
    const s = get(id);
    s.available = availableQty(s.shelf, s.committed);
  }
  return out;
}
