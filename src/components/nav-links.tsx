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
    <nav className="flex gap-4 overflow-x-auto px-2 py-2 lg:flex-col lg:gap-5 lg:overflow-visible lg:py-4">
      {groups.map((g) => (
        <div key={g.title} className="flex shrink-0 gap-1 lg:flex-col">
          <div className="label hidden px-2 pb-1 lg:block">{g.title}</div>
          {g.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-md border-l-2 px-2.5 py-1.5 text-sm",
                  active ? "border-accent bg-panel-2 font-semibold" : "border-transparent text-muted hover:bg-panel-2 hover:text-text",
                )}
              >
                <Icon className={cn("size-4", active && "text-accent-strong")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
