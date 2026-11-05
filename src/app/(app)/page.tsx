import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { replenishmentReport } from "@/features/inventory/queries";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Table, Td, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { MOVEMENT_TYPE, ORDER_FLOW, ORDER_STATUS, WAVE_STATUS } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
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

  return (
    <div className="space-y-5">
      <PageHeader title="Inicio" description="Estado de la bodega en este momento." />
      {denied && <p className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-danger">No tienes permiso para esa sección.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {ORDER_FLOW.slice(0, 5).map((s) => (
          <Stat key={s} label={ORDER_STATUS[s].label} value={count.get(s) ?? 0} href={`/pedidos?estado=${s}`} />
        ))}
        <Stat label="Despachados hoy" value={shippedToday} href="/despacho" />
      </div>

      {(lowSlots > 0 || putbacks > 0) && (
        <Card className="overflow-hidden border-accent">
          
          <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3 text-sm">
            <AlertTriangle className="size-5 text-accent-strong" aria-hidden />
            {lowSlots > 0 && (
              <Link href="/inventario/reposicion" className="font-semibold hover:underline">
                {lowSlots} ubicaciones de picking bajo el mínimo
              </Link>
            )}
            {putbacks > 0 && (
              <Link href="/inventario/devoluciones" className="font-semibold hover:underline">
                {putbacks} productos por reponer de pedidos cancelados
              </Link>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Olas en curso" action={<Link className="text-sm text-muted hover:underline" href="/olas">Ver todas</Link>} />
          {waves.length === 0 ? (
            <EmptyState title="No hay olas en curso" />
          ) : (
            <Table>
              <tbody>
                {waves.map((w) => (
                  <Tr key={w.id}>
                    <Td><Link href={`/olas/${w.code}`} className="font-mono font-semibold hover:underline">{w.code}</Link></Td>
                    <Td><StatusBadge map={WAVE_STATUS} value={w.status} /></Td>
                    <Td className="text-muted">{w._count.orders} pedidos</Td>
                    <Td className="text-muted">{w.assignedUser?.name ?? "Sin asignar"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Últimos movimientos" action={<Link className="text-sm text-muted hover:underline" href="/inventario/movimientos">Ver todos</Link>} />
          {movements.length === 0 ? (
            <EmptyState title="Sin movimientos" />
          ) : (
            <Table>
              <tbody>
                {movements.map((m) => (
                  <Tr key={m.id}>
                    <Td className="whitespace-nowrap text-muted">{fmtDateTime(m.createdAt)}</Td>
                    <Td><Badge tone={MOVEMENT_TYPE[m.type].tone}>{MOVEMENT_TYPE[m.type].label}</Badge></Td>
                    <Td><Mono>{m.product.sku}</Mono></Td>
                    <Td><Mono className="text-muted">{m.fromLocation?.code ?? "·"} → {m.toLocation?.code ?? "·"}</Mono></Td>
                    <Td className="text-right"><Mono className="font-semibold">{m.qty}</Mono></Td>
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
