export type StockRow = { productId: string; qty: number; role: "PICK" | "RESERVE" | "DOCK" };
export type CommitLine = { productId: string; qty: number; pickedQty: number; status: string };

const COMMITTING = new Set(["PENDING", "IN_WAVE"]);

/** Units promised to orders that are not yet off the shelf. */
export function committedQty(lines: CommitLine[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of lines) {
    if (!COMMITTING.has(l.status)) continue;
    const open = Math.max(0, l.qty - l.pickedQty);
    if (open > 0) out.set(l.productId, (out.get(l.productId) ?? 0) + open);
  }
  return out;
}

/** Sellable shelf stock: PICK + RESERVE (DOCK is not yet put away). */
export function shelfQty(rows: StockRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (r.role === "DOCK") continue;
    out.set(r.productId, (out.get(r.productId) ?? 0) + r.qty);
  }
  return out;
}

export function availableQty(shelf: number, committed: number) {
  return shelf - committed;
}
