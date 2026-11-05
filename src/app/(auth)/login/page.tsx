import { ArrowRight } from "lucide-react";
import { LoginForm } from "@/features/auth/login-form";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Ingresar" };

const STEPS = ["Pendiente", "En ola", "Recogido", "Separado", "Empacado", "Despachado"];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="relative flex flex-col justify-between gap-10 overflow-hidden bg-rail px-6 py-8 text-rail-ink sm:px-10 lg:py-12">
        <Wordmark className="text-2xl" />
        <div className="max-w-md">
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-balance sm:text-5xl">Cada cosa en su casillero.</h1>
          <p className="mt-4 text-lg text-rail-muted">Stock por ubicación, picking por olas, empaque verificado y despacho, escaneando desde el PC o el teléfono.</p>
        </div>
        <ol className="hidden flex-wrap gap-2 lg:flex" aria-label="Etapas de un pedido">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-sm font-bold">
              <span className="rounded-md border-2 border-rail-muted/40 px-2.5 py-1">{s}</span>
              {i < STEPS.length - 1 && <ArrowRight className="size-4 text-yellow" aria-hidden />}
            </li>
          ))}
        </ol>
        <span className="postmark pointer-events-none absolute -right-10 top-16 size-44 rotate-[-12deg] text-sm uppercase text-yellow/25 sm:-right-6" aria-hidden>
          VManque · Bodega
        </span>
      </section>
      <section className="relative flex items-center justify-center px-4 py-10 sm:px-10">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-black tracking-tight">Ingresar</h2>
          <p className="mb-6 mt-1 text-muted">Usa tu correo de la bodega.</p>
          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}
