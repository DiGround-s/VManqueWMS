import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { SortingStation } from "@/features/sorting/sorting-station";
import { sortingWaves } from "@/features/sorting/queries";

export const metadata = { title: "Mesa de separación" };

export default async function SortingPage({ searchParams }: { searchParams: Promise<{ ola?: string }> }) {
  await requirePageRole();
  const { waves, selected } = await sortingWaves((await searchParams).ola);
  return (
    <>
      <PageHeader eyebrow="Salidas" title="Mesa de separación" description="Escanea cada unidad recogida y déjala en la casilla que indica la pantalla." />
      <SortingStation waves={waves} selected={selected} basePath="/mesa" />
    </>
  );
}
