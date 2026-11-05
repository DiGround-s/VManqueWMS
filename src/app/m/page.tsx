import Link from "next/link";
import { ArrowDownToLine, ArrowRightLeft, ChevronRight, ClipboardCheck, Grid3x3, PackageCheck, PackagePlus, Search, Truck, Undo2, Waves, type LucideIcon } from "lucide-react";
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
        <p className="text-[15px] text-muted">¿Qué toca hacer ahora?</p>
      </div>

      <Link href="/m/consultar" className="flex items-center gap-3 rounded-xl border-2 border-accent bg-accent px-4 py-4 text-accent-ink shadow-[0_6px_16px_-8px_rgb(14_21_37/0.6)] active:brightness-95">
        <Search className="size-7" aria-hidden />
        <span className="flex-1">
          <span className="block text-lg font-black">Consultar</span>
          <span className="block text-sm opacity-85">Escanea una ubicación, producto o pedido</span>
        </span>
        <ChevronRight className="size-6" aria-hidden />
      </Link>

      <TileGroup title="Salidas" tiles={outbound} />
      <TileGroup title="Entradas y stock" tiles={stock} />
    </div>
  );
}

function TileGroup({ title, tiles }: { title: string; tiles: Tile[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-extrabold text-muted">{title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(({ href, label, icon: Icon, count, hint, hot }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex min-h-32 flex-col justify-between rounded-xl border-2 bg-panel p-3.5 transition-colors active:bg-panel-2",
              hot ? "border-danger" : "border-border",
            )}
          >
            <span className={cn("flex size-11 items-center justify-center rounded-lg", hot ? "bg-danger-bg text-danger" : "bg-accent-soft text-accent-strong")}>
              <Icon className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block text-lg font-black leading-tight">{label}</span>
              {hint && <span className="block text-xs leading-snug text-muted">{hint}</span>}
            </span>
            {count != null && count > 0 && (
              <span className={cn("postmark absolute right-3 top-3 size-11 rotate-[-10deg] text-lg", hot ? "text-danger" : "text-accent-strong")}>{count}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
