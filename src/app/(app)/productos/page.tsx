import { ProductThumb } from "@/components/product-thumb";
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
import { Mono } from "@/components/ui/table";
import { StockPill } from "@/components/stock-pill";
import { stockSummary } from "@/server/inventory/summary";
import { cn } from "@/lib/cn";
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
  const summary = await stockSummary(products.map((p) => p.id));
  return (
    <>
      <PageHeader
       
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
      {products.length === 0 ? (
        <Card><EmptyState title="Sin productos" /></Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {products.map((p) => {
            const s = summary.get(p.id)!;
            return (
              <li key={p.id}>
                <Link href={`/productos/${p.id}`} className={cn("group flex h-full flex-col overflow-hidden rounded-3xl bg-panel shadow-card ring-1 ring-border/60 transition-shadow hover:shadow-lift", !p.active && "opacity-50")}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-panel-2">
                    <ProductThumb src={p.imageUrl} size="lg" className="size-full rounded-none transition-transform duration-300 group-hover:scale-105" />
                    <span className="absolute left-3 top-3"><StockPill available={s.available} /></span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <span className="line-clamp-2 font-semibold leading-snug">{p.name}</span>
                    <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted">
                      <Mono>{p.sku}</Mono>
                      {!p.active && <Badge>Inactivo</Badge>}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4"><Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ q }} basePath="/productos" /></div>
    </>
  );
}
