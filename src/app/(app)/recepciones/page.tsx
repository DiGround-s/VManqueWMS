import Link from "next/link";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { NewReception } from "@/features/receptions/reception-forms";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Recepciones" };
const PAGE_SIZE = 50;

export default async function ReceptionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requirePageRole();
  const page = parsePage((await searchParams).page);
  const [rows, total] = await Promise.all([
    db.reception.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { createdBy: { select: { name: true } }, _count: { select: { lines: true } } } }),
    db.reception.count(),
  ]);
  return (
    <>
      <PageHeader title="Recepciones" description="Ingreso de mercadería de proveedores. Al confirmar, el stock entra a las ubicaciones indicadas." actions={hasRole(user, "SUPERVISOR") && <NewReception />} />
      <Card>
        {rows.length === 0 ? <EmptyState title="Sin recepciones" /> : (
          <Table>
            <thead><tr><Th>Código</Th><Th>Proveedor</Th><Th>Estado</Th><Th className="text-right">Líneas</Th><Th>Creada</Th><Th>Por</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td><Link href={`/recepciones/${r.code}`} className="font-mono font-semibold hover:underline">{r.code}</Link></Td>
                  <Td>{r.supplier ?? "—"}</Td>
                  <Td>{r.status === "DRAFT" ? <Badge tone="warn">Borrador</Badge> : <Badge tone="success">Confirmada</Badge>}</Td>
                  <Td className="text-right font-mono">{r._count.lines}</Td>
                  <Td className="text-muted">{fmtDateTime(r.createdAt)}</Td>
                  <Td className="text-muted">{r.createdBy.name}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{}} basePath="/recepciones" />
      </Card>
    </>
  );
}
