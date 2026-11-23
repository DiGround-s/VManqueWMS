import type { SalesChannel } from "@prisma/client";
import { ArrowDownToLine, ArrowUpFromLine, Bell, KeyRound, RefreshCw, Webhook } from "lucide-react";
import { requirePageRole } from "@/server/auth/current";
import { db } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChannelLogo } from "@/features/sales/channel-logo";
import { CHANNELS } from "@/lib/channels";
import { cn } from "@/lib/cn";
import { ARRIVAL_LABEL, STORE_APIS, type ApiCall, type StoreApi } from "@/features/integrations/apis-info";

export const metadata = { title: "APIs de tiendas" };
export const dynamic = "force-dynamic";

const ARRIVAL_ICON = { notificaciones: Bell, webhook: Webhook, consulta: RefreshCw, "api-propia": KeyRound } as const;

/** Read-only overview: how each marketplace API reaches the WMS and what goes back. */
export default async function StoreApisPage() {
  await requirePageRole();
  const accounts = await db.marketplaceAccount.findMany({ select: { channel: true } });
  const connected = new Set<SalesChannel>(accounts.map((a) => a.channel));

  return (
    <>
      <PageHeader
        title="APIs de tiendas"
        description="Cómo se conecta cada marketplace con el WMS: cómo se autentica, cómo llegan los pedidos y qué se le devuelve. Todo entra por un conector a la misma base de datos."
      />

      <Hub connected={connected} />

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {STORE_APIS.map((s) => (
          <ApiCard key={s.channel} s={s} connected={s.channel === "DIRECT" || connected.has(s.channel)} />
        ))}
      </div>
    </>
  );
}

/** Every store feeding the WMS through its connector, with a message moving along each line. */
function Hub({ connected }: { connected: Set<SalesChannel> }) {
  return (
    <Card className="p-5">
      <div className="label mb-4">Flujo de datos</div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6">
        {STORE_APIS.map((s, i) => {
          const on = s.channel === "DIRECT" || connected.has(s.channel);
          return (
            <div key={s.channel} className="flex flex-col items-center gap-2 text-center">
              <ChannelLogo channel={s.channel} size="lg" />
              <span className="text-xs font-semibold leading-tight">{CHANNELS[s.channel].short}</span>
              <span className="flex h-8 items-start text-[11px] leading-tight text-muted">{s.auth.replace(/ \(.*\)/, "")}</span>
              <span className="relative h-12 w-0.5 rounded-full bg-border" aria-hidden>
                <span className="api-dot absolute -left-[3px] size-2 rounded-full" style={{ animationDelay: `${i * 0.35}s`, background: on ? "var(--color-success, #2fbf78)" : "var(--color-muted, #8b949e)" }} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="rounded-2xl bg-hero px-5 py-4 text-center text-hero-ink">
        <div className="text-lg font-semibold">Conectores del WMS</div>
        <div className="text-sm opacity-75">Reciben el aviso, traen el pedido completo y lo guardan en PostgreSQL</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        {["Ventas y canales", "Pedidos en vivo", "Atención", "Bodega"].map((t) => (
          <div key={t} className="rounded-xl bg-panel-2 px-3 py-2 font-medium">
            {t}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ApiCard({ s, connected }: { s: StoreApi; connected: boolean }) {
  const Icon = ARRIVAL_ICON[s.arrival];
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-4">
        <ChannelLogo channel={s.channel} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{CHANNELS[s.channel].label}</h2>
            {s.channel !== "DIRECT" && (connected ? <Badge tone="success">Conectada</Badge> : <Badge tone="neutral">Sin conectar</Badge>)}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted">{s.baseUrl}</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-panel-2 p-3">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <KeyRound className="size-3.5" aria-hidden /> Autenticación
          </dt>
          <dd className="mt-1 text-sm font-semibold">{s.auth}</dd>
          <dd className="mt-0.5 text-xs leading-snug text-muted">{s.authDetail}</dd>
        </div>
        <div className="rounded-xl bg-panel-2 p-3">
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Icon className="size-3.5" aria-hidden /> Cómo llegan los datos
          </dt>
          <dd className="mt-1 text-sm font-semibold">{ARRIVAL_LABEL[s.arrival]}</dd>
          <dd className="mt-0.5 text-xs leading-snug text-muted">{s.arrivalText}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-muted">Trae:</span>
        {s.brings.map((b) => (
          <span key={b} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-success">
            {b}
          </span>
        ))}
      </div>

      {s.receiver && (
        <div className="mt-3 rounded-xl border border-dashed border-border-strong px-3 py-2 text-xs">
          <span className="font-semibold text-muted">El WMS recibe en </span>
          <code className="font-mono font-semibold">{s.receiver}</code>
        </div>
      )}

      <CallList title={s.channel === "DIRECT" ? "La tienda llama a la API del WMS" : "El WMS consulta"} icon={<ArrowDownToLine className="size-3.5" aria-hidden />} calls={s.calls} />
      {s.returns.length > 0 && <CallList title="El WMS devuelve" icon={<ArrowUpFromLine className="size-3.5" aria-hidden />} calls={s.returns} />}
    </Card>
  );
}

function CallList({ title, icon, calls }: { title: string; icon: React.ReactNode; calls: ApiCall[] }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icon} {title}
      </div>
      <ul className="divide-y divide-border/70 overflow-hidden rounded-xl ring-1 ring-border">
        {calls.map((c) => (
          <li key={c.method + c.path} className="flex items-center gap-2 px-3 py-2 text-xs">
            <span className={cn("w-11 shrink-0 rounded-md px-1.5 py-0.5 text-center font-mono text-[10px] font-bold", c.method === "GET" ? "bg-info-bg text-info" : "bg-warn-bg text-warn")}>{c.method}</span>
            <code className="min-w-0 flex-1 truncate font-mono">{c.path}</code>
            <span className="hidden shrink-0 text-muted sm:inline">{c.what}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
