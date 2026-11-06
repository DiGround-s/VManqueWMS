/** Turns location codes (zone / aisle / rack / level) into positions on a 3D floor plan. Pure, no three.js. */

export type LayoutInput = { id: string; zone: string; aisle: number | null; rack: number | null; level: number | null };
export type Placed = { id: string; x: number; y: number; z: number; row: string };
export type Rack = { key: string; x: number; z: number; levels: number; row: string };
export type RowLabel = { key: string; label: string; x: number; z: number };

export const SLOT = { w: 1.25, h: 0.72, d: 0.9 };
const LEVEL_H = 0.95;
const RACK_GAP = 1.45;
const ROW_GAP = 3.2;
const ZONE_GAP = 1.6;

export function layoutWarehouse(locations: LayoutInput[]) {
  const shelved = locations.filter((l) => l.aisle != null && l.rack != null);
  const floor = locations.filter((l) => l.aisle == null || l.rack == null);

  // One row per zone + aisle, in natural order (A-01, A-02, B-01…).
  const rowKeys = [...new Set(shelved.map((l) => `${l.zone}-${String(l.aisle).padStart(2, "0")}`))].sort();
  const maxRack = Math.max(1, ...shelved.map((l) => l.rack ?? 1));
  const width = (maxRack - 1) * RACK_GAP;

  let z = 0;
  let prevZone: string | null = null;
  const rowZ = new Map<string, number>();
  for (const key of rowKeys) {
    const zone = key.split("-")[0];
    if (prevZone != null) z += ROW_GAP + (zone !== prevZone ? ZONE_GAP : 0);
    rowZ.set(key, z);
    prevZone = zone;
  }
  const depth = z;

  const placed: Placed[] = [];
  const racks = new Map<string, Rack>();
  for (const l of shelved) {
    const row = `${l.zone}-${String(l.aisle).padStart(2, "0")}`;
    const x = (l.rack! - 1) * RACK_GAP - width / 2;
    const rz = rowZ.get(row)! - depth / 2;
    const level = l.level ?? 1;
    placed.push({ id: l.id, x, y: (level - 1) * LEVEL_H + SLOT.h / 2 + 0.08, z: rz, row });
    const rk = `${row}-${l.rack}`;
    const r = racks.get(rk);
    if (r) r.levels = Math.max(r.levels, level);
    else racks.set(rk, { key: rk, x, z: rz, levels: level, row });
  }

  // Floor spots (docks and anything without a rack) line up in front of the shelving.
  const frontZ = depth / 2 + ROW_GAP + 0.6;
  floor.forEach((l, i) => {
    placed.push({ id: l.id, x: -width / 2 + i * (RACK_GAP + 0.6), y: 0.2, z: frontZ, row: l.zone });
  });

  // Labels lie on the floor of the aisle in front of each row, just past its first rack.
  const labels: RowLabel[] = rowKeys.map((key) => ({ key, label: `Pasillo ${key}`, x: -width / 2 - 2.2, z: rowZ.get(key)! - depth / 2 + 1.5 }));
  if (floor.length) labels.push({ key: "floor", label: "Andén", x: -width / 2 - 2.2, z: frontZ });

  return { placed, racks: [...racks.values()], labels, size: { width: width + 6, depth: depth + ROW_GAP * 2 + 3 }, levelHeight: LEVEL_H };
}
