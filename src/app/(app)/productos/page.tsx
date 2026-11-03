import Link from "next/link";
import { Plus, Printer, Upload } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filter-form";

export const metadata = { title: "Productos" };
const PAGE_SIZE = 50;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requirePageRole();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = sp.q?.trim();
  const where: Prisma.ProductWhereInput = q ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { barcode: q }] } : {};
  const [products, total] = await Promise.all([
    db.product.findMany({ where, orderBy: { sku: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, sku: true, name: true, barcode: true, imageUrl: true, active: true } }),
    db.product.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Bodega"
        title="Productos"
        description="Catálogo. El SKU va en la etiqueta QR de cada producto."
        actions={
          <>
            <Link href={`/print/productos${q ? `?q=${encodeURIComponent(q)}` : ""}`} target="_blank" className={buttonClass("secondary")}><Printer className="size-4" /> Etiquetas</Link>
            {hasRole(user, "SUPERVISOR") && (
              <>
                <Link href="/productos/importar" className={buttonClass("secondary")}><Upload className="size-4" /> Importar</Link>
                <Link href="/productos/nuevo" className={buttonClass("primary")}><Plus className="size-4" /> Nuevo</Link>
              </>
            )}
          </>
        }
      />
      <FilterForm>
        <Field label="Buscar" className="min-w-72 flex-1"><Input name="q" defaultValue={q} placeholder="SKU, nombre o código de barras" /></Field>
      </FilterForm>
      <Card>
        {products.length === 0 ? <EmptyState title="Sin productos" /> : (
          <Table>
            <thead><tr><Th className="w-14" /><Th>SKU</Th><Th>Nombre</Th><Th>Código de barras</Th><Th /></tr></thead>
            <tbody>
              {products.map((p) => (
                <Tr key={p.id} className={p.active ? undefined : "opacity-50"}>
                  <Td>
                    {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external product URLs */}
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="size-9 rounded-sm border border-border bg-white object-contain" /> : <div className="size-9 rounded-sm border border-dashed border-border" />}
                  </Td>
                  <Td><Link href={`/productos/${p.id}`} className="font-mono font-semibold hover:underline">{p.sku}</Link></Td>
                  <Td>{p.name}</Td>
                  <Td><Mono className="text-muted">{p.barcode ?? "—"}</Mono></Td>
                  <Td>{!p.active && <Badge>Inactivo</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ q }} basePath="/productos" />
      </Card>
    </>
  );
}
