import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input } from "@/components/ui/input";
import { FilterForm } from "@/components/filter-form";
import { WaveCreator } from "@/features/waves/wave-creator";

export const metadata = { title: "Nueva ola" };
const LIMIT = 300;

export default async function NewWavePage({ searchParams }: { searchParams: Promise<{ transporte?: string; comuna?: string; q?: string }> }) {
  await requirePageRole("SUPERVISOR");
  const sp = await searchParams;
  const [orders, operators] = await Promise.all([
    db.order.findMany({
      where: {
        status: "PENDING",
        ...(sp.transporte ? { carrier: { contains: sp.transporte, mode: "insensitive" as const } } : {}),
        ...(sp.comuna ? { commune: { contains: sp.comuna, mode: "insensitive" as const } } : {}),
        ...(sp.q ? { OR: [{ code: { contains: sp.q, mode: "insensitive" as const } }, { customerName: { contains: sp.q, mode: "insensitive" as const } }] } : {}),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: LIMIT,
      select: { id: true, code: true, customerName: true, commune: true, carrier: true, priority: true, createdAt: true, lines: { select: { qty: true, pickedQty: true } } },
    }),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Olas" title="Nueva ola" description="Elige pedidos pendientes. Las casillas de la mesa se asignan en el orden de la lista." />
      <FilterForm>
        <Field label="Buscar"><Input name="q" defaultValue={sp.q} placeholder="Código o cliente" /></Field>
        <Field label="Transporte"><Input name="transporte" defaultValue={sp.transporte} /></Field>
        <Field label="Comuna"><Input name="comuna" defaultValue={sp.comuna} /></Field>
      </FilterForm>
      <WaveCreator
        limit={LIMIT}
        operators={operators}
        orders={orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), lines: o.lines.length, units: o.lines.reduce((n, l) => n + l.qty - l.pickedQty, 0) }))}
      />
    </>
  );
}
