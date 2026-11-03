import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { ReceiveFlow } from "@/features/inventory/receive-flow";

export default async function Page() {
  await requirePageRole();
  return (
    <>
      <PhoneTitle sub="Del andén a su ubicación.">Ubicar</PhoneTitle>
      <ReceiveFlow mode="putaway" phone />
    </>
  );
}
