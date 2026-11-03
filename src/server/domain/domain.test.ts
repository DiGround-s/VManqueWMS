import { describe, expect, it } from "vitest";
import { allocatePicks, slotKey, sortByRoute, type ShelfSlot } from "./allocation";
import { generateLocations, locationSortKey } from "./locations";
import { findSlot, type SortOrder } from "./sorting";
import { availableQty, committedQty, shelfQty } from "./stock";
import { suggestReplenishment } from "./replenishment";
import { parseScan } from "./scan";

const slot = (locationId: string, productId: string, qty: number, role: ShelfSlot["role"], sortKey: number): ShelfSlot => ({
  locationId, productId, qty, role, sortKey, code: locationId,
});

describe("allocatePicks", () => {
  it("takes PICK first, then RESERVE, in route order", () => {
    const tasks = allocatePicks(new Map([["p1", 7]]), [
      slot("R1", "p1", 10, "RESERVE", 1),
      slot("P2", "p1", 3, "PICK", 20),
      slot("P1", "p1", 2, "PICK", 10),
    ]);
    expect(tasks.map((t) => [t.locationId, t.qty])).toEqual([
      ["R1", 2],
      ["P1", 2],
      ["P2", 3],
    ]);
  });

  it("flags shortages and respects stock already allocated to open tasks", () => {
    const tasks = allocatePicks(
      new Map([["p1", 5], ["p2", 1]]),
      [slot("P1", "p1", 4, "PICK", 1), slot("D", "p2", 9, "DOCK", 0)],
      new Map([[slotKey("P1", "p1"), 3]]),
    );
    expect(tasks).toEqual([
      expect.objectContaining({ productId: "p1", locationId: "P1", qty: 1, short: false }),
      expect.objectContaining({ productId: "p1", locationId: null, qty: 4, short: true }),
      expect.objectContaining({ productId: "p2", locationId: null, qty: 1, short: true }),
    ]);
  });

  it("interleaves products by route so the picker walks once", () => {
    const tasks = allocatePicks(new Map([["a", 1], ["b", 1]]), [slot("L3", "a", 1, "PICK", 3), slot("L1", "b", 1, "PICK", 1)]);
    expect(tasks.map((t) => t.locationId)).toEqual(["L1", "L3"]);
  });
});

describe("route", () => {
  it("serpentines racks across aisles", () => {
    expect(locationSortKey("A", 1, 1, 1)).toBeLessThan(locationSortKey("A", 1, 10, 1));
    expect(locationSortKey("A", 2, 10, 1)).toBeLessThan(locationSortKey("A", 2, 1, 1));
    expect(locationSortKey("A", 1, 10, 4)).toBeLessThan(locationSortKey("A", 2, 10, 1));
    expect(locationSortKey("A", 9, 1, 1)).toBeLessThan(locationSortKey("B", 1, 1, 1));
  });

  it("sortByRoute breaks ties by code", () => {
    expect(sortByRoute([{ sortKey: 1, code: "B" }, { sortKey: 1, code: "A" }, { sortKey: 0, code: "Z" }]).map((x) => x.code)).toEqual(["Z", "A", "B"]);
  });

  it("generates codes for every aisle/rack/level", () => {
    const locs = generateLocations({ zone: "a", aisleFrom: 1, aisleTo: 2, rackFrom: 1, rackTo: 3, levelFrom: 1, levelTo: 2 });
    expect(locs).toHaveLength(12);
    expect(locs[0].code).toBe("A-01-01-01");
    expect(() => generateLocations({ zone: "A", aisleFrom: 3, aisleTo: 1, rackFrom: 1, rackTo: 1, levelFrom: 1, levelTo: 1 })).toThrow();
  });
});

describe("findSlot", () => {
  const orders: SortOrder[] = [
    { slot: 2, orderId: "o2", orderCode: "PED-2", status: "IN_WAVE", lines: [{ lineId: "l2", productId: "p", qty: 2, pickedQty: 2, sortedQty: 0 }] },
    { slot: 1, orderId: "o1", orderCode: "PED-1", status: "PICKED", lines: [{ lineId: "l1", productId: "p", qty: 1, pickedQty: 1, sortedQty: 0 }, { lineId: "l1b", productId: "q", qty: 1, pickedQty: 0, sortedQty: 0 }] },
    { slot: 3, orderId: "o3", orderCode: "PED-3", status: "CANCELLED", lines: [{ lineId: "l3", productId: "x", qty: 1, pickedQty: 1, sortedQty: 0 }] },
  ];

  it("returns the lowest slot with picked, unsorted units", () => {
    expect(findSlot(orders, "p")).toMatchObject({ kind: "slot", slot: 1, orderCode: "PED-1", remainingInOrder: 1 });
  });
  it("detects complete, not picked and foreign products", () => {
    const done = orders.map((o) => ({ ...o, lines: o.lines.map((l) => (l.productId === "p" ? { ...l, sortedQty: l.qty } : l)) }));
    expect(findSlot(done, "p").kind).toBe("complete");
    expect(findSlot(orders, "q").kind).toBe("not_picked");
    expect(findSlot(orders, "x").kind).toBe("not_in_wave");
    expect(findSlot(orders, "zzz").kind).toBe("not_in_wave");
  });
});

describe("available stock", () => {
  it("is shelf (PICK+RESERVE) minus open commitments", () => {
    const shelf = shelfQty([
      { productId: "p", qty: 5, role: "PICK" },
      { productId: "p", qty: 10, role: "RESERVE" },
      { productId: "p", qty: 99, role: "DOCK" },
    ]);
    const committed = committedQty([
      { productId: "p", qty: 4, pickedQty: 0, status: "PENDING" },
      { productId: "p", qty: 3, pickedQty: 1, status: "IN_WAVE" },
      { productId: "p", qty: 8, pickedQty: 8, status: "PICKED" },
      { productId: "p", qty: 8, pickedQty: 0, status: "CANCELLED" },
    ]);
    expect(shelf.get("p")).toBe(15);
    expect(committed.get("p")).toBe(6);
    expect(availableQty(shelf.get("p")!, committed.get("p")!)).toBe(9);
  });
});

describe("suggestReplenishment", () => {
  it("refills pick slots up to max from reserve without double counting", () => {
    const base = { productId: "p", minQty: null, maxQty: null };
    const out = suggestReplenishment([
      { ...base, locationId: "P1", code: "P1", qty: 1, role: "PICK", sortKey: 1, minQty: 3, maxQty: 10 },
      { ...base, locationId: "P2", code: "P2", qty: 0, role: "PICK", sortKey: 2, minQty: 2, maxQty: null },
      { ...base, locationId: "R1", code: "R1", qty: 6, role: "RESERVE", sortKey: 5 },
      { ...base, locationId: "R2", code: "R2", qty: 4, role: "RESERVE", sortKey: 6 },
    ]);
    expect(out.map((s) => [s.toCode, s.fromCode, s.qty])).toEqual([
      ["P1", "R1", 6],
      ["P1", "R2", 3],
      ["P2", "R2", 1],
    ]);
  });
});

describe("parseScan", () => {
  it("recognises location labels", () => {
    expect(parseScan(" LOC:a-01-01-01 ")).toEqual({ kind: "location", code: "A-01-01-01" });
    expect(parseScan("7801234")).toEqual({ kind: "any", code: "7801234" });
    expect(parseScan("  ")).toBeNull();
  });
});
