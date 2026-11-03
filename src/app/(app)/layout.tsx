import Link from "next/link";
import { LogOut, Smartphone } from "lucide-react";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { logout } from "@/features/auth/actions";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-border bg-panel lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="hazard h-1.5" />
        <Link href="/" className="block px-4 pt-3 lg:pt-4">
          <div className="font-mono text-lg font-semibold leading-none">
            VMANQUE<span className="text-accent">/</span>WMS
          </div>
          <div className="label mt-1 truncate">{company}</div>
        </Link>
        <NavLinks groups={groups} />
      </aside>
      <div className="min-w-0">
        <header className="flex h-12 items-center justify-end gap-2 border-b border-border bg-panel px-4">
          <Link href="/m" className="mr-auto flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-panel-2">
            <Smartphone className="size-4" /> Modo bodega
          </Link>
          <Link href="/cuenta" className="hidden text-right text-xs leading-tight sm:block hover:underline">
            <div className="font-semibold">{user.name}</div>
            <div className="text-muted">{ROLE[user.role]}</div>
          </Link>
          <ThemeToggle />
          <form action={logout}>
            <button className="flex size-9 items-center justify-center rounded-md border border-border hover:bg-panel-2" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut className="size-4" />
            </button>
          </form>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
