import type { MovementType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filter-form";
import { InventoryTabs } from "@/features/inventory/tabs";
import { MOVEMENT_TYPE } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Movimientos" };
const PAGE_SIZE = 100;

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ tipo?: string; sku?: string; ubicacion?: string; ref?: string; desde?: string; page?: string }> }) {
  await requirePageRole();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const type = sp.tipo && sp.tipo in MOVEMENT_TYPE ? (sp.tipo as MovementType) : undefined;
  const loc = sp.ubicacion?.trim().toUpperCase();
  const from = sp.desde ? new Date(`${sp.desde}T00:00:00-03:00`) : undefined;
  const where: Prisma.StockMovementWhereInput = {
    ...(type ? { type } : {}),
    ...(sp.sku ? { product: { sku: sp.sku.trim().toUpperCase() } } : {}),
    ...(loc ? { OR: [{ fromLocation: { code: loc } }, { toLocation: { code: loc } }] } : {}),
    ...(sp.ref ? { reference: sp.ref.trim().toUpperCase() } : {}),
    ...(from && !isNaN(from.getTime()) ? { createdAt: { gte: from } } : {}),
  };
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, type: true, qty: true, reference: true, note: true, createdAt: true, product: { select: { sku: true, name: true } }, fromLocation: { select: { code: true } }, toLocation: { select: { code: true } }, user: { select: { name: true } } },
    }),
    db.stockMovement.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Inventario" description="Registro de todos los movimientos de stock. No se edita ni se borra." />
      <InventoryTabs active="/inventario/movimientos" />
      <FilterForm>
        <Field label="Tipo">
          <Select name="tipo" defaultValue={type ?? ""}>
            <option value="">Todos</option>
            {Object.entries(MOVEMENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="SKU"><Input name="sku" defaultValue={sp.sku} className="w-36 font-mono" /></Field>
        <Field label="Ubicación"><Input name="ubicacion" defaultValue={sp.ubicacion} className="w-36 font-mono" /></Field>
        <Field label="Referencia"><Input name="ref" defaultValue={sp.ref} className="w-36 font-mono" placeholder="PED-/OLA-/REC-" /></Field>
        <Field label="Desde"><Input name="desde" type="date" defaultValue={sp.desde} /></Field>
      </FilterForm>
      <Card>
        {rows.length === 0 ? <EmptyState title="Sin movimientos" /> : (
          <Table>
            <thead><tr><Th>Fecha</Th><Th>Tipo</Th><Th>SKU</Th><Th>Producto</Th><Th>Desde</Th><Th>Hacia</Th><Th className="text-right">Cant.</Th><Th>Ref.</Th><Th>Usuario</Th><Th>Nota</Th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <Tr key={m.id}>
                  <Td className="whitespace-nowrap text-muted">{fmtDateTime(m.createdAt)}</Td>
                  <Td><Badge tone={MOVEMENT_TYPE[m.type].tone}>{MOVEMENT_TYPE[m.type].label}</Badge></Td>
                  <Td><Mono>{m.product.sku}</Mono></Td>
                  <Td className="max-w-56 truncate">{m.product.name}</Td>
                  <Td><Mono className="text-muted">{m.fromLocation?.code ?? "—"}</Mono></Td>
                  <Td><Mono className="text-muted">{m.toLocation?.code ?? "—"}</Mono></Td>
                  <Td className="text-right"><Mono className="font-semibold">{m.qty}</Mono></Td>
                  <Td><Mono className="text-muted">{m.reference ?? "—"}</Mono></Td>
                  <Td className="text-muted">{m.user?.name ?? "—"}</Td>
                  <Td className="text-muted">{m.note ?? ""}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ tipo: type, sku: sp.sku, ubicacion: sp.ubicacion, ref: sp.ref, desde: sp.desde }} basePath="/inventario/movimientos" />
      </Card>
    </>
  );
}
