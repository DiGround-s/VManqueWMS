import { ArrowDownToLine, PackageCheck, ScanLine, Truck } from "lucide-react";
import { LoginForm } from "@/features/auth/login-form";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Ingresar" };

const FEATURES = [
  { icon: ScanLine, text: "Escanea con la cámara o un lector" },
  { icon: ArrowDownToLine, text: "Recibe y ubica mercadería" },
  { icon: PackageCheck, text: "Picking por olas y empaque verificado" },
  { icon: Truck, text: "Despacho con etiqueta de envío" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-accent p-12 text-accent-ink lg:flex">
        <Wordmark className="text-xl [&_.text-muted]:text-accent-ink/60" />
        <div className="max-w-md">
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-balance">Tu bodega, en el bolsillo.</h1>
          <ul className="mt-8 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] opacity-90">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand text-brand-ink">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm opacity-60">Sistema de gestión de bodega</p>
        <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-brand/20" aria-hidden />
      </section>
      <section className="relative flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="w-full max-w-sm">
          <Wordmark className="mb-10 lg:hidden" />
          <h2 className="text-[28px] font-semibold tracking-tight">Ingresar</h2>
          <p className="mb-6 mt-1 text-muted">Usa tu correo de la bodega.</p>
          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}
