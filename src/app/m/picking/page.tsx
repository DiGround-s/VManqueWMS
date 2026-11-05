import Link from "next/link";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { PhoneTitle } from "@/components/phone-title";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WAVE_STATUS } from "@/lib/labels";
import { cn } from "@/lib/cn";

export default async function PhonePickingList() {
  const user = await requirePageRole();
  const waves = await db.wave.findMany({
    where: { status: { in: ["OPEN", "PICKING"] }, OR: [{ assignedUserId: null }, { assignedUserId: user.id }] },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, code: true, status: true, assignedUserId: true, _count: { select: { orders: true } }, tasks: { where: { status: "PENDING" }, select: { qtyRequired: true, qtyPicked: true } } },
  });
  waves.sort((a, b) => Number(b.assignedUserId === user.id) - Number(a.assignedUserId === user.id));
  return (
    <>
      <PhoneTitle sub="Tus olas y las que no tienen operador.">Picking</PhoneTitle>
      {waves.length === 0 ? <EmptyState title="No hay olas para recoger" /> : (
        <ul className="space-y-3">
          {waves.map((w) => {
            const left = w.tasks.reduce((n, t) => n + t.qtyRequired - t.qtyPicked, 0);
            return (
              <li key={w.id}>
                <Link href={`/m/picking/${w.code}`} className={cn("flex min-h-20 items-center justify-between rounded-xl border bg-panel px-4", w.assignedUserId === user.id ? "border-accent" : "border-border-strong")}>
                  <div>
                    <div className="font-mono text-2xl font-bold">{w.code}</div>
                    <div className="text-muted">{w._count.orders} pedidos · {w.tasks.length} paradas</div>
                  </div>
                  <div className="text-right">
                    <Badge tone={WAVE_STATUS[w.status].tone}>{WAVE_STATUS[w.status].label}</Badge>
                    <div className="mt-1 font-mono text-xl">{left} u.</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
