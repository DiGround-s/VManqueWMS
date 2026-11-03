import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { ImportOrders } from "@/features/orders/import-orders";

export const metadata = { title: "Importar pedidos" };

export default async function ImportOrdersPage() {
  await requirePageRole("SUPERVISOR");
  return (
    <>
      <PageHeader eyebrow="Pedidos" title="Importar pedidos" description="Excel o CSV, una fila por línea, agrupadas por la columna ref." />
      <ImportOrders />
    </>
  );
}
