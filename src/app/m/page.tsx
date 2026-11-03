import Link from "next/link";
import { ArrowDownToLine, ArrowRightLeft, ClipboardCheck, Grid3x3, PackageCheck, PackagePlus, Search, Truck, Undo2, Waves, type LucideIcon } from "lucide-react";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { cn } from "@/lib/cn";

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
  const tiles: { href: string; label: string; icon: LucideIcon; count?: number; hint?: string; hot?: boolean }[] = [
    { href: "/m/picking", label: "Picking", icon: Waves, count: waves, hint: mine ? `${mine} tuyas` : undefined, hot: mine > 0 },
    { href: "/m/separar", label: "Separar", icon: Grid3x3, count: sorting },
    { href: "/m/empacar", label: "Empacar", icon: PackageCheck, count: toPack },
    { href: "/m/despachar", label: "Despachar", icon: Truck, count: toShip },
    { href: "/m/recibir", label: "Recibir", icon: ArrowDownToLine },
    { href: "/m/ubicar", label: "Ubicar", icon: PackagePlus, count: dock._sum.qty ?? 0, hint: "u. en andén" },
    { href: "/m/mover", label: "Mover", icon: ArrowRightLeft },
    { href: "/m/contar", label: "Contar", icon: ClipboardCheck },
    { href: "/m/reponer", label: "Reponer", icon: Undo2, count: putbacks, hot: putbacks > 0 },
    { href: "/m/consultar", label: "Consultar", icon: Search },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map(({ href, label, icon: Icon, count, hint, hot }) => (
        <Link key={href} href={href} className={cn("relative flex min-h-28 flex-col justify-between rounded-md border-2 bg-panel p-3 active:bg-panel-2", hot ? "border-accent" : "border-border-strong")}>
          <Icon className="size-8" aria-hidden />
          <div>
            <div className="text-lg font-bold uppercase tracking-wide">{label}</div>
            {hint && <div className="text-xs text-muted">{hint}</div>}
          </div>
          {count != null && count > 0 && <span className="absolute right-3 top-3 font-mono text-2xl font-bold text-accent-strong">{count}</span>}
        </Link>
      ))}
    </div>
  );
}
