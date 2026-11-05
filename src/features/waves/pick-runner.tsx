"use client";

import { ProductThumb } from "@/components/product-thumb";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin } from "lucide-react";
import { ScanInput } from "@/components/ui/scan-input";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { beep, scanError } from "@/lib/beep";
import { cn } from "@/lib/cn";
import { confirmPickAction, startWaveAction } from "./actions";

type Task = { id: string; location: string; sku: string; barcode: string | null; name: string; imageUrl: string | null; left: number };

const norm = (s: string) => s.trim().toUpperCase().replace(/^LOC:/, "");

/** One task at a time: go to the location, scan it, scan each unit, confirm. */
export function PickRunner({ task, progress, waveCode }: { task: Task; progress: { done: number; total: number }; waveCode: string }) {
  const router = useRouter();
  const [atLocation, setAtLocation] = useState(false);
  const [count, setCount] = useState(0);
  const [pending, run] = useAction();

  function confirm(qty: number, short: boolean) {
    run(() => confirmPickAction({ taskId: task.id, qty, short }), {
      success: short ? `Falta registrada (${qty} de ${task.left})` : `${qty} × ${task.sku} recogido`,
      onOk: (r) => {
        beep(true);
        if (r.finished) router.push(`/m/picking/${waveCode}`);
      },
    });
  }

  function onProduct(code: string) {
    const c = code.trim().toUpperCase();
    if (c !== task.sku.toUpperCase() && c !== task.barcode?.toUpperCase()) return scanError("Producto equivocado");
    if (count >= task.left) return scanError(`Ya tienes las ${task.left} unidades`);
    beep(true);
    const next = count + 1;
    setCount(next);
    if (next === task.left) confirm(next, false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono font-bold">{waveCode}</span>
        <span className="font-semibold text-muted">Parada {progress.done + 1} de {progress.total}</span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: progress.total }, (_, i) => (
          <span key={i} className={cn("h-2 flex-1 rounded-full", i < progress.done ? "bg-success" : i === progress.done ? "bg-accent" : "bg-border")} />
        ))}
      </div>

      <div className={cn("rounded-3xl border px-4 py-5 text-center transition-colors", atLocation ? "border-success bg-success-bg" : "border-accent bg-accent-soft")}>
        <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-muted">
          <MapPin className="size-4" aria-hidden /> {atLocation ? "Estás en" : "Ve a la ubicación"}
        </div>
        <div className="mt-1 font-mono text-[clamp(2.75rem,14vw,4.5rem)] font-bold leading-none tracking-tight">{task.location}</div>
      </div>

      {!atLocation ? (
        <ScanInput
          size="xl"
          placeholder="Escanea la ubicación"
          onScan={(code) => {
            if (norm(code) !== task.location.toUpperCase()) return scanError(`Ubicación incorrecta: ve a ${task.location}`);
            beep(true);
            setAtLocation(true);
          }}
        />
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-3xl border border-border bg-panel p-3">
            <ProductThumb src={task.imageUrl} size="lg" />
            <div className="min-w-0">
              <div className="font-mono text-lg font-bold">{task.sku}</div>
              <div className="text-lg font-semibold leading-snug">{task.name}</div>
            </div>
          </div>
          <div>
            <div className="text-center font-mono text-6xl font-bold">
              <span className={count === task.left ? "text-success" : undefined}>{count}</span>
              <span className="text-muted">/{task.left}</span>
            </div>
            <div className="mt-2 flex gap-1" aria-hidden>
              {Array.from({ length: Math.min(task.left, 40) }, (_, i) => (
                <span key={i} className={cn("h-3 flex-1 rounded-lg", i < Math.round((count / task.left) * Math.min(task.left, 40)) ? "bg-success" : "bg-border")} />
              ))}
            </div>
          </div>
          <ScanInput size="xl" pending={pending} placeholder="Escanea cada unidad" onScan={onProduct} />
          <div className="flex items-center gap-2">
            <Input type="number" inputMode="numeric" min={0} max={task.left} value={count} onChange={(e) => setCount(Math.min(task.left, Math.max(0, Number(e.target.value) || 0)))} className="h-14 w-24 text-center font-mono text-2xl" aria-label="Cantidad recogida" />
            <Button variant="primary" size="xl" className="flex-1" disabled={count === 0} pending={pending} onClick={() => confirm(count, false)}>
              Confirmar {count}
            </Button>
          </div>
          <Button variant="danger" size="xl" pending={pending} onClick={() => window.confirm(`¿Sólo encontraste ${count} de ${task.left}? Se marca como faltante.`) && confirm(count, true)}>
            Falta
          </Button>
        </>
      )}
    </div>
  );
}

export function TakeWave({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [pending, run] = useAction();
  return (
    <div className="space-y-4 text-center">
      <div className="font-mono text-4xl font-bold">{code}</div>
      <p className="text-muted">Si está asignada a otra persona, pide al supervisor que te la asigne.</p>
      <Button variant="primary" size="xl" pending={pending} onClick={() => run(() => startWaveAction({ id }), { onOk: () => router.refresh() })}>
        Tomar ola y empezar
      </Button>
    </div>
  );
}

export function WaveFinished({ code }: { code: string }) {
  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto size-16 text-success" />
      <div className="font-mono text-3xl font-bold">{code}</div>
      <p className="text-lg">Picking terminado. Lleva todo a la mesa de separación.</p>
      <Link href={`/m/separar?ola=${code}`} className={buttonClass("primary", "xl")}>Ir a separar</Link>
      <Link href="/m/picking" className={buttonClass("secondary", "xl")}>Otra ola</Link>
    </div>
  );
}
