import "server-only";
import { db, Prisma } from "@/server/db";
import { UserError } from "@/server/errors";
import { applyMovement } from "@/server/inventory/stock";

/** Goods in from outside straight to a location (or the dock). */
export async function receive(productId: string, locationId: string, qty: number, userId: string, reference?: string) {
  await db.$transaction((tx) => applyMovement(tx, { type: "RECEIPT", productId, qty, toLocationId: locationId, userId, reference }));
}

/** Put away from the dock: takes from the DOCK location holding the most of this product. */
export async function putaway(productId: string, toLocationId: string, qty: number, userId: string) {
  await db.$transaction(async (tx) => {
    const dock = await tx.stockLevel.findFirst({
      where: { productId, qty: { gte: qty }, location: { role: "DOCK" } },
      orderBy: { qty: "desc" },
      select: { locationId: true },
    });
    if (!dock) throw new UserError(`No hay ${qty} unidades de ese producto en el andén`);
    await applyMovement(tx, { type: "PUTAWAY", productId, qty, fromLocationId: dock.locationId, toLocationId, userId });
  });
}

export async function transfer(productId: string, fromLocationId: string, toLocationId: string, qty: number, userId: string, note?: string) {
  await db.$transaction((tx) => applyMovement(tx, { type: "TRANSFER", productId, qty, fromLocationId, toLocationId, userId, note }));
}

/**
 * Sets the counted quantity of products in one location. `expected` is what the operator saw:
 * rows are locked and compared, so a count never silently overwrites a movement that happened meanwhile.
 */
export async function applyCount(
  locationId: string,
  entries: { productId: string; expected: number; counted: number }[],
  userId: string,
  note: string,
) {
  return db.$transaction(async (tx) => {
    const ids = entries.map((e) => e.productId);
    const rows = await tx.$queryRaw<{ productId: string; qty: number }[]>`
      SELECT "productId", qty FROM "StockLevel"
      WHERE "locationId" = ${locationId} AND "productId" IN (${Prisma.join(ids)}) FOR UPDATE`;
    const current = new Map(rows.map((r) => [r.productId, r.qty]));
    let changed = 0;
    for (const e of entries) {
      const now = current.get(e.productId) ?? 0;
      if (now !== e.expected) throw new UserError("El stock cambió mientras contabas. Vuelve a cargar la ubicación.");
      const delta = e.counted - now;
      if (delta === 0) continue;
      changed++;
      await applyMovement(tx, {
        type: "ADJUSTMENT",
        productId: e.productId,
        qty: Math.abs(delta),
        ...(delta > 0 ? { toLocationId: locationId } : { fromLocationId: locationId }),
        userId,
        note,
      });
    }
    return { changed };
  });
}

/** Returns units of a cancelled order to a shelf. */
export async function completePutback(putbackId: string, locationId: string, userId: string) {
  await db.$transaction(async (tx) => {
    const task = await tx.putbackTask.findUnique({ where: { id: putbackId }, select: { productId: true, qty: true, order: { select: { code: true } } } });
    if (!task) throw new UserError("Reposición no encontrada");
    const res = await tx.putbackTask.updateMany({
      where: { id: putbackId, status: "PENDING" },
      data: { status: "DONE", locationId, doneById: userId, doneAt: new Date() },
    });
    if (!res.count) throw new UserError("Esta reposición ya fue hecha");
    await applyMovement(tx, { type: "RETURN", productId: task.productId, qty: task.qty, toLocationId: locationId, reference: task.order.code, userId, note: "Pedido cancelado" });
  });
}

export async function setSlotLimits(locationId: string, productId: string, minQty: number | null, maxQty: number | null) {
  if (minQty != null && maxQty != null && maxQty < minQty) throw new UserError("El máximo no puede ser menor al mínimo");
  await db.stockLevel.upsert({
    where: { locationId_productId: { locationId, productId } },
    create: { locationId, productId, qty: 0, minQty, maxQty },
    update: { minQty, maxQty },
  });
}
