import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { getCompanyName } from "@/features/settings/service";
import { SettingsForm } from "@/features/settings/settings-form";
import { mlStatus } from "@/features/integrations/service";
import { MercadoLibreCard } from "@/features/integrations/ml-card";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ml?: string }> }) {
  await requirePageRole("ADMIN");
  const [{ ml }, status, company] = await Promise.all([searchParams, mlStatus(), getCompanyName()]);
  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="space-y-6">
        <SettingsForm companyName={company} />
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Integraciones con tiendas</h2>
          <MercadoLibreCard s={status} flash={ml} />
        </section>
      </div>
    </>
  );
}
