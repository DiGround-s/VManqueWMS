import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/inventario", label: "Stock por producto" },
  { href: "/inventario/movimientos", label: "Movimientos" },
  { href: "/inventario/ajuste", label: "Ajuste y traspaso" },
  { href: "/inventario/reposicion", label: "Reposición" },
  { href: "/inventario/devoluciones", label: "Por reponer" },
];

export function InventoryTabs({ active }: { active: string }) {
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm", t.href === active ? "border-accent font-semibold" : "border-transparent text-muted hover:text-text")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
