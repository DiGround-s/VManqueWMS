import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { InventoryTabs } from "@/features/inventory/tabs";
import { replenishmentReport } from "@/features/inventory/queries";
import { ReplenishButton } from "@/features/inventory/replenish-button";

export const metadata = { title: "Reposición" };

export default async function ReplenishmentPage() {
  await requirePageRole();
  const { suggestions, uncovered } = await replenishmentReport();
  return (
    <>
      <PageHeader title="Inventario" description="Ubicaciones de picking bajo su mínimo y desde qué reserva rellenarlas (hasta el máximo)." />
      <InventoryTabs active="/inventario/reposicion" />
      <div className="space-y-5">
        <Card>
          <CardHeader title={`Movimientos sugeridos · ${suggestions.length}`} />
          {suggestions.length === 0 ? <EmptyState title="Todo el picking está sobre su mínimo" /> : (
            <Table>
              <thead><tr><Th>SKU</Th><Th>Producto</Th><Th>Desde (reserva)</Th><Th>Hacia (picking)</Th><Th className="text-right">Cantidad</Th><Th /></tr></thead>
              <tbody>
                {suggestions.map((s) => (
                  <Tr key={s.fromLocationId + s.toLocationId + s.productId}>
                    <Td><Mono>{s.product.sku}</Mono></Td>
                    <Td>{s.product.name}</Td>
                    <Td><Mono>{s.fromCode}</Mono></Td>
                    <Td><Mono className="font-semibold">{s.toCode}</Mono></Td>
                    <Td className="text-right"><Mono className="font-semibold">{s.qty}</Mono></Td>
                    <Td className="text-right"><ReplenishButton productId={s.productId} fromLocationId={s.fromLocationId} toLocationId={s.toLocationId} qty={s.qty} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        {uncovered.length > 0 && (
          <Card>
            <CardHeader title="Bajo el mínimo sin reserva disponible" />
            <Table>
              <thead><tr><Th>Ubicación</Th><Th>SKU</Th><Th>Producto</Th><Th className="text-right">Hay</Th><Th className="text-right">Mínimo</Th></tr></thead>
              <tbody>
                {uncovered.map((u) => (
                  <Tr key={u.code + u.product.sku}>
                    <Td><Mono>{u.code}</Mono></Td><Td><Mono>{u.product.sku}</Mono></Td><Td>{u.product.name}</Td>
                    <Td className="text-right"><Mono className="text-danger">{u.qty}</Mono></Td><Td className="text-right"><Mono>{u.minQty}</Mono></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
