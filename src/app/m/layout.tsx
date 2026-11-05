import Link from "next/link";
import { Monitor } from "lucide-react";
import { requirePageRole } from "@/server/auth/current";
import { PhoneNav } from "@/components/phone-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScanStamp } from "@/components/scan-stamp";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Modo bodega" };

export default async function PhoneLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole();
  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-rail px-4 text-rail-ink">
        <Link href="/m" aria-label="Inicio del modo bodega">
          <Wordmark compact />
        </Link>
        <span className="ml-auto truncate text-sm font-semibold text-rail-muted">{user.name}</span>
        <ThemeToggle className="border-rail-muted/40 text-rail-ink hover:bg-rail-2" />
        <Link
          href="/"
          className="flex size-9 items-center justify-center rounded-md border-2 border-rail-muted/40 hover:bg-rail-2"
          aria-label="Ir a la oficina (PC)"
          title="Oficina"
        >
          <Monitor className="size-4" />
        </Link>
      </header>
      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
      <PhoneNav />
      <ScanStamp />
    </div>
  );
}
