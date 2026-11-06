import "server-only";
import type { OrderSource, OrderStatus } from "@prisma/client";
import { db, Prisma, type Tx } from "@/server/db";
import { nextCode } from "@/server/codes";
import { UserError } from "@/server/errors";
import type { OrderInput } from "./schema";
import { CHANNELS } from "@/lib/channels";

export async function logEvent(tx: Tx, orderId: string, from: OrderStatus | null, to: OrderStatus | null, message: string, userId?: string | null) {
  await tx.orderEvent.create({ data: { orderId, fromStatus: from, toStatus: to, message, userId: userId ?? null } });
}

/** Maps SKUs to active products in one query; throws listing every unknown SKU. */
export async function productsBySku(tx: Tx | typeof db, skus: string[]) {
  const unique = [...new Set(skus)];
  const products = await tx.product.findMany({ where: { sku: { in: unique } }, select: { id: true, sku: true, active: true, price: true } });
  const map = new Map(products.map((p) => [p.sku, p]));
  const missing = unique.filter((s) => !map.get(s)?.active);
  if (missing.length) throw new UserError(`SKU inexistente o inactivo: ${missing.slice(0, 10).join(", ")}`);
  return map;
}

/** Creates an order inside `tx`. Duplicate SKUs are merged into one line. */
export async function insertOrder(
  tx: Tx,
  input: OrderInput,
  source: OrderSource,
  userId?: string | null,
  known?: Map<string, { id: string; price: number }>,
) {
  const products = known ?? (await productsBySku(tx, input.lines.map((l) => l.sku)));
  const merged = new Map<string, { qty: number; unitPrice: number }>();
  for (const l of input.lines) {
    const p = products.get(l.sku)!;
    const m = merged.get(p.id);
    merged.set(p.id, { qty: (m?.qty ?? 0) + l.qty, unitPrice: p.price });
  }
  const subtotal = [...merged.values()].reduce((n, l) => n + l.qty * l.unitPrice, 0);
  const total = subtotal + input.shippingFee;
  const commission = Math.round(subtotal * CHANNELS[input.channel].rate);
  const code = await nextCode(tx, "order");
  const { lines: _lines, ...head } = input;
  void _lines;
  const order = await tx.order.create({
    data: { ...head, code, source, total, commission, lines: { create: [...merged].map(([productId, l]) => ({ productId, ...l })) } },
    select: { id: true, code: true },
  });
  await logEvent(tx, order.id, null, "PENDING", `Pedido creado (${sourceLabel(source)}${input.channel !== "DIRECT" ? ` · ${CHANNELS[input.channel].label}` : ""})`, userId);
  return order;
}

const sourceLabel = (s: OrderSource) => ({ MANUAL: "manual", IMPORT: "importación", API: "API" })[s];

/** Idempotent by externalRef: a repeat returns the existing order with created=false. */
export async function createOrder(input: OrderInput, source: OrderSource, userId?: string | null) {
  if (input.externalRef) {
    const existing = await db.order.findUnique({ where: { externalRef: input.externalRef }, select: { id: true, code: true } });
    if (existing) return { ...existing, created: false };
  }
  try {
    const order = await db.$transaction((tx) => insertOrder(tx, input, source, userId));
    return { ...order, created: true };
  } catch (e) {
    if (input.externalRef && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await db.order.findUnique({ where: { externalRef: input.externalRef }, select: { id: true, code: true } });
      if (existing) return { ...existing, created: false };
    }
    throw e;
  }
}

/** Locks order rows for the rest of the transaction. */
export async function lockOrders(tx: Tx, ids: string[]) {
  if (ids.length === 0) return [];
  return tx.$queryRaw<{ id: string; status: OrderStatus; code: string }[]>`
    SELECT id, status, code FROM "Order" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
}

/**
 * Moves orders forward when their lines say so: all picked → PICKED, all sorted → SORTED.
 * Each update is guarded on the current status so concurrent calls never double-advance.
 */
export async function syncOrderStatus(tx: Tx, orderIds: string[], userId?: string | null) {
  if (orderIds.length === 0) return;
  const orders = await tx.order.findMany({
    where: { id: { in: orderIds }, status: { in: ["IN_WAVE", "PICKED"] } },
    select: { id: true, status: true, lines: { select: { qty: true, pickedQty: true, sortedQty: true } } },
  });
  const now = new Date();
  for (const o of orders) {
    const allSorted = o.lines.every((l) => l.sortedQty >= l.qty);
    const allPicked = o.lines.every((l) => l.pickedQty >= l.qty);
    const to: OrderStatus | null = allSorted ? "SORTED" : allPicked && o.status === "IN_WAVE" ? "PICKED" : null;
    if (!to || to === o.status) continue;
    const res = await tx.order.updateMany({
      where: { id: o.id, status: o.status },
      data: { status: to, ...(to === "SORTED" ? { sortedAt: now, pickedAt: now } : { pickedAt: now }) },
    });
    if (res.count) await logEvent(tx, o.id, o.status, to, to === "SORTED" ? "Separado en la mesa" : "Recogido completo", userId);
  }
}

/**
 * Cancels an order. Unpicked units are simply released; picked units become put-back tasks
 * (someone scans a shelf to return them). Open pick tasks of a wave in progress shrink accordingly.
 */
export async function cancelOrder(orderId: string, userId: string, reason: string) {
  return db.$transaction(async (tx) => {
    const [order] = await lockOrders(tx, [orderId]);
    if (!order) throw new UserError("Pedido no encontrado");
    if (order.status === "SHIPPED" || order.status === "CANCELLED") throw new UserError("Este pedido ya no se puede cancelar");

    const lines = await tx.orderLine.findMany({ where: { orderId }, select: { productId: true, qty: true, pickedQty: true } });
    const wave = await tx.waveOrder.findFirst({
      where: { orderId, wave: { status: { in: ["OPEN", "PICKING"] } } },
      select: { waveId: true },
    });
    if (wave) {
      for (const l of lines) await shrinkOpenTasks(tx, wave.waveId, l.productId, l.qty - l.pickedQty);
    }
    const putbacks = lines.filter((l) => l.pickedQty > 0).map((l) => ({ orderId, productId: l.productId, qty: l.pickedQty }));
    if (putbacks.length) await tx.putbackTask.createMany({ data: putbacks });

    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    const units = putbacks.reduce((n, p) => n + p.qty, 0);
    await logEvent(tx, orderId, order.status, "CANCELLED", `Cancelado: ${reason}${units ? ` · ${units} u. por reponer` : ""}`, userId);
    if (wave) await finishPickingIfDone(tx, wave.waveId, userId);
    return { putbacks: units };
  });
}

/** Removes `qty` units of a product from a wave's pending pick tasks, last in route first. */
async function shrinkOpenTasks(tx: Tx, waveId: string, productId: string, qty: number) {
  if (qty <= 0) return;
  const tasks = await tx.pickTask.findMany({
    where: { waveId, productId, status: { in: ["PENDING", "SHORT"] } },
    orderBy: [{ status: "desc" }, { sequence: "desc" }], // SHORT before PENDING, then from the end of the route
    select: { id: true, qtyRequired: true, qtyPicked: true, status: true },
  });
  let left = qty;
  for (const t of tasks) {
    if (left <= 0) break;
    const open = t.qtyRequired - t.qtyPicked;
    const cut = Math.min(open, left);
    if (cut <= 0) continue;
    left -= cut;
    const newRequired = t.qtyRequired - cut;
    if (newRequired === 0) await tx.pickTask.delete({ where: { id: t.id } });
    else await tx.pickTask.update({ where: { id: t.id }, data: { qtyRequired: newRequired, status: newRequired === t.qtyPicked ? "DONE" : t.status } });
  }
}

/** When no PENDING task is left, the wave goes to the sorting table. */
export async function finishPickingIfDone(tx: Tx, waveId: string, userId?: string | null) {
  const pending = await tx.pickTask.count({ where: { waveId, status: "PENDING" } });
  if (pending > 0) return false;
  const res = await tx.wave.updateMany({ where: { id: waveId, status: { in: ["OPEN", "PICKING"] } }, data: { status: "SORTING", pickedAt: new Date() } });
  void userId;
  return res.count > 0;
}

/** A wave in the sorting table is done when none of its orders is waiting to be sorted. */
export async function closeWaveIfSorted(tx: Tx, waveId: string) {
  const waiting = await tx.waveOrder.count({ where: { waveId, order: { status: { in: ["IN_WAVE", "PICKED"] } } } });
  if (waiting > 0) return false;
  const res = await tx.wave.updateMany({ where: { id: waveId, status: "SORTING" }, data: { status: "DONE", doneAt: new Date() } });
  return res.count > 0;
}

/**
 * Takes an order with missing units out of a finished wave so a new wave can pick the rest.
 * Already picked units stay with the order ("in process").
 */
export async function releaseFromWave(orderId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const [order] = await lockOrders(tx, [orderId]);
    if (!order || order.status !== "IN_WAVE") throw new UserError("Sólo se puede liberar un pedido en ola");
    const active = await tx.waveOrder.findFirst({ where: { orderId, wave: { status: { in: ["OPEN", "PICKING"] } } }, select: { id: true } });
    if (active) throw new UserError("La ola todavía se está recogiendo");
    const old = await tx.waveOrder.findMany({ where: { orderId, wave: { status: { in: ["SORTING", "DONE"] } } }, select: { id: true, waveId: true } });
    await tx.waveOrder.deleteMany({ where: { id: { in: old.map((w) => w.id) } } });
    await tx.order.update({ where: { id: orderId }, data: { status: "PENDING" } });
    await logEvent(tx, orderId, "IN_WAVE", "PENDING", "Liberado de la ola para recoger lo que faltó", userId);
    for (const w of old) await closeWaveIfSorted(tx, w.waveId);
  });
}
