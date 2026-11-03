import Link from "next/link";
import { Monitor } from "lucide-react";
import { requirePageRole } from "@/server/auth/current";
import { PhoneNav } from "@/components/phone-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Modo bodega" };

export default async function PhoneLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole();
  return (
    <div className="min-h-dvh pb-24">
      <div className="hazard h-1.5" />
      <header className="flex h-14 items-center gap-2 border-b border-border bg-panel px-4">
        <Link href="/m" className="font-mono text-base font-bold">VM<span className="text-accent">/</span>BODEGA</Link>
        <span className="ml-auto truncate text-sm text-muted">{user.name}</span>
        <ThemeToggle />
        <Link href="/" className="flex size-9 items-center justify-center rounded-md border border-border" aria-label="Ir a la oficina (PC)" title="Oficina">
          <Monitor className="size-4" />
        </Link>
      </header>
      <main className="mx-auto max-w-lg p-4">{children}</main>
      <PhoneNav />
    </div>
  );
}
