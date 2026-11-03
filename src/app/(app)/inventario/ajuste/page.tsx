import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { InventoryTabs } from "@/features/inventory/tabs";
import { LocationCounter } from "@/features/inventory/location-counter";
import { MoveFlow } from "@/features/inventory/move-flow";

export const metadata = { title: "Ajuste y traspaso" };

export default async function AdjustPage() {
  const user = await requirePageRole();
  return (
    <>
      <PageHeader eyebrow="Bodega" title="Inventario" description="Corrige el stock de una ubicación o mueve unidades entre ubicaciones." />
      <InventoryTabs active="/inventario/ajuste" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ajuste manual" />
          <div className="p-4">
            {hasRole(user, "SUPERVISOR") ? <LocationCounter mode="adjust" /> : <p className="text-sm text-muted">Sólo supervisores. Para contar usa el modo bodega → Contar.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Traspaso" />
          <div className="p-4"><MoveFlow /></div>
        </Card>
      </div>
    </>
  );
}
