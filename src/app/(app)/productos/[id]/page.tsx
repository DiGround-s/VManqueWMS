import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { stockSummary } from "@/server/inventory/summary";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductForm } from "@/features/products/product-form";
import { LOCATION_ROLE } from "@/lib/labels";

export const metadata = { title: "Producto" };

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole();
  const { id } = await params;
  const [product, levels, summary] = await Promise.all([
    db.product.findUnique({ where: { id } }),
    db.stockLevel.findMany({ where: { productId: id }, orderBy: { location: { sortKey: "asc" } }, take: 300, include: { location: { select: { id: true, code: true, role: true } } } }),
    stockSummary([id]),
  ]);
  if (!product) notFound();
  const s = summary.get(id)!;

  return (
    <>
      <PageHeader
        eyebrow="Producto"
        title={<span className="font-mono">{product.sku}</span>}
        description={product.name}
        actions={<Link href={`/print/productos?ids=${product.id}`} target="_blank" className={buttonClass("secondary")}><Printer className="size-4" /> Etiqueta</Link>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Disponible" value={s.available} tone={s.available < 0 ? "danger" : "accent"} />
        <Stat label="En estantería" value={s.shelf} />
        <Stat label="Comprometido" value={s.committed} />
        <Stat label="En proceso" value={s.inProcess} />
        <Stat label="En andén" value={s.dock} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Dónde está" action={<Link href={`/inventario/movimientos?sku=${encodeURIComponent(product.sku)}`} className="text-sm text-muted hover:underline">Movimientos</Link>} />
          {levels.length === 0 ? <EmptyState title="Sin ubicaciones" /> : (
            <Table>
              <thead><tr><Th>Ubicación</Th><Th>Uso</Th><Th className="text-right">Cantidad</Th><Th className="text-right">Mín / Máx</Th></tr></thead>
              <tbody>
                {levels.map((l) => (
                  <Tr key={l.id}>
                    <Td><Link href={`/ubicaciones/${l.location.id}`} className="font-mono font-semibold hover:underline">{l.location.code}</Link></Td>
                    <Td><StatusBadge map={LOCATION_ROLE} value={l.location.role} /></Td>
                    <Td className="text-right"><Mono className="text-lg">{l.qty}</Mono></Td>
                    <Td className="text-right"><Mono className="text-muted">{l.minQty ?? "—"} / {l.maxQty ?? "—"}</Mono></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <ProductForm product={product} readOnly={!hasRole(user, "SUPERVISOR")} />
      </div>
    </>
  );
}
