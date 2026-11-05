import Link from "next/link";
import { ArrowDownToLine, ArrowRightLeft, ChevronRight, ClipboardCheck, Grid3x3, PackageCheck, PackagePlus, Truck, Undo2, Waves, type LucideIcon } from "lucide-react";
import { PhoneHomeScan } from "@/components/phone-home-scan";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { cn } from "@/lib/cn";

type Tile = { href: string; label: string; icon: LucideIcon; count?: number; hint?: string; hot?: boolean };

export default async function PhoneHome() {
  const user = await requirePageRole();
  const [waves, mine, sorting, toPack, toShip, dock, putbacks] = await Promise.all([
    db.wave.count({ where: { status: { in: ["OPEN", "PICKING"] } } }),
    db.wave.count({ where: { status: { in: ["OPEN", "PICKING"] }, assignedUserId: user.id } }),
    db.wave.count({ where: { status: "SORTING" } }),
    db.order.count({ where: { status: "SORTED" } }),
    db.order.count({ where: { status: "PACKED" } }),
    db.stockLevel.aggregate({ where: { qty: { gt: 0 }, location: { role: "DOCK" } }, _sum: { qty: true } }),
    db.putbackTask.count({ where: { status: "PENDING" } }),
  ]);
  const outbound: Tile[] = [
    { href: "/m/picking", label: "Picking", icon: Waves, count: waves, hint: mine ? `${mine} asignadas a ti` : "olas por recoger", hot: mine > 0 },
    { href: "/m/separar", label: "Separar", icon: Grid3x3, count: sorting, hint: "olas en la mesa" },
    { href: "/m/empacar", label: "Empacar", icon: PackageCheck, count: toPack, hint: "pedidos separados" },
    { href: "/m/despachar", label: "Despachar", icon: Truck, count: toShip, hint: "bultos empacados" },
  ];
  const stock: Tile[] = [
    { href: "/m/recibir", label: "Recibir", icon: ArrowDownToLine, hint: "entrada de mercadería" },
    { href: "/m/ubicar", label: "Ubicar", icon: PackagePlus, count: dock._sum.qty ?? 0, hint: "unidades en el andén" },
    { href: "/m/mover", label: "Mover", icon: ArrowRightLeft, hint: "entre ubicaciones" },
    { href: "/m/contar", label: "Contar", icon: ClipboardCheck, hint: "conteo de una ubicación" },
    { href: "/m/reponer", label: "Reponer", icon: Undo2, count: putbacks, hint: "de pedidos cancelados", hot: putbacks > 0 },
  ];
  const first = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Hola, {first}</h1>
        <p className="text-[15px] text-muted">Escanea algo para ver qué es y dónde está, o elige una tarea.</p>
      </div>
      <PhoneHomeScan />
      <SlotList title="Salidas" tiles={outbound} />
      <SlotList title="Entradas y stock" tiles={stock} />
    </div>
  );
}

/** Tasks as a column of mailroom slots: icon, task, what is waiting, and the count stamped on the right. */
function SlotList({ title, tiles }: { title: string; tiles: Tile[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-extrabold text-muted">{title}</h2>
      <ul className="divide-y-2 divide-border overflow-hidden rounded-xl border-2 border-border bg-panel">
        {tiles.map(({ href, label, icon: Icon, count, hint, hot }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-3 px-3.5 py-2.5 transition-colors active:bg-panel-2">
              <Icon className={cn("size-6 shrink-0", hot ? "text-danger" : "text-accent-strong")} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-black leading-tight">{label}</span>
                {hint && <span className="block truncate text-[13px] text-muted">{hint}</span>}
              </span>
              {count != null && count > 0 ? (
                <span className={cn("postmark size-11 shrink-0 rotate-[-10deg] text-lg", hot ? "text-danger" : "text-accent-strong")}>{count}</span>
              ) : (
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
