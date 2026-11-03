import "server-only";
import { db } from "@/server/db";
import { UserError } from "@/server/errors";
import { resolveCode } from "@/server/resolver";
import { applyMovement } from "@/server/inventory/stock";
import { lockOrders, logEvent } from "@/features/orders/service";
import { ORDER_STATUS } from "@/lib/labels";

export type ShipResult = { code: string; customerName: string; carrier: string | null; already: boolean };

/** Scanning a packed order's label marks it SHIPPED and records SHIP movements (history only). */
export async function shipScan(code: string, userId: string): Promise<ShipResult> {
  const r = await resolveCode(code);
  if (r.type !== "order") throw new UserError(`${code} no es una etiqueta de pedido`);
  return db.$transaction(async (tx) => {
    const [locked] = await lockOrders(tx, [r.order.id]);
    const order = await tx.order.findUniqueOrThrow({
      where: { id: r.order.id },
      select: { id: true, code: true, customerName: true, carrier: true, lines: { select: { productId: true, qty: true } } },
    });
    if (locked.status === "SHIPPED") return { code: order.code, customerName: order.customerName, carrier: order.carrier, already: true };
    if (locked.status !== "PACKED") throw new UserError(`${order.code} no está empacado (estado: ${ORDER_STATUS[locked.status].label})`);
    await tx.order.update({ where: { id: order.id }, data: { status: "SHIPPED", shippedAt: new Date() } });
    for (const l of order.lines) await applyMovement(tx, { type: "SHIP", productId: l.productId, qty: l.qty, reference: order.code, userId });
    await logEvent(tx, order.id, "PACKED", "SHIPPED", "Despachado", userId);
    return { code: order.code, customerName: order.customerName, carrier: order.carrier, already: false };
  });
}
