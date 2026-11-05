import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { LocationGenerator, SingleLocationForm } from "@/features/locations/location-forms";

export const metadata = { title: "Generar ubicaciones" };

export default async function GeneratePage() {
  await requirePageRole("SUPERVISOR");
  const warehouses = await db.warehouse.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, name: true } });
  return (
    <>
      <PageHeader title="Generar ubicaciones" description="Crea códigos zona-pasillo-rack-nivel (A-01-02-03) con su orden de recorrido." />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <LocationGenerator warehouses={warehouses} />
        <SingleLocationForm warehouses={warehouses} />
      </div>
    </>
  );
}
