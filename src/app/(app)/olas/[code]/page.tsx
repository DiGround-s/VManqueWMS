import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Grid3x3 } from "lucide-react";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { WaveActions } from "@/features/waves/wave-actions";
import { ORDER_STATUS, TASK_STATUS, WAVE_STATUS } from "@/lib/labels";
import { cn } from "@/lib/cn";

export const metadata = { title: "Ola" };

export default async function WaveDetail({ params }: { params: Promise<{ code: string }> }) {
  const user = await requirePageRole();
  const { code } = await params;
  const wave = await db.wave.findUnique({
    where: { code: decodeURIComponent(code).toUpperCase() },
    include: {
      assignedUser: { select: { name: true } },
      createdBy: { select: { name: true } },
      tasks: { orderBy: { sequence: "asc" }, include: { product: { select: { sku: true, name: true } }, location: { select: { code: true } } } },
      orders: { orderBy: { slot: "asc" }, include: { order: { select: { code: true, status: true, customerName: true, lines: { select: { qty: true, pickedQty: true, sortedQty: true } } } } } },
    },
  });
  if (!wave) notFound();
  const operators = hasRole(user, "SUPERVISOR") ? await db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];

  const units = wave.tasks.reduce((n, t) => n + t.qtyRequired, 0);
  const picked = wave.tasks.reduce((n, t) => n + t.qtyPicked, 0);
  const short = wave.tasks.filter((t) => t.status === "SHORT");
  const shortUnits = short.reduce((n, t) => n + t.qtyRequired - t.qtyPicked, 0);

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{wave.code}</span>}
        description={`Ola creada por ${wave.createdBy.name}`}
        actions={
          <>
            <StatusBadge map={WAVE_STATUS} value={wave.status} />
            <Link href={`/print/ola/${wave.code}`} target="_blank" className={buttonClass("secondary")}><Printer className="size-4" /> Lista de picking</Link>
            {wave.status === "SORTING" && <Link href={`/mesa?ola=${wave.code}`} className={buttonClass("primary")}><Grid3x3 className="size-4" /> Ir a la mesa</Link>}
            {hasRole(user, "SUPERVISOR") && (
              <WaveActions id={wave.id} status={wave.status} assignedUserId={wave.assignedUserId} operators={operators} canCancel={picked === 0} />
            )}
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pedidos" value={wave.orders.length} />
        <Stat label="Unidades recogidas" value={`${picked}/${units}`} />
        <Stat label="Faltantes" value={shortUnits} tone={shortUnits ? "danger" : undefined} />
        <Stat label="Operador" value={<span className="text-xl">{wave.assignedUser?.name ?? "Sin asignar"}</span>} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Recorrido de picking" />
          <Table>
            <thead><tr><Th>#</Th><Th>Ubicación</Th><Th>SKU</Th><Th>Producto</Th><Th className="text-right">Pedir</Th><Th className="text-right">Recogido</Th><Th>Estado</Th></tr></thead>
            <tbody>
              {wave.tasks.map((t) => (
                <Tr key={t.id} className={cn(t.status === "SHORT" && "bg-danger-bg/60", t.status === "DONE" && "text-muted [&_td:not(:last-child)]:line-through [&_td]:decoration-success/70 [&_td]:decoration-2")}>
                  <Td><Mono className="text-muted">{t.sequence}</Mono></Td>
                  <Td><Mono className="font-semibold">{t.location?.code ?? "SIN STOCK"}</Mono></Td>
                  <Td><Mono>{t.product.sku}</Mono></Td>
                  <Td>{t.product.name}</Td>
                  <Td className="text-right"><Mono>{t.qtyRequired}</Mono></Td>
                  <Td className="text-right"><Mono>{t.qtyPicked}</Mono></Td>
                  <Td><StatusBadge map={TASK_STATUS} value={t.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Casillas de la mesa" />
          <Table>
            <thead><tr><Th>Casilla</Th><Th>Pedido</Th><Th className="text-right">Rec./Sep.</Th><Th>Estado</Th></tr></thead>
            <tbody>
              {wave.orders.map((wo) => {
                const q = wo.order.lines.reduce((n, l) => n + l.qty, 0);
                const p = wo.order.lines.reduce((n, l) => n + l.pickedQty, 0);
                const s = wo.order.lines.reduce((n, l) => n + l.sortedQty, 0);
                return (
                  <Tr key={wo.id}>
                    <Td><Mono className="text-lg font-semibold">{wo.slot}</Mono></Td>
                    <Td><Link href={`/pedidos/${wo.order.code}`} className="font-mono hover:underline">{wo.order.code}</Link><div className="text-xs text-muted">{wo.order.customerName}</div></Td>
                    <Td className="text-right"><Mono>{p}/{s} de {q}</Mono></Td>
                    <Td><StatusBadge map={ORDER_STATUS} value={wo.order.status} /></Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
