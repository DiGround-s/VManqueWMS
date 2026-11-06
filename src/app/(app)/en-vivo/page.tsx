import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { liveSnapshot } from "@/features/sales/live-service";
import { LiveBoard } from "@/features/sales/live-board";

export const metadata = { title: "Pedidos en vivo" };
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const user = await requirePageRole();
  const initial = await liveSnapshot();
  return (
    <>
      <PageHeader title="Pedidos en vivo" description="Lo que está entrando ahora desde todas las tiendas, minuto a minuto, y cómo avanza en la bodega." />
      <LiveBoard initial={initial} canSimulate={hasRole(user, "SUPERVISOR")} />
    </>
  );
}
