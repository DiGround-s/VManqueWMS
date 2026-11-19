import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { getCompanyName } from "@/features/settings/service";
import { SettingsForm } from "@/features/settings/settings-form";
import { mlStatus, storesStatus } from "@/features/integrations/service";
import { StoreCard } from "@/features/integrations/store-card";
import { MercadoLibreCard } from "@/features/integrations/ml-card";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ml?: string }> }) {
  await requirePageRole("ADMIN");
  const [{ ml }, status, stores, company] = await Promise.all([searchParams, mlStatus(), storesStatus(), getCompanyName()]);
  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="space-y-6">
        <SettingsForm companyName={company} />
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Integraciones con tiendas</h2>
          <MercadoLibreCard s={status} flash={ml} />
          {stores.map((s) => (
            <StoreCard key={s.channel} s={s} />
          ))}
        </section>
      </div>
    </>
  );
}
