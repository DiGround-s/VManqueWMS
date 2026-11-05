import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { ConsultView } from "@/features/scan/consult-view";

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await requirePageRole();
  const { c } = await searchParams;
  return (
    <>
      <PhoneTitle>Consultar</PhoneTitle>
      <ConsultView initialCode={c?.trim() || undefined} />
    </>
  );
}
