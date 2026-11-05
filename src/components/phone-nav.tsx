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
  { href: "/m/consultar", label: "Consultar", icon: Search },
];

export function PhoneNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-border bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md" aria-label="Tareas">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 py-1.5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/m" ? path === "/m" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 rounded-lg text-xs font-bold transition-colors",
                  active ? "bg-accent text-accent-ink" : "text-muted active:bg-panel-2",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
