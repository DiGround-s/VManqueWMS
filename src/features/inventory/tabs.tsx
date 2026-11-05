import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/inventario", label: "Stock por producto" },
  { href: "/inventario/movimientos", label: "Movimientos" },
  { href: "/inventario/ajuste", label: "Ajuste y traspaso" },
  { href: "/inventario/reposicion", label: "Reposición" },
  { href: "/inventario/devoluciones", label: "Por reponer" },
];

/** Segmented pill tabs for the inventory views. */
export function InventoryTabs({ active }: { active: string }) {
  return (
    <nav className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Vistas de inventario">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === active ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
            t.href === active ? "bg-accent text-accent-ink" : "bg-panel text-muted ring-1 ring-inset ring-border hover:text-text",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
