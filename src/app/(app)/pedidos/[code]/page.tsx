import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { OrderActions } from "@/features/orders/order-actions";
import { ORDER_FLOW, ORDER_STATUS } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "Pedido" };

export default async function OrderDetail({ params }: { params: Promise<{ code: string }> }) {
  const user = await requirePageRole();
  const { code } = await params;
  const order = await db.order.findUnique({
    where: { code: decodeURIComponent(code).toUpperCase() },
    include: {
      lines: { orderBy: { id: "asc" }, include: { product: { select: { sku: true, name: true } } } },
      events: { orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true } } } },
      waveOrders: { orderBy: { id: "desc" }, take: 5, include: { wave: { select: { code: true, status: true } } } },
      putbacks: { select: { qty: true, status: true, product: { select: { sku: true } } } },
    },
  });
  if (!order) notFound();

  const wave = order.waveOrders[0];
  const stageIdx = ORDER_FLOW.indexOf(order.status);
  const stamps: Record<string, Date | null> = { PENDING: order.createdAt, PICKED: order.pickedAt, SORTED: order.sortedAt, PACKED: order.packedAt, SHIPPED: order.shippedAt };

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{order.code}</span>}
        description={[`Pedido ${order.source === "MANUAL" ? "manual" : order.source === "IMPORT" ? "importado" : "por API"}`, order.externalRef && `referencia ${order.externalRef}`].filter(Boolean).join(" · ")}
        actions={
          <>
            <StatusBadge map={ORDER_STATUS} value={order.status} />
            {(order.status === "PACKED" || order.status === "SHIPPED") && (
              <Link href={`/print/etiqueta/${order.code}`} target="_blank" className={buttonClass("secondary")}><Printer className="size-4" /> Etiqueta</Link>
            )}
            {hasRole(user, "SUPERVISOR") && (
              <OrderActions id={order.id} canCancel={!["SHIPPED", "CANCELLED"].includes(order.status)} canRelease={order.status === "IN_WAVE" && !!wave && ["SORTING", "DONE"].includes(wave.wave.status)} />
            )}
          </>
        }
      />

      {order.status !== "CANCELLED" && (
        <ol className="mb-5 grid grid-cols-3 gap-1 sm:grid-cols-6">
          {ORDER_FLOW.map((s, i) => (
            <li key={s} className={cn("rounded-sm border px-2 py-1.5", i <= stageIdx ? "border-accent bg-warn-bg" : "border-border bg-panel")}>
              <div className="label">{ORDER_STATUS[s].label}</div>
              <div className="font-mono text-xs">{stamps[s] ? fmtDateTime(stamps[s]) : i <= stageIdx ? "✓" : "—"}</div>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Líneas" />
            <Table>
              <thead><tr><Th>SKU</Th><Th>Producto</Th><Th className="text-right">Pedido</Th><Th className="text-right">Recogido</Th><Th className="text-right">Separado</Th><Th className="text-right">Empacado</Th></tr></thead>
              <tbody>
                {order.lines.map((l) => (
                  <Tr key={l.id}>
                    <Td><Mono>{l.product.sku}</Mono></Td>
                    <Td>{l.product.name}</Td>
                    <Td className="text-right"><Mono className="font-semibold">{l.qty}</Mono></Td>
                    {[l.pickedQty, l.sortedQty, l.packedQty].map((v, i) => (
                      <Td key={i} className={cn("text-right", v >= l.qty ? "text-success" : v > 0 ? "text-accent-strong" : "text-muted")}><Mono>{v}</Mono></Td>
                    ))}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
          {order.putbacks.length > 0 && (
            <Card>
              <CardHeader title="Por reponer (pedido cancelado)" action={<Link href="/inventario/devoluciones" className="text-sm hover:underline">Ir a reponer</Link>} />
              <ul className="divide-y divide-border">
                {order.putbacks.map((p, i) => (
                  <li key={i} className="flex justify-between px-4 py-2 text-sm"><Mono>{p.product.sku} × {p.qty}</Mono><span className="text-muted">{p.status === "DONE" ? "Repuesto" : "Pendiente"}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Despacho" />
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 p-4 text-sm">
              <dt className="label">Cliente</dt><dd>{order.customerName}</dd>
              <dt className="label">Dirección</dt><dd>{order.address}</dd>
              <dt className="label">Comuna</dt><dd>{order.commune}</dd>
              <dt className="label">Teléfono</dt><dd>{order.phone ?? "—"}</dd>
              <dt className="label">Transporte</dt><dd>{order.carrier ?? "—"}</dd>
              <dt className="label">Prioridad</dt><dd><Mono>{order.priority}</Mono></dd>
              <dt className="label">Ola</dt>
              <dd>{wave ? <Link className="font-mono hover:underline" href={`/olas/${wave.wave.code}`}>{wave.wave.code} · casilla {wave.slot}</Link> : "—"}</dd>
              {order.notes && (<><dt className="label">Notas</dt><dd className="whitespace-pre-wrap">{order.notes}</dd></>)}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Historial" />
            <ol className="divide-y divide-border">
              {order.events.map((e) => (
                <li key={e.id} className="px-4 py-2 text-sm">
                  <div className="flex justify-between gap-2"><span>{e.message}</span>{e.toStatus && <StatusBadge map={ORDER_STATUS} value={e.toStatus} />}</div>
                  <div className="text-xs text-muted">{fmtDateTime(e.createdAt)} · {e.user?.name ?? "Sistema"}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
