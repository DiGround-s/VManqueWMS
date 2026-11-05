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

export const metadata = { title: "Inicio" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requirePageRole();
  const { denied } = await searchParams;
  const [byStatus, waves, repl, putbacks, movements, shippedToday] = await Promise.all([
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
  ]);
  const count = new Map(byStatus.map((s) => [s.status, s._count]));
  const lowSlots = repl.suggestions.length + repl.uncovered.length;

  const flow = ORDER_FLOW.slice(0, 5).map((s) => ({ s, n: count.get(s) ?? 0 }));
  const flowMax = Math.max(1, shippedToday, ...flow.map((f) => f.n));
  const today = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago" });

  return (
    <div className="space-y-6">
      <PageHeader title="Inicio" description={<span className="first-letter:uppercase">{today} · estado de la bodega en este momento</span>} />
      {denied && <p className="rounded-md border-2 border-danger/40 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger">No tienes permiso para esa sección.</p>}

      <section aria-label="Pedidos por etapa">
        <Rack className="md:grid-cols-6">
          {flow.map(({ s, n }) => (
            <Stat key={s} label={ORDER_STATUS[s].label} value={n} share={n / flowMax} tone={s === "PENDING" && n > 0 ? "danger" : undefined} stamp={s === "PENDING" && n > 0 ? `${n} sin ola` : undefined} href={`/pedidos?estado=${s}`} />
          ))}
          <Stat label="Despachados hoy" value={shippedToday} share={shippedToday / flowMax} href="/despacho" />
        </Rack>
      </section>

      {(lowSlots > 0 || putbacks > 0) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border-2 border-dashed border-danger/60 bg-warn-bg px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-danger px-2 py-1 text-xs font-black uppercase tracking-wide text-white">
            <AlertTriangle className="size-3.5" aria-hidden /> Atención
          </span>
          {lowSlots > 0 && (
            <Link href="/inventario/reposicion" className="font-bold underline-offset-4 hover:underline">
              {lowSlots} casillas de picking bajo el mínimo
            </Link>
          )}
          {putbacks > 0 && (
            <Link href="/inventario/devoluciones" className="font-bold underline-offset-4 hover:underline">
              {putbacks} unidades por reponer de pedidos cancelados
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card>
          <CardHeader title="Olas en curso" action={<Link className="text-sm font-semibold text-accent hover:underline" href="/olas">Ver todas</Link>} />
          {waves.length === 0 ? (
            <EmptyState title="No hay olas en curso">
              <Link href="/olas/nueva" className="font-semibold text-accent hover:underline">Crea una ola</Link> con los pedidos pendientes.
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
          <CardHeader title="Últimos movimientos" action={<Link className="text-sm font-semibold text-accent hover:underline" href="/inventario/movimientos">Ver todos</Link>} />
          {movements.length === 0 ? (
            <EmptyState title="Sin movimientos todavía" />
          ) : (
            <Table>
              <tbody>
                {movements.map((m) => (
                  <Tr key={m.id}>
                    <Td className="w-0">
                      <span className="postmark h-7 w-14 text-[11px] text-success" title={fmtDateTime(m.createdAt)}>{fmtTime(m.createdAt)}</span>
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
