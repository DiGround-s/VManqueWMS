import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { ImportProducts } from "@/features/products/import-products";

export const metadata = { title: "Importar productos" };

export default async function ImportProductsPage() {
  await requirePageRole("SUPERVISOR");
  return (
    <>
      <PageHeader title="Importar productos" description="Excel o CSV con columnas sku, name, barcode e image (opcional). Los SKU existentes se actualizan." />
      <ImportProducts />
    </>
  );
}
