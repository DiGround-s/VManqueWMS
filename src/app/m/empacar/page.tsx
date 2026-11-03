import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { PackingStation } from "@/features/packing/packing-station";

export default async function Page() {
  await requirePageRole();
  return (
    <>
      <PhoneTitle>Empacar</PhoneTitle>
      <PackingStation phone />
    </>
  );
}
