import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { AccountForm } from "@/features/users/account-form";
import { ROLE } from "@/lib/labels";

export const metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const user = await requirePageRole();
  return (
    <>
      <PageHeader eyebrow="Mi cuenta" title={user.name} description={`${user.email} · ${ROLE[user.role]}`} />
      <AccountForm />
    </>
  );
}
