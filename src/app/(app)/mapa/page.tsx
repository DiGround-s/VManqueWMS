import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { stockSummary } from "@/server/inventory/summary";
import { PageHeader } from "@/components/ui/page-header";
import { WarehouseMap, type MapLocation, type MapProduct } from "@/features/map/warehouse-map";

export const metadata = { title: "Mapa de la bodega" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ sku?: string; loc?: string }> }) {
  const user = await requirePageRole();
  const sp = await searchParams;
  const [locations, levels, openTasks] = await Promise.all([
    db.location.findMany({
      where: { active: true },
      orderBy: { sortKey: "asc" },
      select: { id: true, code: true, zone: true, aisle: true, rack: true, level: true, role: true },
    }),
    db.stockLevel.findMany({
      where: { qty: { gt: 0 }, location: { active: true } },
      select: {
        locationId: true,
        qty: true,
        minQty: true,
        maxQty: true,
        product: { select: { id: true, sku: true, name: true, imageUrl: true, description: true, barcode: true } },
      },
    }),
    db.pickTask.groupBy({ by: ["locationId"], where: { status: "PENDING", locationId: { not: null } }, _sum: { qtyRequired: true, qtyPicked: true } }),
  ]);

  const products = new Map<string, MapProduct>();
  for (const l of levels) products.set(l.product.id, { ...l.product, available: 0, committed: 0, inProcess: 0 });
  const summary = await stockSummary([...products.keys()]);
  for (const [id, p] of products) {
    const s = summary.get(id);
    if (s) Object.assign(p, { available: s.available, committed: s.committed, inProcess: s.inProcess });
  }
  const picks = new Map(openTasks.map((t) => [t.locationId!, (t._sum.qtyRequired ?? 0) - (t._sum.qtyPicked ?? 0)]));

  const data: MapLocation[] = locations.map((loc) => ({
    ...loc,
    pendingPick: picks.get(loc.id) ?? 0,
    slots: levels.filter((l) => l.locationId === loc.id).map((l) => ({ productId: l.product.id, qty: l.qty, minQty: l.minQty, maxQty: l.maxQty })),
  }));

  return (
    <>
      <PageHeader title="Mapa de la bodega" description="Gira, acerca y toca una casilla para ver qué hay, cuánto queda y qué hacer con ella." />
      <WarehouseMap
        locations={data}
        products={[...products.values()]}
        canAdjust={hasRole(user, "SUPERVISOR")}
        focusSku={sp.sku?.toUpperCase()}
        focusLocation={sp.loc?.toUpperCase()}
      />
    </>
  );
}
