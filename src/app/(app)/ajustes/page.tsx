import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { getCompanyName } from "@/features/settings/service";
import { SettingsForm } from "@/features/settings/settings-form";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  await requirePageRole("ADMIN");
  return (
    <>
      <PageHeader eyebrow="Administración" title="Ajustes" />
      <SettingsForm companyName={await getCompanyName()} />
    </>
  );
}
