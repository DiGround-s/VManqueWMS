import Link from "next/link";
import { LogOut, Smartphone } from "lucide-react";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { logout } from "@/features/auth/actions";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalScan } from "@/components/global-scan";
import { ScanStamp } from "@/components/scan-stamp";
import { Wordmark } from "@/components/wordmark";
import { ROLE } from "@/lib/labels";
import { buttonClass } from "@/components/ui/button";
import { getCompanyName } from "@/features/settings/service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, company] = await Promise.all([requirePageRole("OPERATOR"), getCompanyName()]);
  const groups: { title: string; items: NavItem[] }[] = [
    { title: "General", items: [{ href: "/", label: "Inicio", icon: "LayoutDashboard" }] },
    {
      title: "Salidas",
      items: [
        { href: "/pedidos", label: "Pedidos", icon: "ClipboardList" },
        { href: "/olas", label: "Olas", icon: "Waves" },
        { href: "/mesa", label: "Mesa de separación", icon: "Grid3x3" },
        { href: "/preparacion", label: "Preparación", icon: "PackageCheck" },
        { href: "/despacho", label: "Despacho", icon: "Truck" },
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="border-b border-border bg-rail text-rail-ink lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <Link href="/" className="block px-5 pb-2 pt-4 lg:pt-6">
          <Wordmark />
          <div className="mt-1.5 truncate pl-[46px] text-xs text-rail-muted">{company}</div>
        </Link>
        <NavLinks groups={groups} />
        <Link
          href="/m"
          className="mx-3 mb-4 mt-auto hidden items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-success transition-colors hover:brightness-95 lg:flex"
        >
          <Smartphone className="size-5" aria-hidden />
          <span>
            Modo bodega
            <span className="block text-xs font-normal opacity-80">Ábrelo en el teléfono</span>
          </span>
        </Link>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 bg-surface/85 px-4 py-3 backdrop-blur-md lg:px-8">
          <GlobalScan />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/m" className={buttonClass("secondary", "md", "lg:hidden")}>
              <Smartphone className="size-4" aria-hidden /> Bodega
            </Link>
            <Link href="/cuenta" className="hidden items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-panel sm:flex">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-ink" aria-hidden>
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-left text-xs leading-tight">
                <span className="block font-semibold">{user.name}</span>
                <span className="text-muted">{ROLE[user.role]}</span>
              </span>
            </Link>
            <ThemeToggle />
            <form action={logout}>
              <button className="flex size-10 items-center justify-center rounded-full bg-panel ring-1 ring-inset ring-border hover:bg-panel-2" aria-label="Cerrar sesión" title="Cerrar sesión">
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
