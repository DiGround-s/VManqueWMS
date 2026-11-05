import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { AddReceptionLine, ConfirmReception, RemoveLine } from "@/features/receptions/reception-forms";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Recepción" };

export default async function ReceptionDetail({ params }: { params: Promise<{ code: string }> }) {
  const user = await requirePageRole();
  const { code } = await params;
  const r = await db.reception.findUnique({
    where: { code: decodeURIComponent(code).toUpperCase() },
    include: { createdBy: { select: { name: true } }, lines: { orderBy: { id: "asc" }, include: { product: { select: { sku: true, name: true } }, location: { select: { code: true } } } } },
  });
  if (!r) notFound();
  const draft = r.status === "DRAFT";
  const editable = draft && hasRole(user, "SUPERVISOR");
  const dock = editable ? await db.location.findFirst({ where: { role: "DOCK", active: true }, orderBy: { sortKey: "asc" }, select: { code: true } }) : null;
  const units = r.lines.reduce((n, l) => n + l.qty, 0);

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{r.code}</span>}
        description={[`Creada por ${r.createdBy.name} el ${fmtDateTime(r.createdAt)}`, r.supplier, r.note].filter(Boolean).join(" · ")}
        actions={
          <>
            {draft ? <Badge tone="warn">Borrador</Badge> : <Badge tone="success">Confirmada {fmtDateTime(r.confirmedAt)}</Badge>}
            {editable && <ConfirmReception id={r.id} disabled={r.lines.length === 0} />}
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title={`Líneas · ${units} unidades`} />
          {r.lines.length === 0 ? <EmptyState title="Sin líneas" /> : (
            <Table>
              <thead><tr><Th>SKU</Th><Th>Producto</Th><Th>Ubicación</Th><Th className="text-right">Cantidad</Th>{editable && <Th />}</tr></thead>
              <tbody>
                {r.lines.map((l) => (
                  <Tr key={l.id}>
                    <Td><Mono>{l.product.sku}</Mono></Td>
                    <Td>{l.product.name}</Td>
                    <Td><Mono>{l.location.code}</Mono></Td>
                    <Td className="text-right"><Mono className="font-semibold">{l.qty}</Mono></Td>
                    {editable && <Td className="text-right"><RemoveLine receptionId={r.id} lineId={l.id} /></Td>}
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        {editable && (
          <Card>
            <CardHeader title="Agregar línea" />
            <div className="p-4"><AddReceptionLine receptionId={r.id} defaultLocation={dock?.code ?? ""} /></div>
          </Card>
        )}
      </div>
    </>
  );
}
