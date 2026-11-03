export type ShelfSlot = {
  locationId: string;
  productId: string;
  qty: number;
  role: "PICK" | "RESERVE" | "DOCK";
  sortKey: number;
  code: string;
};

export type PlannedTask = {
  productId: string;
  locationId: string | null;
  qty: number;
  sortKey: number;
  code: string;
  short: boolean;
};

/** Key for "already allocated to open pick tasks" lookups. */
export const slotKey = (locationId: string, productId: string) => `${locationId}:${productId}`;

/**
 * Plans pick tasks for a wave. For each product, takes from PICK locations first, then RESERVE,
 * each group in walking order, never more than shelf qty minus what open tasks already reserved.
 * Whatever cannot be covered becomes a shortage task (locationId null).
 * Result is sorted by route so the picker walks once; shortages go last.
 */
export function allocatePicks(
  demand: Map<string, number>,
  slots: ShelfSlot[],
  allocated: Map<string, number> = new Map(),
): PlannedTask[] {
  const byProduct = new Map<string, ShelfSlot[]>();
  for (const s of slots) {
    if (s.role === "DOCK") continue;
    const list = byProduct.get(s.productId) ?? [];
    list.push(s);
    byProduct.set(s.productId, list);
  }

  const tasks: PlannedTask[] = [];
  for (const [productId, wanted] of demand) {
    let remaining = wanted;
    const candidates = (byProduct.get(productId) ?? []).sort(
      (a, b) => roleRank(a.role) - roleRank(b.role) || compareRoute(a, b),
    );
    for (const slot of candidates) {
      if (remaining <= 0) break;
      const free = slot.qty - (allocated.get(slotKey(slot.locationId, productId)) ?? 0);
      if (free <= 0) continue;
      const take = Math.min(free, remaining);
      tasks.push({ productId, locationId: slot.locationId, qty: take, sortKey: slot.sortKey, code: slot.code, short: false });
      remaining -= take;
    }
    if (remaining > 0) {
      tasks.push({ productId, locationId: null, qty: remaining, sortKey: Number.MAX_SAFE_INTEGER, code: "", short: true });
    }
  }
  return sortByRoute(tasks);
}

const roleRank = (role: ShelfSlot["role"]) => (role === "PICK" ? 0 : 1);

export function compareRoute(a: { sortKey: number; code: string }, b: { sortKey: number; code: string }) {
  return a.sortKey - b.sortKey || a.code.localeCompare(b.code);
}

export function sortByRoute<T extends { sortKey: number; code: string }>(items: T[]): T[] {
  return [...items].sort(compareRoute);
}
