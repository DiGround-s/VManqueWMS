import "server-only";
import { db } from "@/server/db";
import { suggestReplenishment } from "@/server/domain/replenishment";

/** PICK slots under their minimum, with where to bring stock from (RESERVE, in route order). */
export async function replenishmentReport() {
  const low = await db.stockLevel.findMany({
    where: { minQty: { not: null }, qty: { lt: db.stockLevel.fields.minQty }, location: { role: "PICK", active: true } },
    take: 500, // a report, not a list; more than this means the min/max setup is wrong
    select: { qty: true, minQty: true, maxQty: true, productId: true, locationId: true, location: { select: { code: true, sortKey: true, role: true } } },
  });
  const productIds = [...new Set(low.map((l) => l.productId))];
  const [reserve, products] = await Promise.all([
    db.stockLevel.findMany({
      where: { productId: { in: productIds }, qty: { gt: 0 }, location: { role: "RESERVE", active: true } },
      select: { qty: true, productId: true, locationId: true, location: { select: { code: true, sortKey: true, role: true } } },
    }),
    db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, sku: true, name: true } }),
  ]);
  const toSlot = (s: (typeof reserve)[number] & { minQty?: number | null; maxQty?: number | null }) => ({
    locationId: s.locationId, code: s.location.code, productId: s.productId, qty: s.qty, role: s.location.role, sortKey: s.location.sortKey, minQty: s.minQty ?? null, maxQty: s.maxQty ?? null,
  });
  const suggestions = suggestReplenishment([...low.map(toSlot), ...reserve.map(toSlot)]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const covered = new Set(suggestions.map((s) => s.toLocationId + s.productId));
  return {
    suggestions: suggestions.map((s) => ({ ...s, product: productById.get(s.productId)! })),
    uncovered: low
      .filter((l) => !covered.has(l.locationId + l.productId))
      .map((l) => ({ code: l.location.code, qty: l.qty, minQty: l.minQty, product: productById.get(l.productId)! })),
  };
}

/** Pending put-backs with a suggested shelf (the product's first PICK slot on the route). */
export async function putbackItems() {
  const items = await db.putbackTask.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, qty: true, productId: true, order: { select: { code: true } }, product: { select: { sku: true, name: true } } },
  });
  const slots = await db.stockLevel.findMany({
    where: { productId: { in: [...new Set(items.map((i) => i.productId))] }, location: { role: "PICK", active: true } },
    orderBy: { location: { sortKey: "asc" } },
    select: { productId: true, location: { select: { code: true } } },
  });
  const suggested = new Map<string, string>();
  for (const s of slots) if (!suggested.has(s.productId)) suggested.set(s.productId, s.location.code);
  return items.map((i) => ({ id: i.id, qty: i.qty, orderCode: i.order.code, sku: i.product.sku, name: i.product.name, suggested: suggested.get(i.productId) ?? null }));
}
