import "server-only";
import { db } from "@/server/db";
import { UserError } from "@/server/errors";
import { resolveCode } from "@/server/resolver";
import { logEvent } from "@/features/orders/service";

export type PackingOrder = Awaited<ReturnType<typeof loadPackingOrder>>;

async function loadPackingOrder(id: string) {
  return db.order.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, code: true, status: true, customerName: true, commune: true, carrier: true,
      lines: { orderBy: { id: "asc" }, select: { id: true, qty: true, sortedQty: true, packedQty: true, product: { select: { id: true, sku: true, name: true, barcode: true, imageUrl: true } } } },
    },
  });
}

/** Finds the order to pack by its code, or by wave code + slot number (`OLA-0001` + `3`). */
export async function openPacking(code: string, slot?: number) {
  let orderId: string | null = null;
  if (slot) {
    const wo = await db.waveOrder.findFirst({ where: { slot, wave: { code: code.trim().toUpperCase() } }, select: { orderId: true } });
    orderId = wo?.orderId ?? null;
  } else {
    const r = await resolveCode(code);
    orderId = r.type === "order" ? r.order.id : null;
  }
  if (!orderId) throw new UserError("Pedido no encontrado");
  const order = await loadPackingOrder(orderId);
  if (!["SORTED", "PACKED"].includes(order.status)) throw new UserError(`El pedido ${order.code} no está listo para empacar (aún no se separa completo)`);
  return order;
}

export type PackScanResult = { kind: "ok"; sku: string; complete: boolean; order: PackingOrder } | { kind: "wrong"; message: string };

/** Verifies one scanned unit against the order. Wrong product → loud error, nothing changes. */
export async function packScan(orderId: string, code: string, userId: string): Promise<PackScanResult> {
  const r = await resolveCode(code);
  if (r.type !== "product") return { kind: "wrong", message: `${code} no es un producto` };
  const product = r.product;
  const done = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (order?.status !== "SORTED") throw new UserError("El pedido no está en preparación");
    const line = await tx.orderLine.findFirst({ where: { orderId, productId: product.id }, select: { id: true, qty: true, packedQty: true } });
    if (!line) return { wrong: `${product.sku} NO va en este pedido` };
    const updated = await tx.$executeRaw`
      UPDATE "OrderLine" SET "packedQty" = "packedQty" + 1 WHERE id = ${line.id} AND "packedQty" < qty AND "packedQty" < "sortedQty"`;
    if (updated === 0) return { wrong: `${product.sku}: ya están todas las unidades (${line.qty})` };
    const left = await tx.orderLine.count({ where: { orderId, packedQty: { lt: db.orderLine.fields.qty } } });
    if (left === 0) {
      const res = await tx.order.updateMany({ where: { id: orderId, status: "SORTED" }, data: { status: "PACKED", packedAt: new Date() } });
      if (res.count) await logEvent(tx, orderId, "SORTED", "PACKED", "Empacado y verificado", userId);
    }
    return { complete: left === 0 };
  });
  if ("wrong" in done) return { kind: "wrong", message: done.wrong! };
  return { kind: "ok", sku: product.sku, complete: done.complete, order: await loadPackingOrder(orderId) };
}
