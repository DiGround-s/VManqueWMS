import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { buttonClass } from "@/components/ui/button";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filter-form";
import { ORDER_STATUS } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Pedidos" };
const PAGE_SIZE = 50;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string; page?: string }> }) {
  const user = await requirePageRole();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const status = sp.estado && sp.estado in ORDER_STATUS ? (sp.estado as OrderStatus) : undefined;
  const q = sp.q?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { externalRef: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, code: true, externalRef: true, customerName: true, commune: true, carrier: true, status: true, priority: true, createdAt: true, _count: { select: { lines: true } } },
    }),
    db.order.count({ where }),
  ]);
  const canEdit = hasRole(user, "SUPERVISOR");

  return (
    <>
      <PageHeader
       
        title="Pedidos"
        description="Pedidos de clientes, desde su ingreso hasta el despacho."
        actions={
          canEdit && (
            <>
              <Link href="/pedidos/importar" className={buttonClass("secondary")}><Upload className="size-4" /> Importar</Link>
              <Link href="/pedidos/nuevo" className={buttonClass("primary")}><Plus className="size-4" /> Nuevo pedido</Link>
            </>
          )
        }
      />
      <FilterForm>
        <Field label="Buscar" className="min-w-60 flex-1">
          <Input name="q" defaultValue={q} placeholder="Código, referencia o cliente" />
        </Field>
        <Field label="Estado">
          <Select name="estado" defaultValue={status ?? ""}>
            <option value="">Todos</option>
            {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </FilterForm>
      <Card>
        {orders.length === 0 ? (
          <EmptyState title="No hay pedidos con estos filtros" />
        ) : (
          <Table>
            <thead>
              <tr><Th>Pedido</Th><Th>Referencia</Th><Th>Cliente</Th><Th>Comuna</Th><Th>Transporte</Th><Th className="text-right">Líneas</Th><Th>Estado</Th><Th>Ingreso</Th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Tr key={o.id}>
                  <Td>
                    <Link href={`/pedidos/${o.code}`} className="font-mono font-semibold hover:underline">{o.code}</Link>
                    {o.priority > 0 && <span className="ml-1.5 font-mono text-xs text-accent-strong" title="Prioridad">P{o.priority}</span>}
                  </Td>
                  <Td><Mono className="text-muted">{o.externalRef ?? "—"}</Mono></Td>
                  <Td>{o.customerName}</Td>
                  <Td className="text-muted">{o.commune}</Td>
                  <Td className="text-muted">{o.carrier ?? "—"}</Td>
                  <Td className="text-right"><Mono>{o._count.lines}</Mono></Td>
                  <Td><StatusBadge map={ORDER_STATUS} value={o.status} /></Td>
                  <Td className="whitespace-nowrap text-muted">{fmtDateTime(o.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ estado: status, q }} basePath="/pedidos" />
      </Card>
    </>
  );
}
