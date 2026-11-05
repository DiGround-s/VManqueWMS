import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { LOCATION_ROLE } from "@/lib/labels";
import { LocationEditor, SlotLimits, AssignSlot } from "@/features/locations/location-editor";

export const metadata = { title: "Ubicación" };

export default async function LocationDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole();
  const { id } = await params;
  const loc = await db.location.findUnique({
    where: { id },
    include: {
      warehouse: { select: { code: true, name: true } },
      stock: { orderBy: { product: { sku: "asc" } }, take: 500, include: { product: { select: { id: true, sku: true, name: true } } } },
    },
  });
  if (!loc) notFound();
  const canEdit = hasRole(user, "SUPERVISOR");

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{loc.code}</span>}
        description={`Ubicación en ${loc.warehouse.name}`}
        actions={
          <>
            <StatusBadge map={LOCATION_ROLE} value={loc.role} />
            <Link href={`/print/ubicaciones?ids=${loc.id}`} target="_blank" className={buttonClass("secondary")}><Printer className="size-4" /> Etiqueta</Link>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Contenido" />
          {loc.stock.length === 0 ? <EmptyState title="Vacía" /> : (
            <Table>
              <thead><tr><Th>SKU</Th><Th>Producto</Th><Th className="text-right">Cantidad</Th><Th>Mín / Máx</Th></tr></thead>
              <tbody>
                {loc.stock.map((s) => (
                  <Tr key={s.id}>
                    <Td><Link href={`/productos/${s.product.id}`} className="font-mono hover:underline">{s.product.sku}</Link></Td>
                    <Td>{s.product.name}</Td>
                    <Td className="text-right"><Mono className="text-lg font-semibold">{s.qty}</Mono></Td>
                    <Td>
                      {canEdit && loc.role === "PICK" ? (
                        <SlotLimits locationId={loc.id} productId={s.product.id} minQty={s.minQty} maxQty={s.maxQty} />
                      ) : (
                        <Mono className="text-muted">{s.minQty ?? "—"} / {s.maxQty ?? "—"}</Mono>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Datos" />
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 p-4 text-sm">
              <dt className="label">Zona</dt><dd className="font-mono">{loc.zone}</dd>
              <dt className="label">Pasillo</dt><dd className="font-mono">{loc.aisle ?? "—"}</dd>
              <dt className="label">Rack</dt><dd className="font-mono">{loc.rack ?? "—"}</dd>
              <dt className="label">Nivel</dt><dd className="font-mono">{loc.level ?? "—"}</dd>
            </dl>
            {canEdit && <div className="border-t border-border p-4"><LocationEditor id={loc.id} role={loc.role} active={loc.active} sortKey={loc.sortKey} /></div>}
          </Card>
          {canEdit && loc.role === "PICK" && (
            <Card>
              <CardHeader title="Asignar producto a esta casilla" />
              <div className="p-4"><AssignSlot locationId={loc.id} /></div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
