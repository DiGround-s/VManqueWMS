import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { DispatchStation } from "@/features/dispatch/dispatch-station";

export default async function Page() {
  await requirePageRole();
  return (
    <>
      <PhoneTitle>Despachar</PhoneTitle>
      <DispatchStation phone />
    </>
  );
}
