import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { PackingStation } from "@/features/packing/packing-station";

export const metadata = { title: "Preparación" };

export default async function PackingPage() {
  await requirePageRole();
  return (
    <>
      <PageHeader title="Preparación" description="Verifica cada producto del pedido escaneándolo. Al completar se imprime la etiqueta de envío." />
      <div className="max-w-3xl"><PackingStation /></div>
    </>
  );
}
