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
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="bg-rail text-rail-ink lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto">
        <Link href="/" className="block px-5 pb-1 pt-4 lg:pb-2 lg:pt-6">
          <Wordmark />
          <div className="mt-1 truncate text-xs font-semibold text-rail-muted">{company}</div>
        </Link>
        <NavLinks groups={groups} />
        <Link
          href="/m"
          className="mx-3 mb-4 mt-auto hidden items-center gap-3 rounded-lg border-2 border-rail-muted/30 px-3 py-2.5 text-sm font-bold text-rail-ink transition-colors hover:border-yellow hover:text-yellow lg:flex"
        >
          <Smartphone className="size-5" aria-hidden />
          <span>
            Modo bodega
            <span className="block text-xs font-medium text-rail-muted">Para el teléfono</span>
          </span>
        </Link>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b-[1.5px] border-border bg-surface/90 px-4 py-2.5 backdrop-blur-md lg:px-8">
          <GlobalScan />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/m" className="flex h-9 items-center gap-1.5 rounded-md border-2 border-border px-2.5 text-sm font-bold hover:bg-panel-2 lg:hidden">
              <Smartphone className="size-4" aria-hidden /> Bodega
            </Link>
            <Link href="/cuenta" className="hidden items-center gap-2.5 rounded-md px-2 py-1 hover:bg-panel-2 sm:flex">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-black text-accent-ink" aria-hidden>
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-left text-xs leading-tight">
                <span className="block font-bold">{user.name}</span>
                <span className="text-muted">{ROLE[user.role]}</span>
              </span>
            </Link>
            <ThemeToggle />
            <form action={logout}>
              <button className="flex size-9 items-center justify-center rounded-md border-2 border-border hover:bg-panel-2" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <ScanStamp />
    </div>
  );
}
