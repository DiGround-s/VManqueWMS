export type LocationSpec = {
  zone: string;
  aisleFrom: number;
  aisleTo: number;
  rackFrom: number;
  rackTo: number;
  levelFrom: number;
  levelTo: number;
};

export type GeneratedLocation = {
  code: string;
  zone: string;
  aisle: number;
  rack: number;
  level: number;
  sortKey: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

export const locationCode = (zone: string, aisle: number, rack: number, level: number) =>
  `${zone}-${pad(aisle)}-${pad(rack)}-${pad(level)}`;

/**
 * Walking order: zones alphabetically, aisles ascending, racks in serpentine
 * (odd aisles go up, even aisles come back down), levels bottom to top.
 */
export function locationSortKey(zone: string, aisle: number, rack: number, level: number, maxRack = 99) {
  const zoneIdx = zone.toUpperCase().charCodeAt(0) - 64; // A=1
  const rackOnRoute = aisle % 2 === 1 ? rack : maxRack + 1 - rack;
  return zoneIdx * 1_000_000 + aisle * 10_000 + rackOnRoute * 100 + level;
}

export function generateLocations(spec: LocationSpec): GeneratedLocation[] {
  const zone = spec.zone.trim().toUpperCase();
  if (!/^[A-Z]{1,3}$/.test(zone)) throw new Error("La zona debe ser de 1 a 3 letras");
  const ranges: [number, number][] = [
    [spec.aisleFrom, spec.aisleTo],
    [spec.rackFrom, spec.rackTo],
    [spec.levelFrom, spec.levelTo],
  ];
  for (const [from, to] of ranges) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 99 || from > to) {
      throw new Error("Rangos inválidos: usa números de 1 a 99 y desde ≤ hasta");
    }
  }
  const out: GeneratedLocation[] = [];
  for (let aisle = spec.aisleFrom; aisle <= spec.aisleTo; aisle++)
    for (let rack = spec.rackFrom; rack <= spec.rackTo; rack++)
      for (let level = spec.levelFrom; level <= spec.levelTo; level++)
        out.push({ code: locationCode(zone, aisle, rack, level), zone, aisle, rack, level, sortKey: locationSortKey(zone, aisle, rack, level) });
  if (out.length > 2000) throw new Error("Máximo 2000 ubicaciones por vez");
  return out;
}
