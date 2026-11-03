import Link from "next/link";
import { Plus, Printer } from "lucide-react";
import type { LocationRole, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { buttonClass } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { FilterForm } from "@/components/filter-form";
import { LOCATION_ROLE } from "@/lib/labels";

export const metadata = { title: "Ubicaciones" };
const PAGE_SIZE = 100;

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ zona?: string; rol?: string; q?: string; page?: string }> }) {
  const user = await requirePageRole();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const role = sp.rol && sp.rol in LOCATION_ROLE ? (sp.rol as LocationRole) : undefined;
  const zone = sp.zona?.trim().toUpperCase() || undefined;
  const where: Prisma.LocationWhereInput = {
    ...(role ? { role } : {}),
    ...(zone ? { zone } : {}),
    ...(sp.q ? { code: { contains: sp.q.trim().toUpperCase() } } : {}),
  };
  const [locations, total, zones] = await Promise.all([
    db.location.findMany({ where, orderBy: [{ zone: "asc" }, { sortKey: "asc" }, { code: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, code: true, zone: true, role: true, active: true, sortKey: true } }),
    db.location.count({ where }),
    db.location.groupBy({ by: ["zone"], _count: true, orderBy: { zone: "asc" } }),
  ]);
  const totals = await db.stockLevel.groupBy({ by: ["locationId"], where: { locationId: { in: locations.map((l) => l.id) }, qty: { gt: 0 } }, _sum: { qty: true }, _count: true });
  const byLoc = new Map(totals.map((t) => [t.locationId, t]));
  const printQs = new URLSearchParams({ ...(zone ? { zona: zone } : {}), ...(role ? { rol: role } : {}), ...(sp.q ? { q: sp.q } : {}) });

  let lastZone = "";
  return (
    <>
      <PageHeader
        eyebrow="Bodega"
        title="Ubicaciones"
        description={`Zonas: ${zones.map((z) => `${z.zone} (${z._count})`).join(" · ") || "ninguna"}`}
        actions={
          <>
            <Link href={`/print/ubicaciones?${printQs}`} target="_blank" className={buttonClass("secondary")}><Printer className="size-4" /> Etiquetas del filtro</Link>
            {hasRole(user, "SUPERVISOR") && <Link href="/ubicaciones/generar" className={buttonClass("primary")}><Plus className="size-4" /> Generar</Link>}
          </>
        }
      />
      <FilterForm>
        <Field label="Código"><Input name="q" defaultValue={sp.q} className="w-40 font-mono" /></Field>
        <Field label="Zona">
          <Select name="zona" defaultValue={zone ?? ""}>
            <option value="">Todas</option>
            {zones.map((z) => <option key={z.zone} value={z.zone}>{z.zone}</option>)}
          </Select>
        </Field>
        <Field label="Uso">
          <Select name="rol" defaultValue={role ?? ""}>
            <option value="">Todos</option>
            {Object.entries(LOCATION_ROLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
      </FilterForm>
      <Card>
        {locations.length === 0 ? <EmptyState title="No hay ubicaciones">Genera las ubicaciones de tu bodega por zona, pasillo, rack y nivel.</EmptyState> : (
          <Table>
            <thead><tr><Th>Código</Th><Th>Uso</Th><Th className="text-right">Orden de ruta</Th><Th className="text-right">SKUs</Th><Th className="text-right">Unidades</Th><Th /></tr></thead>
            <tbody>
              {locations.flatMap((l) => {
                const t = byLoc.get(l.id);
                const rows = [];
                if (l.zone !== lastZone) {
                  lastZone = l.zone;
                  rows.push(<tr key={`z-${l.zone}`}><Th colSpan={6}>Zona {l.zone}</Th></tr>);
                }
                rows.push(
                  <Tr key={l.id} className={l.active ? undefined : "opacity-50"}>
                    <Td><Link href={`/ubicaciones/${l.id}`} className="font-mono font-semibold hover:underline">{l.code}</Link></Td>
                    <Td><StatusBadge map={LOCATION_ROLE} value={l.role} /></Td>
                    <Td className="text-right"><Mono className="text-muted">{l.sortKey}</Mono></Td>
                    <Td className="text-right"><Mono>{t?._count ?? 0}</Mono></Td>
                    <Td className="text-right"><Mono>{t?._sum.qty ?? 0}</Mono></Td>
                    <Td>{!l.active && <Badge>Inactiva</Badge>}</Td>
                  </Tr>,
                );
                return rows;
              })}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} params={{ zona: zone, rol: role, q: sp.q }} basePath="/ubicaciones" />
      </Card>
    </>
  );
}
