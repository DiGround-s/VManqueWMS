import Link from "next/link";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { DispatchStation } from "@/features/dispatch/dispatch-station";
import { fmtDateTime, startOfTodayChile } from "@/lib/format";

export const metadata = { title: "Despacho" };

export default async function DispatchPage() {
  await requirePageRole();
  const [packed, shipped] = await Promise.all([
    db.order.findMany({ where: { status: "PACKED" }, orderBy: [{ carrier: "asc" }, { packedAt: "asc" }], take: 500, select: { id: true, code: true, customerName: true, commune: true, carrier: true, packedAt: true } }),
    db.order.findMany({ where: { shippedAt: { gte: startOfTodayChile() } }, orderBy: { shippedAt: "desc" }, take: 500, select: { id: true, code: true, customerName: true, carrier: true, shippedAt: true } }),
  ]);
  const byCarrier = new Map<string, typeof packed>();
  for (const o of packed) {
    const k = o.carrier ?? "Sin transporte";
    byCarrier.set(k, [...(byCarrier.get(k) ?? []), o]);
  }

  return (
    <>
      <PageHeader eyebrow="Salidas" title="Despacho" description="Escanea cada bulto al entregarlo al transporte." />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Card className="p-4"><DispatchStation /></Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title={`Empacados por despachar · ${packed.length}`} />
            {packed.length === 0 ? <EmptyState title="Nada pendiente" /> : (
              <Table>
                <tbody>
                  {[...byCarrier].map(([carrier, orders]) => [
                    <tr key={carrier}><Th colSpan={4}>{carrier} · {orders.length}</Th></tr>,
                    ...orders.map((o) => (
                      <Tr key={o.id}>
                        <Td><Link href={`/pedidos/${o.code}`} className="font-mono hover:underline">{o.code}</Link></Td>
                        <Td>{o.customerName}</Td>
                        <Td className="text-muted">{o.commune}</Td>
                        <Td className="text-muted">{fmtDateTime(o.packedAt)}</Td>
                      </Tr>
                    )),
                  ])}
                </tbody>
              </Table>
            )}
          </Card>
          <Card>
            <CardHeader title={`Despachados hoy · ${shipped.length}`} />
            {shipped.length === 0 ? <EmptyState title="Aún no se despacha nada hoy" /> : (
              <Table>
                <tbody>
                  {shipped.map((o) => (
                    <Tr key={o.id}>
                      <Td><Mono>{o.code}</Mono></Td>
                      <Td>{o.customerName}</Td>
                      <Td className="text-muted">{o.carrier ?? "—"}</Td>
                      <Td className="text-muted">{fmtDateTime(o.shippedAt)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
