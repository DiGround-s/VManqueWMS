import Link from "next/link";
import { cookies } from "next/headers";
import { LogOut, Smartphone } from "lucide-react";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { logout } from "@/features/auth/actions";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiquidToggle } from "@/components/liquid-toggle";
import { GlobalScan } from "@/components/global-scan";
import { ScanStamp } from "@/components/scan-stamp";
import { Wordmark } from "@/components/wordmark";
import { RailToggle } from "@/components/rail-toggle";
import { ROLE } from "@/lib/labels";
import { buttonClass } from "@/components/ui/button";
import { getCompanyName } from "@/features/settings/service";
import { unansweredCount } from "@/features/inbox/service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, company, unanswered, jar] = await Promise.all([requirePageRole("OPERATOR"), getCompanyName(), unansweredCount(), cookies()]);
  const railMin = jar.get("rail")?.value === "min";
  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "General",
      items: [
        { href: "/", label: "Inicio", icon: "LayoutDashboard" },
        { href: "/en-vivo", label: "Pedidos en vivo", icon: "Activity" },
        { href: "/ventas", label: "Ventas y canales", icon: "Store" },
        { href: "/apis", label: "APIs de tiendas", icon: "Webhook" },
        { href: "/atencion", label: "Atención", icon: "MessagesSquare", badge: unanswered },
      ],
    },
    {
      title: "Salidas",
      items: [
        { href: "/pedidos", label: "Pedidos", icon: "ClipboardList" },
        { href: "/olas", label: "Olas", icon: "Waves" },
        { href: "/mesa", label: "Mesa de separación", icon: "Grid3x3" },
        { href: "/preparacion", label: "Preparación", icon: "PackageCheck" },
        { href: "/despacho", label: "Despacho", icon: "Truck" },
        { href: "/prueba", label: "Prueba guiada", icon: "Route" },
      ],
    },
    {
      title: "Bodega",
      items: [
        { href: "/inventario", label: "Inventario", icon: "Boxes" },
        { href: "/mapa", label: "Mapa 3D", icon: "Map" },
        { href: "/ubicaciones", label: "Ubicaciones", icon: "MapPin" },
        { href: "/productos", label: "Productos", icon: "Package" },
        { href: "/recepciones", label: "Recepciones", icon: "ArrowDownToLine" },
      ],
    },
  ];
  if (hasRole(user, "ADMIN")) {
    groups.push({
      title: "Administración",
      items: [
        { href: "/usuarios", label: "Usuarios", icon: "Users" },
        { href: "/api-keys", label: "API keys", icon: "KeyRound" },
        { href: "/ajustes", label: "Ajustes", icon: "Settings" },
      ],
    });
  }

  return (
    <div id="app-shell" data-rail={railMin ? "min" : "full"} className="group/shell min-h-dvh lg:grid lg:grid-cols-[264px_1fr] lg:transition-[grid-template-columns] lg:duration-200 lg:data-[rail=min]:grid-cols-[84px_1fr]">
      <aside className="glass-sidebar border-b border-border text-rail-ink lg:sticky lg:top-2 lg:m-2 lg:mr-0 lg:flex lg:h-[calc(100dvh-1rem)] lg:flex-col lg:overflow-y-auto lg:rounded-[22px] lg:border-b-0">
        <div className="flex items-start gap-1 pb-2 pl-5 pr-3 pt-4 lg:pt-6 lg:group-data-[rail=min]/shell:flex-col lg:group-data-[rail=min]/shell:items-center lg:group-data-[rail=min]/shell:gap-3 lg:group-data-[rail=min]/shell:pl-0 lg:group-data-[rail=min]/shell:pr-0">
          <Link href="/" className="block min-w-0 flex-1 lg:group-data-[rail=min]/shell:flex-none" aria-label="Inicio">
            <Wordmark className="whitespace-nowrap lg:group-data-[rail=min]/shell:[&>span:last-child]:hidden" />
            <div className="mt-1.5 truncate pl-[46px] text-xs text-rail-muted lg:group-data-[rail=min]/shell:hidden">{company}</div>
          </Link>
          <RailToggle initial={railMin} />
        </div>
        <NavLinks groups={groups} />
        <Link
          href="/m"
          title="Modo bodega"
          className="mx-3 mb-4 mt-auto hidden items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-success transition-colors hover:brightness-95 lg:flex lg:group-data-[rail=min]/shell:justify-center lg:group-data-[rail=min]/shell:px-0"
        >
          <Smartphone className="size-5 shrink-0" aria-hidden />
          <span className="lg:group-data-[rail=min]/shell:hidden">
            Modo bodega
            <span className="block text-xs font-normal opacity-80">Ábrelo en el teléfono</span>
          </span>
        </Link>
      </aside>
      <div className="min-w-0">
        <header className="scroll-edge sticky top-0 z-30 flex flex-wrap items-center gap-3 px-4 py-3 lg:px-8">
          <GlobalScan />
          <div className="glass-capsule ml-auto flex items-center gap-1 rounded-full p-1">
            <Link href="/m" className={buttonClass("secondary", "md", "lg:hidden")}>
              <Smartphone className="size-4" aria-hidden /> Bodega
            </Link>
            <Link href="/cuenta" className="hidden items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-rail-2 sm:flex">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-ink" aria-hidden>
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-left text-xs leading-tight">
                <span className="block font-semibold">{user.name}</span>
                <span className="text-muted">{ROLE[user.role]}</span>
              </span>
            </Link>
            <LiquidToggle className="bg-transparent ring-0 hover:bg-rail-2" />
            <ThemeToggle className="bg-transparent ring-0 hover:bg-rail-2" />
            <form action={logout}>
              <button className="flex size-10 items-center justify-center rounded-full hover:bg-rail-2" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 pb-10 pt-2 lg:px-8">{children}</main>
      </div>
      <ScanStamp />
    </div>
  );
}
