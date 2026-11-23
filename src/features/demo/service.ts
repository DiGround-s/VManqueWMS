import "server-only";
import { db } from "@/server/db";
import { UserError } from "@/server/errors";
import { applyMovement } from "@/server/inventory/stock";
import { insertOrder, lockOrders } from "@/features/orders/service";
import { createWave } from "@/features/waves/service";
import { DEMO, demoStep } from "./steps";

/** Units kept free on the demo shelf so the test never runs short. */
const SHELF_UNITS = 5;

export async function demoState() {
  const [order, wave] = await Promise.all([
    db.order.findUnique({
      where: { code: DEMO.orderCode },
      select: { status: true, events: { orderBy: { createdAt: "asc" }, select: { id: true, message: true, createdAt: true } } },
    }),
    db.wave.findUnique({ where: { code: DEMO.waveCode }, select: { status: true } }),
  ]);
  return {
    step: demoStep(order?.status, wave?.status),
    events: (order?.events ?? []).map((e) => ({ id: e.id, message: e.message, at: e.createdAt.toISOString() })),
  };
}

export type DemoState = Awaited<ReturnType<typeof demoState>>;

/**
 * Starts the test over: removes the previous run (its order and the demo wave), makes sure the
 * shelf has stock and creates the order again with the same codes.
 */
export async function resetDemo(userId: string) {
  await db.$transaction(
    async (tx) => {
      const [product, location] = await Promise.all([
        tx.product.findUnique({ where: { sku: DEMO.sku }, select: { id: true, active: true } }),
        tx.location.findFirst({ where: { code: DEMO.location, active: true }, select: { id: true } }),
      ]);
      if (!product?.active || !location) throw new UserError(`Para la prueba hacen falta el producto ${DEMO.sku} y la ubicación ${DEMO.location}`);

      const old = await tx.order.findFirst({ where: { OR: [{ code: DEMO.orderCode }, { externalRef: DEMO.externalRef }] }, select: { id: true } });
      if (old) await lockOrders(tx, [old.id]);
      const demoWave = await tx.wave.findUnique({ where: { code: DEMO.waveCode }, select: { id: true } });
      if (demoWave) {
        await tx.pickTask.deleteMany({ where: { waveId: demoWave.id } });
        await tx.waveOrder.deleteMany({ where: { waveId: demoWave.id } });
        await tx.wave.delete({ where: { id: demoWave.id } });
      }
      if (old) {
        await tx.putbackTask.deleteMany({ where: { orderId: old.id } });
        await tx.waveOrder.deleteMany({ where: { orderId: old.id } });
        await tx.order.delete({ where: { id: old.id } });
      }

      // Free units = shelf minus what open waves still have to pick there.
      const [level, reserved] = await Promise.all([
        tx.stockLevel.findUnique({ where: { locationId_productId: { locationId: location.id, productId: product.id } }, select: { qty: true } }),
        tx.pickTask.findMany({
          where: { locationId: location.id, productId: product.id, status: "PENDING", wave: { status: { in: ["OPEN", "PICKING"] } } },
          select: { qtyRequired: true, qtyPicked: true },
        }),
      ]);
      const held = reserved.reduce((n, t) => n + t.qtyRequired - t.qtyPicked, 0);
      const missing = held + SHELF_UNITS - (level?.qty ?? 0);
      if (missing > 0) {
        await applyMovement(tx, {
          type: "ADJUSTMENT",
          productId: product.id,
          qty: missing,
          toLocationId: location.id,
          reference: DEMO.orderCode,
          userId,
          note: "Prueba guiada: stock para la demostración",
        });
      }

      const order = await insertOrder(
        tx,
        {
          externalRef: DEMO.externalRef,
          customerName: DEMO.customerName,
          address: DEMO.address,
          commune: DEMO.commune,
          carrier: DEMO.carrier,
          phone: undefined,
          notes: "Pedido de la prueba guiada",
          priority: 9,
          channel: "DIRECT",
          shippingFee: 0,
          lines: [{ sku: DEMO.sku, qty: DEMO.qty }],
        },
        "MANUAL",
        userId,
      );
      await tx.order.update({ where: { id: order.id }, data: { code: DEMO.orderCode } });
    },
    { timeout: 20_000 },
  );
}

/** Creates the wave for the demo order (same as Olas → Nueva ola) and gives it the fixed code. */
export async function createDemoWave(userId: string) {
  const order = await db.order.findUnique({ where: { code: DEMO.orderCode }, select: { id: true, status: true } });
  if (!order) throw new UserError("Primero crea el pedido de prueba");
  if (order.status !== "PENDING") throw new UserError("El pedido de prueba ya está en una ola");
  const taken = await db.wave.findUnique({ where: { code: DEMO.waveCode }, select: { id: true } });
  if (taken) throw new UserError(`La ola ${DEMO.waveCode} ya existe: reinicia la prueba`);

  const wave = await createWave([order.id], null, userId);
  await db.$transaction([
    db.wave.update({ where: { id: wave.id }, data: { code: DEMO.waveCode } }),
    db.orderEvent.updateMany({ where: { orderId: order.id, message: `Asignado a la ola ${wave.code}` }, data: { message: `Asignado a la ola ${DEMO.waveCode}` } }),
  ]);
  if (wave.shortUnits > 0) throw new UserError(`La ola se creó, pero faltan ${wave.shortUnits} u. en estantería`);
}
