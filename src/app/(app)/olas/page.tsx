import Link from "next/link";
import { Plus } from "lucide-react";
import type { WaveStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { buttonClass } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filter-form";
import { WAVE_STATUS } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Olas" };
const PAGE_SIZE = 50;

export default async function WavesPage({ searchParams }: { searchParams: Promise<{ estado?: string; page?: string }> }) {
  const user = await requirePageRole();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const status = sp.estado && sp.estado in WAVE_STATUS ? (sp.estado as WaveStatus) : undefined;
  const where = status ? { status } : {};
  const [waves, total] = await Promise.all([
    db.wave.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, code: true, status: true, createdAt: true, assignedUser: { select: { name: true } }, _count: { select: { orders: true, tasks: true } } },
    }),
    db.wave.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Salidas"
        title="Olas de picking"
        description="Agrupa pedidos para recogerlos en un solo recorrido y separarlos en la mesa."
        actions={hasRole(user, "SUPERVISOR") && <Link href="/olas/nueva" className={buttonClass("primary")}><Plus className="size-4" /> Nueva ola</Link>}
      />
      <FilterForm>
        <Field label="Estado">
          <Select name="estado" defaultValue={status ?? ""}>
            <option value="">Todas</option>
            {Object.entries(WAVE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </FilterForm>
      <Card>
        {waves.length === 0 ? (
          <EmptyState title="No hay olas" />
        ) : (
          <Table>
            <thead><tr><Th>Ola</Th><Th>Estado</Th><Th className="text-right">Pedidos</Th><Th className="text-right">Tareas</Th><Th>Operador</Th><Th>Creada</Th></tr></thead>
            <tbody>
              {waves.map((w) => (
                <Tr key={w.id}>
                  <Td><Link href={`/olas/${w.code}`} className="font-mono font-semibold hover:underline">{w.code}</Link></Td>
                  <Td><StatusBadge map={WAVE_STATUS} value={w.status} /></Td>
                  <Td className="text-right font-mono">{w._count.orders}</Td>
                  <Td className="text-right font-mono">{w._count.tasks}</Td>
                  <Td className="text-muted">{w.assignedUser?.name ?? "Sin asignar"}</Td>
                  <Td className="text-muted">{fmtDateTime(w.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ estado: status }} basePath="/olas" />
      </Card>
    </>
  );
}
