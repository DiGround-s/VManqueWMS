import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { ReceiveFlow } from "@/features/inventory/receive-flow";

export default async function Page() {
  await requirePageRole();
  return (
    <>
      <PhoneTitle sub="Mercadería que llega: producto, cantidad y dónde la dejas.">Recibir</PhoneTitle>
      <ReceiveFlow mode="receive" phone />
    </>
  );
}
