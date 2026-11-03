import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { PutbackList } from "@/features/inventory/putback-list";
import { putbackItems } from "@/features/inventory/queries";

export default async function Page() {
  await requirePageRole();
  const items = await putbackItems();
  return (
    <>
      <PhoneTitle sub="Productos de pedidos cancelados: devuélvelos a una ubicación.">Reponer</PhoneTitle>
      <PutbackList items={items} phone />
    </>
  );
}
