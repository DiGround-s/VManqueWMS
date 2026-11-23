"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, ArrowDownToLine, MessagesSquare, Boxes, ClipboardList, Grid3x3, KeyRound, LayoutDashboard, Map as MapIcon, MapPin, Package, PackageCheck, Route, Settings, Store, Truck, Users, Waves, Webhook,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ICONS = { LayoutDashboard, ClipboardList, Waves, Grid3x3, PackageCheck, Truck, Boxes, Map: MapIcon, MapPin, Package, ArrowDownToLine, Users, KeyRound, Settings, Store, Activity, MessagesSquare, Route, Webhook };
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

export function NavLinks({ groups }: { groups: { title: string; items: NavItem[] }[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 pt-1 lg:flex-col lg:gap-6 lg:overflow-visible lg:py-4 lg:group-data-[rail=min]/shell:gap-3" aria-label="Secciones">
      {groups.map((g) => (
        <div key={g.title} className="flex shrink-0 gap-1 lg:flex-col lg:gap-0.5">
          <div className="hidden px-3 pb-1.5 text-xs font-medium text-rail-muted lg:block lg:group-data-[rail=min]/shell:hidden">{g.title}</div>
          {g.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={cn(
                  "relative flex items-center gap-3 whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] transition-colors lg:group-data-[rail=min]/shell:justify-center lg:group-data-[rail=min]/shell:px-0 lg:group-data-[rail=min]/shell:py-2.5",
                  active ? "bg-accent font-semibold text-accent-ink" : "font-medium text-rail-ink/80 hover:bg-rail-2 hover:text-rail-ink",
                )}
              >
                <Icon className={cn("size-[18px] shrink-0", active ? "text-brand" : "text-rail-muted")} aria-hidden />
                <span className="lg:group-data-[rail=min]/shell:sr-only">{item.label}</span>
                {!!item.badge && (
                  <span className="ml-auto min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] font-bold leading-5 text-brand-ink tabular-nums lg:group-data-[rail=min]/shell:absolute lg:group-data-[rail=min]/shell:right-1 lg:group-data-[rail=min]/shell:top-0 lg:group-data-[rail=min]/shell:min-w-4 lg:group-data-[rail=min]/shell:px-1 lg:group-data-[rail=min]/shell:text-[10px] lg:group-data-[rail=min]/shell:leading-4" aria-label={`${item.badge} por responder`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
