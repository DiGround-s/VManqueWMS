export type ReplSlot = {
  locationId: string;
  code: string;
  productId: string;
  qty: number;
  role: "PICK" | "RESERVE" | "DOCK";
  sortKey: number;
  minQty: number | null;
  maxQty: number | null;
};

export type ReplSuggestion = {
  productId: string;
  toLocationId: string;
  toCode: string;
  fromLocationId: string;
  fromCode: string;
  qty: number;
};

/**
 * PICK slots under their minimum get refilled from RESERVE up to max (or min when no max).
 * Reserve stock is consumed in route order and never double-counted across slots.
 */
export function suggestReplenishment(slots: ReplSlot[]): ReplSuggestion[] {
  const reserve = new Map<string, ReplSlot[]>();
  for (const s of slots) {
    if (s.role !== "RESERVE" || s.qty <= 0) continue;
    const list = reserve.get(s.productId) ?? [];
    list.push({ ...s });
    reserve.set(s.productId, list);
  }
  for (const list of reserve.values()) list.sort((a, b) => a.sortKey - b.sortKey);

  const out: ReplSuggestion[] = [];
  const pickSlots = slots
    .filter((s) => s.role === "PICK" && s.minQty != null && s.qty < s.minQty)
    .sort((a, b) => a.sortKey - b.sortKey);
  for (const slot of pickSlots) {
    let need = (slot.maxQty ?? slot.minQty!) - slot.qty;
    for (const src of reserve.get(slot.productId) ?? []) {
      if (need <= 0) break;
      const take = Math.min(src.qty, need);
      if (take <= 0) continue;
      src.qty -= take;
      need -= take;
      out.push({ productId: slot.productId, toLocationId: slot.locationId, toCode: slot.code, fromLocationId: src.locationId, fromCode: src.code, qty: take });
    }
  }
  return out;
}
