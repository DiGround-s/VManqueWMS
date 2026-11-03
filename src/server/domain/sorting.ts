export type SortLine = { lineId: string; productId: string; qty: number; pickedQty: number; sortedQty: number };
export type SortOrder = { slot: number; orderId: string; orderCode: string; status: string; lines: SortLine[] };

export type SortResult =
  | { kind: "slot"; slot: number; orderId: string; orderCode: string; lineId: string; remainingInOrder: number }
  | { kind: "complete" }
  | { kind: "not_picked" }
  | { kind: "not_in_wave" };

const SORTABLE = new Set(["IN_WAVE", "PICKED"]);

/**
 * Where does one scanned unit of `productId` go on the sorting table?
 * Picks the lowest slot whose order still has picked-but-unsorted units of that product.
 */
export function findSlot(orders: SortOrder[], productId: string): SortResult {
  let inWave = false;
  let missingPick = false;
  for (const order of [...orders].sort((a, b) => a.slot - b.slot)) {
    if (order.status === "CANCELLED") continue;
    for (const line of order.lines) {
      if (line.productId !== productId) continue;
      inWave = true;
      if (!SORTABLE.has(order.status)) continue;
      if (line.pickedQty > line.sortedQty) {
        const remaining = order.lines.reduce((n, l) => n + (l.qty - l.sortedQty), 0) - 1;
        return { kind: "slot", slot: order.slot, orderId: order.orderId, orderCode: order.orderCode, lineId: line.lineId, remainingInOrder: remaining };
      }
      if (line.sortedQty < line.qty) missingPick = true;
    }
  }
  if (!inWave) return { kind: "not_in_wave" };
  return missingPick ? { kind: "not_picked" } : { kind: "complete" };
}
