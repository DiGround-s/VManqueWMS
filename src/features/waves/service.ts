import "server-only";
import { db, Prisma, type Tx } from "@/server/db";
import { nextCode } from "@/server/codes";
import { UserError } from "@/server/errors";
import { applyMovement } from "@/server/inventory/stock";
import { allocatePicks, slotKey } from "@/server/domain/allocation";
import { closeWaveIfSorted, finishPickingIfDone, lockOrders, logEvent, syncOrderStatus } from "@/features/orders/service";

// Serialises wave creation so two waves never allocate the same shelf units.
const WAVE_LOCK = 7_310_001;

export async function createWave(orderIds: string[], assignedUserId: string | null, userId: string) {
  if (orderIds.length === 0) throw new UserError("Selecciona al menos un pedido");
  if (orderIds.length > 200) throw new UserError("Máximo 200 pedidos por ola");
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WAVE_LOCK})`;
      const locked = await lockOrders(tx, orderIds);
      const notPending = locked.filter((o) => o.status !== "PENDING");
      if (locked.length !== orderIds.length || notPending.length) {
        throw new UserError(`Hay pedidos que ya no están pendientes: ${notPending.map((o) => o.code).slice(0, 5).join(", ") || "recarga la lista"}`);
      }
      const orders = await tx.order.findMany({
        where: { id: { in: orderIds } },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        select: { id: true, lines: { select: { productId: true, qty: true, pickedQty: true } } },
      });

      const demand = new Map<string, number>();
      for (const o of orders)
        for (const l of o.lines) {
          const open = l.qty - l.pickedQty;
          if (open > 0) demand.set(l.productId, (demand.get(l.productId) ?? 0) + open);
        }
      const productIds = [...demand.keys()];

      const [slots, allocatedRows] = await Promise.all([
        tx.stockLevel.findMany({
          where: { productId: { in: productIds }, qty: { gt: 0 }, location: { active: true, role: { in: ["PICK", "RESERVE"] } } },
          select: { productId: true, qty: true, locationId: true, location: { select: { role: true, sortKey: true, code: true } } },
        }),
        productIds.length
          ? tx.$queryRaw<{ locationId: string; productId: string; n: bigint }[]>`
              SELECT t."locationId", t."productId", SUM(t."qtyRequired" - t."qtyPicked") AS n
              FROM "PickTask" t JOIN "Wave" w ON w.id = t."waveId"
              WHERE t.status = 'PENDING' AND t."locationId" IS NOT NULL
                AND w.status IN ('OPEN', 'PICKING') AND t."productId" IN (${Prisma.join(productIds)})
              GROUP BY 1, 2`
          : Promise.resolve([]),
      ]);
      const allocated = new Map(allocatedRows.map((r) => [slotKey(r.locationId, r.productId), Number(r.n)]));
      const plan = allocatePicks(
        demand,
        slots.map((s) => ({ locationId: s.locationId, productId: s.productId, qty: s.qty, role: s.location.role, sortKey: s.location.sortKey, code: s.location.code })),
        allocated,
      );

      const code = await nextCode(tx, "wave");
      const wave = await tx.wave.create({
        data: {
          code,
          createdById: userId,
          assignedUserId,
          orders: { create: orders.map((o, i) => ({ orderId: o.id, slot: i + 1 })) },
          tasks: {
            create: plan.map((t, i) => ({
              productId: t.productId,
              locationId: t.locationId,
              qtyRequired: t.qty,
              sequence: i + 1,
              status: t.short ? ("SHORT" as const) : ("PENDING" as const),
            })),
          },
        },
        select: { id: true, code: true },
      });
      await tx.order.updateMany({ where: { id: { in: orderIds } }, data: { status: "IN_WAVE" } });
      await tx.orderEvent.createMany({
        data: orderIds.map((orderId) => ({ orderId, fromStatus: "PENDING" as const, toStatus: "IN_WAVE" as const, message: `Asignado a la ola ${code}`, userId })),
      });
      const shortUnits = plan.filter((t) => t.short).reduce((n, t) => n + t.qty, 0);
      return { ...wave, shortUnits };
    },
    { timeout: 20_000 },
  );
}

/** Operator takes the wave: OPEN → PICKING, assigning it to them when unassigned. */
export async function startWave(waveId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const updated = await tx.$executeRaw`
      UPDATE "Wave" SET status = 'PICKING', "assignedUserId" = ${userId}, "startedAt" = COALESCE("startedAt", now())
      WHERE id = ${waveId} AND status IN ('OPEN', 'PICKING') AND ("assignedUserId" IS NULL OR "assignedUserId" = ${userId})`;
    if (updated === 0) throw new UserError("La ola está asignada a otra persona o ya no está en picking");
    await finishPickingIfDone(tx, waveId, userId);
  });
}

/**
 * Confirms `qty` units picked for a task (may be partial). With `short`, the task closes as SHORT
 * with what was found. Units are taken off the shelf and handed to the wave's order lines by slot.
 */
export async function confirmPick(taskId: string, qty: number, short: boolean, userId: string) {
  return db.$transaction(async (tx) => {
    const task = await tx.pickTask.findUnique({
      where: { id: taskId },
      select: { id: true, waveId: true, productId: true, locationId: true, qtyRequired: true, qtyPicked: true, status: true, wave: { select: { code: true, status: true } } },
    });
    if (!task || task.status !== "PENDING") throw new UserError("Esta tarea ya fue cerrada");
    if (task.wave.status !== "PICKING") throw new UserError("Toma la ola antes de recoger");
    if (qty < 0 || qty > task.qtyRequired - task.qtyPicked) throw new UserError(`Cantidad máxima: ${task.qtyRequired - task.qtyPicked}`);
    if (qty === 0 && !short) throw new UserError("Ingresa la cantidad recogida");

    // Guarded increment: only applies if nobody else confirmed in between.
    const updated = await tx.$executeRaw`
      UPDATE "PickTask"
      SET "qtyPicked" = "qtyPicked" + ${qty},
          status = (CASE WHEN ${short} THEN 'SHORT' WHEN "qtyPicked" + ${qty} >= "qtyRequired" THEN 'DONE' ELSE 'PENDING' END)::"PickTaskStatus",
          "pickedById" = ${userId}, "updatedAt" = now()
      WHERE id = ${taskId} AND status = 'PENDING' AND "qtyPicked" + ${qty} <= "qtyRequired"`;
    if (updated === 0) throw new UserError("La tarea cambió mientras tanto. Recarga.");

    if (qty > 0) {
      await applyMovement(tx, { type: "PICK", productId: task.productId, qty, fromLocationId: task.locationId, reference: task.wave.code, userId });
      const touched = await distributeToLines(tx, task.waveId, task.productId, qty);
      await syncOrderStatus(tx, touched, userId);
    }
    const finished = await finishPickingIfDone(tx, task.waveId, userId);
    return { finished };
  });
}

/** Hands picked units to the wave's order lines that still need them, lowest slot first. */
async function distributeToLines(tx: Tx, waveId: string, productId: string, qty: number) {
  const lines = await tx.$queryRaw<{ id: string; orderId: string; open: number }[]>`
    SELECT ol.id, ol."orderId", (ol.qty - ol."pickedQty")::int AS open
    FROM "OrderLine" ol
    JOIN "WaveOrder" wo ON wo."orderId" = ol."orderId" AND wo."waveId" = ${waveId}
    JOIN "Order" o ON o.id = ol."orderId"
    WHERE ol."productId" = ${productId} AND o.status = 'IN_WAVE' AND ol."pickedQty" < ol.qty
    ORDER BY wo.slot
    FOR UPDATE OF ol`;
  let left = qty;
  const touched: string[] = [];
  for (const l of lines) {
    if (left <= 0) break;
    const n = Math.min(l.open, left);
    await tx.orderLine.update({ where: { id: l.id }, data: { pickedQty: { increment: n } } });
    touched.push(l.orderId);
    left -= n;
  }
  if (left > 0) throw new UserError("Se recogió más de lo que piden los pedidos de la ola");
  return touched;
}

/** Cancels a wave that has not picked anything yet; its orders go back to PENDING. */
export async function cancelWave(waveId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const wave = await tx.wave.findUnique({ where: { id: waveId }, select: { status: true, code: true, orders: { select: { orderId: true } } } });
    if (!wave || !["OPEN", "PICKING"].includes(wave.status)) throw new UserError("Sólo se cancela una ola abierta o en picking");
    const picked = await tx.pickTask.aggregate({ where: { waveId }, _sum: { qtyPicked: true } });
    if ((picked._sum.qtyPicked ?? 0) > 0) throw new UserError("La ola ya tiene unidades recogidas: cancela los pedidos uno a uno");
    const ids = wave.orders.map((o) => o.orderId);
    const locked = await lockOrders(tx, ids);
    const back = locked.filter((o) => o.status === "IN_WAVE").map((o) => o.id);
    await tx.pickTask.deleteMany({ where: { waveId } });
    await tx.wave.update({ where: { id: waveId }, data: { status: "CANCELLED", doneAt: new Date() } });
    await tx.order.updateMany({ where: { id: { in: back } }, data: { status: "PENDING" } });
    for (const id of back) await logEvent(tx, id, "IN_WAVE", "PENDING", `Ola ${wave.code} cancelada`, userId);
  });
}

export async function assignWave(waveId: string, assignedUserId: string | null) {
  const res = await db.wave.updateMany({ where: { id: waveId, status: { in: ["OPEN", "PICKING"] } }, data: { assignedUserId } });
  if (!res.count) throw new UserError("La ola ya no se puede reasignar");
}

/** Supervisor closes a wave on the sorting table even if some orders are incomplete. */
export async function closeWave(waveId: string) {
  const res = await db.wave.updateMany({ where: { id: waveId, status: "SORTING" }, data: { status: "DONE", doneAt: new Date() } });
  if (!res.count) throw new UserError("Sólo se cierra una ola que está en la mesa");
}

export { closeWaveIfSorted };
