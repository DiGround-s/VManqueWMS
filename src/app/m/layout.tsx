import Link from "next/link";
import { Monitor } from "lucide-react";
import { requirePageRole } from "@/server/auth/current";
import { PhoneNav } from "@/components/phone-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScanStamp } from "@/components/scan-stamp";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Modo bodega" };

export default async function PhoneLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole();
  return (
    <div className="min-h-dvh pb-32">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 bg-surface/85 px-4 backdrop-blur-md">
        <Link href="/m" aria-label="Inicio del modo bodega">
          <Wordmark compact />
        </Link>
        <span className="ml-auto" />
        <ThemeToggle />
        <Link
          href="/"
          className="flex size-10 items-center justify-center rounded-full bg-panel ring-1 ring-inset ring-border hover:bg-panel-2"
          aria-label="Ir a la oficina (PC)"
          title="Oficina"
        >
          <Monitor className="size-4" />
        </Link>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-5 pt-1">{children}</main>
      <PhoneNav />
      <ScanStamp />
    </div>
  );
}
