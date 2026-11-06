import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Webhook } from "lucide-react";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { ProductThumb } from "@/components/product-thumb";
import { ORDER_STATUS } from "@/lib/labels";
import { CHANNEL_ORDER, CHANNELS, channelVar, clp, clpShort, isChannel } from "@/lib/channels";
import { cn } from "@/lib/cn";
import { fmtNum, fmtTime } from "@/lib/format";
import { channelBreakdown, dailySeries, monthlySeries, recentOrders, revenueSummary, topProducts } from "@/features/sales/service";
import { ChannelLogo } from "@/features/sales/channel-logo";
import { ChannelLegend, RevenueChart } from "@/features/sales/revenue-chart";
import { LiveRefresh, SimulateOrder } from "@/features/sales/live";

export const metadata = { title: "Ventas y canales" };
export const dynamic = "force-dynamic";

const SLUG = { MERCADOLIBRE: "mercadolibre", FALABELLA: "falabella", PARIS: "paris", DIRECT: "tienda" } as const;

function ago(d: Date | null) {
  if (!d) return "sin pedidos";
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "hace segundos";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (!before) return <span className="text-xs text-muted">{label}: sin datos</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold", up ? "bg-success-bg text-success" : "bg-danger-bg text-danger")}>
        <Icon className="size-3.5" aria-hidden />
        {up ? "+" : ""}
        {pct}%
      </span>
      {label}
    </span>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <span className="label">{label}</span>
      <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
      <div className="mt-auto space-y-1">{children}</div>
    </Card>
  );
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ canal?: string }> }) {
  const user = await requirePageRole();
  const sp = await searchParams;
  const filter = sp.canal?.toUpperCase();
  const channel = isChannel(filter) ? filter : undefined;
  const [s, channels, daily, monthly, recent, top] = await Promise.all([revenueSummary(), channelBreakdown(), dailySeries(30), monthlySeries(12), recentOrders(channel, 12), topProducts(6)]);
  const monthTotal = channels.reduce((n, c) => n + c.total, 0) || 1;

  return (
    <>
      <PageHeader
        title="Ventas y canales"
        description="Los pedidos de Mercado Libre, Falabella, Paris y la tienda propia llegan a un solo lugar y entran al mismo flujo de bodega."
        actions={
          <>
            <LiveRefresh seconds={10} />
            {hasRole(user, "SUPERVISOR") && <SimulateOrder />}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
        <Kpi label="Ingresos de hoy" value={clp(s.today)}>
          <Delta now={s.today} before={s.yesterday} label="vs ayer a esta hora" />
          <span className="block text-xs text-muted">{fmtNum(s.today_n)} pedidos</span>
        </Kpi>
        <Kpi label="Este mes" value={clpShort(s.month)}>
          <Delta now={s.month} before={s.prev_month} label="vs mismo tramo del mes pasado" />
          <span className="block text-xs text-muted">Proyección al cierre: <strong className="text-text">{clpShort(s.projection)}</strong></span>
        </Kpi>
        <Kpi label={`Año ${new Date().getFullYear()}`} value={clpShort(s.year)}>
          <Delta now={s.year} before={s.prev_year} label="vs mismo tramo del año pasado" />
          <span className="block text-xs text-muted">{fmtNum(s.year_n)} pedidos</span>
        </Kpi>
        <Kpi label="Ticket promedio (mes)" value={clp(s.avgTicket)}>
          <span className="block text-xs text-muted">{fmtNum(s.month_n)} pedidos este mes</span>
        </Kpi>
        <Kpi label="Ingreso neto (mes)" value={clpShort(s.month - s.month_fee)}>
          <span className="block text-xs text-muted">Comisiones estimadas: {clpShort(s.month_fee)}</span>
        </Kpi>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {channels.map((c) => (
          <Link key={c.channel} href={`/ventas?canal=${c.channel.toLowerCase()}#entrantes`} className="block rounded-2xl">
            <Card className={cn("h-full p-4 transition-shadow hover:shadow-lift", channel === c.channel && "ring-2 ring-text")}>
              <div className="flex items-center gap-3">
                <ChannelLogo channel={c.channel} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{CHANNELS[c.channel].label}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-1.5 rounded-full bg-success" aria-hidden /> Conectado · último pedido {ago(c.lastAt)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <div className="text-2xl font-semibold tracking-tight tabular-nums">{clpShort(c.total)}</div>
                  <div className="text-xs text-muted">este mes · {Math.round((c.total / monthTotal) * 100)}% del total</div>
                </div>
                <div className="text-right text-xs text-muted">
                  <div><strong className="text-text tabular-nums">{c.today}</strong> hoy</div>
                  <div><strong className={cn("tabular-nums", c.open ? "text-text" : "")}>{c.open}</strong> por preparar</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${(c.total / monthTotal) * 100}%`, background: channelVar(c.channel) }} />
              </div>
              <div className="mt-3 flex items-center gap-1.5 truncate font-mono text-[11px] text-muted">
                <Webhook className="size-3.5 shrink-0" aria-hidden /> POST /api/v1/webhooks/{SLUG[c.channel]}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Ingresos diarios · últimos 30 días</h2>
            <ChannelLegend />
          </div>
          <RevenueChart buckets={daily} labelEvery={3} title="Ingresos diarios por tienda, últimos 30 días" />
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Ingresos mensuales · últimos 12 meses</h2>
            <ChannelLegend />
          </div>
          <RevenueChart buckets={monthly} title="Ingresos mensuales por tienda, últimos 12 meses" />
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card id="entrantes" className="scroll-mt-28">
          <CardHeader title="Pedidos entrantes" action={<span className="text-sm text-muted">{channel ? CHANNELS[channel].label : "Todas las tiendas"}</span>} />
          <div className="flex flex-wrap gap-1.5 px-5 pb-3">
            <Link href="/ventas#entrantes" className={cn("h-8 rounded-full px-3 text-xs font-semibold leading-8", !channel ? "bg-accent text-accent-ink" : "bg-panel-2")}>Todas</Link>
            {CHANNEL_ORDER.map((c) => (
              <Link key={c} href={`/ventas?canal=${c.toLowerCase()}#entrantes`} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold", channel === c ? "bg-accent text-accent-ink" : "bg-panel-2")}>
                <span className="size-2 rounded-sm" style={{ background: channelVar(c) }} aria-hidden />
                {CHANNELS[c].label}
              </Link>
            ))}
          </div>
          <ul className="divide-y divide-border/70">
            {recent.map((o) => (
              <li key={o.id}>
                <Link href={`/pedidos/${o.code}`} className="flex items-center gap-3 px-5 py-3 hover:bg-panel-2/60">
                  <ChannelLogo channel={o.channel} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-sm font-semibold">{o.code}</span>
                      <span className="font-mono text-xs text-muted">{o.externalRef}</span>
                    </div>
                    <div className="truncate text-sm text-muted">
                      {o.customerName} · {o.commune} · {o._count.lines} {o._count.lines === 1 ? "producto" : "productos"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{clp(o.total)}</div>
                    <div className="text-xs text-muted">{fmtTime(o.createdAt)} · {ago(o.createdAt)}</div>
                  </div>
                  <StatusBadge map={ORDER_STATUS} value={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Por tienda · este mes" />
            <Table>
              <thead>
                <tr><Th>Tienda</Th><Th className="text-right">Pedidos</Th><Th className="text-right">Ventas</Th><Th className="text-right">Comisión</Th><Th className="text-right">Neto</Th></tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <Tr key={c.channel}>
                    <Td>
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm" style={{ background: channelVar(c.channel) }} aria-hidden />
                        {CHANNELS[c.channel].label}
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums">{fmtNum(c.orders)}</Td>
                    <Td className="text-right tabular-nums">{clp(c.total)}</Td>
                    <Td className="text-right tabular-nums text-muted">{Math.round(CHANNELS[c.channel].rate * 100)}%</Td>
                    <Td className="text-right font-semibold tabular-nums">{clp(c.net)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <p className="px-5 pb-4 pt-2 text-xs text-muted">Comisiones de referencia para la demo, no son las tarifas oficiales de cada marketplace.</p>
          </Card>

          <Card>
            <CardHeader title="Más vendidos del mes" />
            <ul className="divide-y divide-border/70 pb-2">
              {top.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/productos/${p.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-panel-2/60">
                    <span className="w-4 text-sm font-semibold text-muted tabular-nums">{i + 1}</span>
                    <ProductThumb src={p.imageUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <Mono className="text-xs text-muted">{p.sku}</Mono>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums">{clpShort(p.revenue)}</span>
                      <span className="text-xs text-muted">{fmtNum(p.units)} u.</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
