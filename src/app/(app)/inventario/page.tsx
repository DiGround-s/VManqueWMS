import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { stockSummary } from "@/server/inventory/summary";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filter-form";
import { InventoryTabs } from "@/features/inventory/tabs";
import { cn } from "@/lib/cn";

export const metadata = { title: "Inventario" };
const PAGE_SIZE = 50;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requirePageRole();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = sp.q?.trim();
  const where: Prisma.ProductWhereInput = q
    ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { barcode: q }] }
    : {};
  const [products, total] = await Promise.all([
    db.product.findMany({ where, orderBy: { sku: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, sku: true, name: true, active: true, _count: { select: { stock: { where: { qty: { gt: 0 } } } } } } }),
    db.product.count({ where }),
  ]);
  const summary = await stockSummary(products.map((p) => p.id));

  return (
    <>
      <PageHeader eyebrow="Bodega" title="Inventario" description="Disponible = en estantería (picking + reserva) − comprometido por pedidos sin recoger." />
      <InventoryTabs active="/inventario" />
      <FilterForm>
        <Field label="Buscar" className="min-w-72 flex-1"><Input name="q" defaultValue={q} placeholder="SKU, nombre o código de barras" /></Field>
      </FilterForm>
      <Card>
        {products.length === 0 ? <EmptyState title="Sin productos" /> : (
          <Table>
            <thead>
              <tr><Th>SKU</Th><Th>Producto</Th><Th className="text-right">Estantería</Th><Th className="text-right">Andén</Th><Th className="text-right">Comprometido</Th><Th className="text-right">En proceso</Th><Th className="text-right">Disponible</Th><Th className="text-right">Ubic.</Th></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const s = summary.get(p.id)!;
                return (
                  <Tr key={p.id} className={cn(!p.active && "opacity-50")}>
                    <Td><Link href={`/productos/${p.id}`} className="font-mono font-semibold hover:underline">{p.sku}</Link></Td>
                    <Td>{p.name}</Td>
                    <Td className="text-right"><Mono>{s.shelf}</Mono></Td>
                    <Td className="text-right"><Mono className="text-muted">{s.dock}</Mono></Td>
                    <Td className="text-right"><Mono className="text-muted">{s.committed}</Mono></Td>
                    <Td className="text-right"><Mono className="text-muted">{s.inProcess}</Mono></Td>
                    <Td className="text-right"><Mono className={cn("font-semibold", s.available < 0 ? "text-danger" : s.available === 0 && "text-accent-strong")}>{s.available}</Mono></Td>
                    <Td className="text-right"><Mono className="text-muted">{p._count.stock}</Mono></Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ q }} basePath="/inventario" />
      </Card>
    </>
  );
}
