import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { replenishmentReport } from "@/features/inventory/queries";
import { Card, CardHeader, Rack, Stat } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Table, Td, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { MOVEMENT_TYPE, ORDER_FLOW, ORDER_STATUS, WAVE_STATUS } from "@/lib/labels";
import { fmtDateTime, fmtTime } from "@/lib/format";
import { startOfTodayChile } from "@/lib/format";
import { channelBreakdown, revenueSummary } from "@/features/sales/service";
import { ChannelLogo } from "@/features/sales/channel-logo";
import { CHANNELS, clp } from "@/lib/channels";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Inicio" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requirePageRole();
  const { denied } = await searchParams;
  const [byStatus, waves, repl, putbacks, movements, shippedToday, sales, stores] = await Promise.all([
    db.order.groupBy({ by: ["status"], _count: true }),
    db.wave.findMany({
      where: { status: { in: ["OPEN", "PICKING", "SORTING"] } },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true, code: true, status: true, assignedUser: { select: { name: true } }, _count: { select: { orders: true } } },
    }),
    replenishmentReport(),
    db.putbackTask.count({ where: { status: "PENDING" } }),
    db.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, type: true, qty: true, createdAt: true, reference: true, product: { select: { sku: true } }, fromLocation: { select: { code: true } }, toLocation: { select: { code: true } } },
    }),
    db.order.count({ where: { shippedAt: { gte: startOfTodayChile() } } }),
    revenueSummary(),
    channelBreakdown(),
  ]);
  const count = new Map(byStatus.map((s) => [s.status, s._count]));
  const lowSlots = repl.suggestions.length + repl.uncovered.length;

  const flow = ORDER_FLOW.slice(0, 5).map((s) => ({ s, n: count.get(s) ?? 0 }));
  const flowMax = Math.max(1, shippedToday, ...flow.map((f) => f.n));
  const today = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago" });

  return (
    <div className="space-y-6">
      <PageHeader title="Inicio" description={<span className="first-letter:uppercase">{today} · estado de la bodega en este momento</span>} />
      {denied && <p className="rounded-xl border border-danger/40 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger">No tienes permiso para esa sección.</p>}

      <section aria-label="Pedidos por etapa">
        <Rack className="lg:grid-cols-6">
          {flow.map(({ s, n }) => (
            <Stat key={s} label={ORDER_STATUS[s].label} value={n} share={n / flowMax} tone={s === "PENDING" && n > 0 ? "danger" : undefined} href={`/pedidos?estado=${s}`} />
          ))}
          <Stat label="Despachados hoy" value={shippedToday} share={shippedToday / flowMax} href="/despacho" />
        </Rack>
      </section>

      <Link href="/ventas" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-accent px-5 py-4 text-accent-ink shadow-card transition-opacity hover:opacity-95">
        <div>
          <div className="text-xs font-medium opacity-70">Ventas de hoy · todas las tiendas</div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums">{clp(sales.today)}</div>
        </div>
        <ul className="flex flex-1 flex-wrap gap-x-5 gap-y-2">
          {stores.map((c) => (
            <li key={c.channel} className="flex items-center gap-2 text-sm">
              <ChannelLogo channel={c.channel} size="sm" />
              <span>
                <span className="block font-semibold leading-tight">{CHANNELS[c.channel].label}</span>
                <span className="text-xs opacity-70">{c.today} hoy · {c.open} por preparar</span>
              </span>
            </li>
          ))}
        </ul>
        <span className="inline-flex items-center gap-1 text-sm font-semibold">Ver ventas <ArrowRight className="size-4" aria-hidden /></span>
      </Link>

      {(lowSlots > 0 || putbacks > 0) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn">
          <span className="flex size-8 items-center justify-center rounded-full bg-yellow/30">
            <AlertTriangle className="size-4" aria-hidden />
          </span>
          {lowSlots > 0 && (
            <Link href="/inventario/reposicion" className="font-semibold underline-offset-4 hover:underline">
              {lowSlots} casillas de picking bajo el mínimo
            </Link>
          )}
          {putbacks > 0 && (
            <Link href="/inventario/devoluciones" className="font-semibold underline-offset-4 hover:underline">
              {putbacks} unidades por reponer de pedidos cancelados
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card>
          <CardHeader title="Olas en curso" action={<Link className="text-sm font-medium text-success hover:underline" href="/olas">Ver todas</Link>} />
          {waves.length === 0 ? (
            <EmptyState title="No hay olas en curso">
              <Link href="/olas/nueva" className="font-medium text-success hover:underline">Crea una ola</Link> con los pedidos pendientes.
            </EmptyState>
          ) : (
            <ul>
              {waves.map((w) => (
                <li key={w.id} className="border-b border-border/70 last:border-0">
                  <Link href={`/olas/${w.code}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-panel-2">
                    <Mono className="text-base font-bold">{w.code}</Mono>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted">{w._count.orders} pedidos · {w.assignedUser?.name ?? "sin asignar"}</span>
                    <StatusBadge map={WAVE_STATUS} value={w.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Últimos movimientos" action={<Link className="text-sm font-medium text-success hover:underline" href="/inventario/movimientos">Ver todos</Link>} />
          {movements.length === 0 ? (
            <EmptyState title="Sin movimientos todavía" />
          ) : (
            <Table>
              <tbody>
                {movements.map((m) => (
                  <Tr key={m.id}>
                    <Td className="w-0">
                      <span className="text-xs tabular-nums text-muted" title={fmtDateTime(m.createdAt)}>{fmtTime(m.createdAt)}</span>
                    </Td>
                    <Td><Badge tone={MOVEMENT_TYPE[m.type].tone}>{MOVEMENT_TYPE[m.type].label}</Badge></Td>
                    <Td><Mono className="font-semibold">{m.product.sku}</Mono></Td>
                    <Td><Mono className="text-muted">{m.fromLocation?.code ?? "Ingreso"} → {m.toLocation?.code ?? "Salida"}</Mono></Td>
                    <Td className="text-right"><Mono className="text-base font-bold">{m.qty}</Mono></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
