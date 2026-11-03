import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { InventoryTabs } from "@/features/inventory/tabs";
import { PutbackList } from "@/features/inventory/putback-list";
import { putbackItems } from "@/features/inventory/queries";

export const metadata = { title: "Por reponer" };

export default async function PutbackPage() {
  await requirePageRole();
  const items = await putbackItems();
  return (
    <>
      <PageHeader eyebrow="Bodega" title="Inventario" description="Unidades de pedidos cancelados después del picking. Devuélvelas a una ubicación." />
      <InventoryTabs active="/inventario/devoluciones" />
      <Card className="max-w-2xl p-4"><PutbackList items={items} /></Card>
    </>
  );
}
