import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { OrderForm } from "@/features/orders/order-form";

export const metadata = { title: "Nuevo pedido" };

export default async function NewOrderPage() {
  await requirePageRole("SUPERVISOR");
  // Native <datalist> autocompletion; capped because it is a hint, not a list.
  const products = await db.product.findMany({ where: { active: true }, orderBy: { sku: "asc" }, take: 3000, select: { sku: true, name: true } });
  return (
    <>
      <PageHeader eyebrow="Pedidos" title="Nuevo pedido" description="Pedido manual. Compromete stock apenas se guarda." />
      <OrderForm products={products} />
    </>
  );
}
