"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid3x3, Home, PackageCheck, Search, Waves } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/m", label: "Inicio", icon: Home },
  { href: "/m/picking", label: "Picking", icon: Waves },
  { href: "/m/separar", label: "Separar", icon: Grid3x3 },
  { href: "/m/empacar", label: "Empacar", icon: PackageCheck },
  { href: "/m/consultar", label: "Buscar", icon: Search },
];

/** Floating tab bar: a rounded dock above the home indicator. */
export function PhoneNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(env(safe-area-inset-bottom),12px)]" aria-label="Tareas">
      <ul className="mx-auto grid max-w-lg grid-cols-5 rounded-[28px] bg-panel p-1.5 shadow-lift ring-1 ring-border/70">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/m" ? path === "/m" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-[22px] text-[11px] font-semibold transition-colors",
                  active ? "bg-accent text-accent-ink" : "text-muted active:bg-panel-2",
                )}
              >
                <Icon className={cn("size-[22px]", active && "text-brand")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
