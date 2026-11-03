import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { ProductForm } from "@/features/products/product-form";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  await requirePageRole("SUPERVISOR");
  return (
    <>
      <PageHeader eyebrow="Productos" title="Nuevo producto" />
      <div className="max-w-2xl"><ProductForm /></div>
    </>
  );
}
