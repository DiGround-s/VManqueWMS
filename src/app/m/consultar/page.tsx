import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { ConsultView } from "@/features/scan/consult-view";

export default async function Page() {
  await requirePageRole();
  return (
    <>
      <PhoneTitle>Consultar</PhoneTitle>
      <ConsultView />
    </>
  );
}
