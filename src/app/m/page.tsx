import Link from "next/link";
import { ArrowDownToLine, ArrowRightLeft, ChevronRight, ClipboardCheck, Grid3x3, PackageCheck, PackagePlus, Truck, Undo2, Waves, type LucideIcon } from "lucide-react";
import { PhoneHomeScan } from "@/components/phone-home-scan";
import { ProductThumb } from "@/components/product-thumb";
import { db } from "@/server/db";
import { requirePageRole } from "@/server/auth/current";
import { cn } from "@/lib/cn";

type Tile = { href: string; label: string; icon: LucideIcon; count?: number; hint?: string; hot?: boolean; tint: string };

export default async function PhoneHome() {
  const user = await requirePageRole();
  const [waves, mine, sorting, toPack, toShip, dock, putbacks, low] = await Promise.all([
    db.wave.count({ where: { status: { in: ["OPEN", "PICKING"] } } }),
    db.wave.count({ where: { status: { in: ["OPEN", "PICKING"] }, assignedUserId: user.id } }),
    db.wave.count({ where: { status: "SORTING" } }),
    db.order.count({ where: { status: "SORTED" } }),
    db.order.count({ where: { status: "PACKED" } }),
    db.stockLevel.aggregate({ where: { qty: { gt: 0 }, location: { role: "DOCK" } }, _sum: { qty: true } }),
    db.putbackTask.count({ where: { status: "PENDING" } }),
    db.stockLevel.findMany({
      where: { minQty: { not: null }, qty: { lt: db.stockLevel.fields.minQty }, location: { role: "PICK", active: true } },
      orderBy: { location: { sortKey: "asc" } },
      take: 8,
      select: { id: true, qty: true, minQty: true, location: { select: { code: true } }, product: { select: { sku: true, name: true, imageUrl: true } } },
    }),
  ]);
  const tiles: Tile[] = [
    { href: "/m/picking", label: "Picking", icon: Waves, count: waves, hint: mine ? `${mine} tuyas` : "Olas", hot: mine > 0, tint: "bg-info-bg text-info" },
    { href: "/m/separar", label: "Separar", icon: Grid3x3, count: sorting, hint: "En mesa", tint: "bg-warn-bg text-warn" },
    { href: "/m/empacar", label: "Empacar", icon: PackageCheck, count: toPack, hint: "Separados", tint: "bg-brand-soft text-success" },
    { href: "/m/despachar", label: "Despachar", icon: Truck, count: toShip, hint: "Empacados", tint: "bg-accent-soft text-text" },
    { href: "/m/recibir", label: "Recibir", icon: ArrowDownToLine, hint: "Entrada", tint: "bg-brand-soft text-success" },
    { href: "/m/ubicar", label: "Ubicar", icon: PackagePlus, count: dock._sum.qty ?? 0, hint: "En andén", tint: "bg-info-bg text-info" },
    { href: "/m/mover", label: "Mover", icon: ArrowRightLeft, hint: "Traspaso", tint: "bg-accent-soft text-text" },
    { href: "/m/contar", label: "Contar", icon: ClipboardCheck, hint: "Conteo", tint: "bg-warn-bg text-warn" },
    { href: "/m/reponer", label: "Reponer", icon: Undo2, count: putbacks, hint: "Cancelados", hot: putbacks > 0, tint: "bg-danger-bg text-danger" },
  ];
  const first = user.name.split(" ")[0];
  const myWaves = mine > 0;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[15px] text-muted">Hola, {first}</p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight">¿Qué hacemos hoy?</h1>
      </div>
      <PhoneHomeScan />

      {(myWaves || waves > 0) && (
        <Link href="/m/picking" className="flex items-center gap-4 rounded-3xl bg-accent p-5 text-accent-ink shadow-lift active:scale-[0.99]">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-ink">
            <Waves className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold leading-tight">{myWaves ? `Tienes ${mine} ${mine === 1 ? "ola asignada" : "olas asignadas"}` : `${waves} ${waves === 1 ? "ola" : "olas"} por recoger`}</span>
            <span className="block text-sm opacity-70">Toca para empezar el picking</span>
          </span>
          <ChevronRight className="size-5 opacity-70" aria-hidden />
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Tareas</h2>
        <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
          {tiles.map(({ href, label, icon: Icon, count, hint, hot, tint }) => (
            <li key={href}>
              <Link href={href} className="group flex flex-col items-center gap-1.5 text-center">
                <span className={cn("relative flex size-[72px] items-center justify-center rounded-3xl transition-transform group-active:scale-95", tint)}>
                  <Icon className="size-7" aria-hidden />
                  {count != null && count > 0 && (
                    <span className={cn("absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ring-2 ring-surface", hot ? "bg-danger text-white" : "bg-accent text-accent-ink")}>
                      {count}
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold leading-tight">{label}</span>
                {hint && <span className="-mt-1 text-xs text-muted">{hint}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {low.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Por reponer en picking</h2>
            <span className="text-sm text-muted">{low.length}</span>
          </div>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {low.map((l) => (
              <li key={l.id} className="w-40 shrink-0 snap-start overflow-hidden rounded-3xl bg-panel shadow-card ring-1 ring-border/60">
                <ProductThumb src={l.product.imageUrl} size="lg" className="h-28 w-full rounded-none" />
                <div className="space-y-0.5 p-3">
                  <div className="line-clamp-2 text-sm font-semibold leading-snug">{l.product.name}</div>
                  <div className="font-mono text-xs text-muted">{l.location.code}</div>
                  <div className="pt-1 text-xs font-semibold text-danger">
                    {l.qty} de mín. {l.minQty}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
