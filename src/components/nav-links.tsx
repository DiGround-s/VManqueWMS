"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine, Boxes, ClipboardList, Grid3x3, KeyRound, LayoutDashboard, MapPin, Package, PackageCheck, Settings, Truck, Users, Waves,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS = { LayoutDashboard, ClipboardList, Waves, Grid3x3, PackageCheck, Truck, Boxes, MapPin, Package, ArrowDownToLine, Users, KeyRound, Settings };
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function NavLinks({ groups }: { groups: { title: string; items: NavItem[] }[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 pt-2 lg:flex-col lg:gap-5 lg:overflow-visible lg:py-5" aria-label="Secciones">
      {groups.map((g) => (
        <div key={g.title} className="flex shrink-0 gap-1 lg:flex-col lg:gap-0.5">
          <div className="hidden px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-rail-muted lg:block">{g.title}</div>
          {g.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-[15px] transition-colors",
                  active ? "bg-surface font-extrabold text-accent dark:bg-rail-2 dark:text-rail-ink" : "font-semibold text-rail-ink/85 hover:bg-rail-2 hover:text-rail-ink",
                )}
              >
                <Icon className={cn("size-[18px] shrink-0", active ? "text-accent dark:text-yellow" : "text-rail-muted")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
