import "server-only";
import { db } from "@/server/db";
import { UserError } from "@/server/errors";
import { requireProduct } from "@/server/resolver";
import { findSlot } from "@/server/domain/sorting";
import { closeWaveIfSorted, syncOrderStatus } from "@/features/orders/service";

export type SortScanResult =
  | { kind: "slot"; slot: number; orderCode: string; product: string; sku: string; remainingInOrder: number; orderComplete: boolean; waveDone: boolean }
  | { kind: "complete" | "not_picked" | "not_in_wave"; product: string; sku: string };

/** One scanned unit at the sorting table → which slot (casilla) it goes to. */
export async function sortScan(waveId: string, code: string, userId: string): Promise<SortScanResult> {
  const product = await requireProduct(code);
  return db.$transaction(async (tx) => {
    const wave = await tx.wave.findUnique({ where: { id: waveId }, select: { status: true } });
    if (wave?.status !== "SORTING") throw new UserError("La ola no está en la mesa de separación");
    const waveOrders = await tx.waveOrder.findMany({
      where: { waveId },
      select: {
        slot: true,
        order: { select: { id: true, code: true, status: true, lines: { select: { id: true, productId: true, qty: true, pickedQty: true, sortedQty: true } } } },
      },
    });
    const result = findSlot(
      waveOrders.map((w) => ({
        slot: w.slot,
        orderId: w.order.id,
        orderCode: w.order.code,
        status: w.order.status,
        lines: w.order.lines.map((l) => ({ lineId: l.id, productId: l.productId, qty: l.qty, pickedQty: l.pickedQty, sortedQty: l.sortedQty })),
      })),
      product.id,
    );
    if (result.kind !== "slot") return { kind: result.kind, product: product.name, sku: product.sku };

    const updated = await tx.$executeRaw`
      UPDATE "OrderLine" SET "sortedQty" = "sortedQty" + 1 WHERE id = ${result.lineId} AND "sortedQty" < "pickedQty"`;
    if (updated === 0) throw new UserError("Otra persona separó esta unidad. Escanea de nuevo.");
    await syncOrderStatus(tx, [result.orderId], userId);
    const waveDone = await closeWaveIfSorted(tx, waveId);
    return {
      kind: "slot",
      slot: result.slot,
      orderCode: result.orderCode,
      product: product.name,
      sku: product.sku,
      remainingInOrder: result.remainingInOrder,
      orderComplete: result.remainingInOrder === 0,
      waveDone,
    };
  });
}
