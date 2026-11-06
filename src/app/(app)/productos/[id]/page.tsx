import { ProductThumb } from "@/components/product-thumb";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Map as MapIcon, Printer } from "lucide-react";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { stockSummary } from "@/server/inventory/summary";
import { PageHeader } from "@/components/ui/page-header";
import { CapacityMeter, Card, CardHeader, Stat } from "@/components/ui/card";
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
        title={<span className="flex items-center gap-4"><ProductThumb src={product.imageUrl} size="md" /><span className="font-mono">{product.sku}</span></span>}
        description={
          <>
            <span className="block font-medium text-text">{product.name}</span>
            {product.description && <span className="mt-1 block">{product.description}</span>}
          </>
        }
        actions={
          <>
            <Link href={`/mapa?sku=${encodeURIComponent(product.sku)}`} className={buttonClass("primary")}><MapIcon className="size-4" /> Ver en el mapa</Link>
            <Link href={`/print/productos?ids=${product.id}`} target="_blank" className={buttonClass("secondary")}><Printer className="size-4" /> Etiqueta</Link>
          </>
        }
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
                    <Td className="text-right"><CapacityMeter qty={l.qty} min={l.minQty} max={l.maxQty} /></Td>
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
