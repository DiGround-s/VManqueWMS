import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { SortingStation } from "@/features/sorting/sorting-station";
import { sortingWaves } from "@/features/sorting/queries";

export default async function PhoneSorting({ searchParams }: { searchParams: Promise<{ ola?: string }> }) {
  await requirePageRole();
  const { waves, selected } = await sortingWaves((await searchParams).ola);
  return (
    <>
      <PhoneTitle>Separar</PhoneTitle>
      <SortingStation waves={waves} selected={selected} basePath="/m/separar" phone />
    </>
  );
}
