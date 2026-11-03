import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { MoveFlow } from "@/features/inventory/move-flow";

export default async function Page() {
  await requirePageRole();
  return (
    <>
      <PhoneTitle>Mover</PhoneTitle>
      <MoveFlow phone />
    </>
  );
}
