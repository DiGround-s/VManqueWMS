"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Maximize2, Monitor, Play, Printer, RotateCcw, ScanLine, Smartphone, Waves } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/cn";
import { fmtTime } from "@/lib/format";
import { demoStateAction, demoWaveAction, startDemoAction } from "./actions";
import { DEMO, DEMO_CODES, DEMO_LAST, DEMO_STEPS, type DemoCode } from "./steps";
import type { DemoState } from "./service";

export type DemoQr = { key: DemoCode; svg: string };

function useDemoState(initial: DemoState, ms: number) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.visibilityState !== "visible") return;
      const r = await demoStateAction({});
      if (alive && r.ok) setState(r.data);
    };
    const t = setInterval(pull, ms);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [ms]);
  return [state, setState] as const;
}

export function DemoGuide({ initial, qrs, canRun, phone }: { initial: DemoState; qrs: DemoQr[]; canRun: boolean; phone?: { url: string; svg: string } }) {
  const [state, setState] = useDemoState(initial, 2000);
  const [pending, run] = useAction();
  const [big, setBig] = useState<DemoCode | null>(null);
  const step = state.step;
  const bigQr = qrs.find((q) => q.key === big);

  const refresh = async () => {
    const r = await demoStateAction({});
    if (r.ok) setState(r.data);
  };
  const start = () =>
    run(() => startDemoAction({}), { success: `Pedido ${DEMO.orderCode} creado. Sigue con la ola.`, onOk: refresh });
  const wave = () => run(() => demoWaveAction({}), { success: `Ola ${DEMO.waveCode} creada. Ahora, al teléfono.`, onOk: refresh, onError: refresh });
  const restart = () => {
    if (step > 0 && step < DEMO_LAST && !window.confirm("¿Empezar la prueba de nuevo? Se borra el avance de este pedido de prueba.")) return;
    start();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label">Avance</div>
              <div className="text-lg font-semibold">
                {step === DEMO_LAST ? "Prueba completa" : `Paso ${step + 1} de ${DEMO_LAST}: ${DEMO_STEPS[step].title}`}
              </div>
            </div>
            {canRun && step > 0 && (
              <Button variant="secondary" pending={pending} onClick={restart}>
                <RotateCcw className="size-4" /> {step === DEMO_LAST ? "Repetir prueba" : "Reiniciar"}
              </Button>
            )}
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {DEMO_STEPS.slice(0, DEMO_LAST).map((s, i) => (
              <span key={s.title} className={cn("h-2 flex-1 rounded-full", i < step ? "bg-success" : i === step ? "bg-accent" : "bg-border")} />
            ))}
          </div>
        </Card>

        <ol className="space-y-3" aria-label="Pasos de la prueba">
          {DEMO_STEPS.map((s, i) => {
            const done = i < step || step === DEMO_LAST;
            const current = i === step;
            if (i === DEMO_LAST && step !== DEMO_LAST) return null;
            return (
              <li key={s.title}>
                <Card className={cn("p-4 transition-shadow", current && step !== DEMO_LAST && "ring-2 ring-accent shadow-lift", current && step === DEMO_LAST && "ring-2 ring-success")}>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        i === DEMO_LAST ? "bg-success text-white" : done ? "bg-success-bg text-success" : current ? "bg-accent text-accent-ink" : "bg-panel-2 text-muted",
                      )}
                    >
                      {done || i === DEMO_LAST ? <CheckCircle2 className="size-5" aria-hidden /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className={cn("font-semibold", !current && !done && "text-muted")}>{s.title}</h2>
                        {i < DEMO_LAST && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-panel-2 px-2 py-0.5 text-xs font-semibold text-muted">
                            {s.device.startsWith("Teléfono") ? <Smartphone className="size-3.5" aria-hidden /> : <Monitor className="size-3.5" aria-hidden />}
                            {s.device}
                          </span>
                        )}
                        {done && i < DEMO_LAST && <span className="text-xs font-semibold text-success">Hecho</span>}
                      </div>
                      {(current || i === DEMO_LAST) && (
                        <div className="mt-2 space-y-3">
                          <p className="text-[15px] leading-relaxed">{s.text}</p>
                          {s.scans.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <ScanLine className="size-4 text-muted" aria-hidden />
                              <span className="text-sm text-muted">Escanea, en este orden:</span>
                              {s.scans.map((c, n) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setBig(c)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 font-mono text-sm font-semibold hover:ring-2 hover:ring-accent"
                                  title="Mostrar este QR solo y en grande"
                                >
                                  {n + 1}. {DEMO_CODES[c].label} {DEMO_CODES[c].caption.split(" · ")[0]}
                                  <Maximize2 className="size-3.5" aria-hidden />
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {i === 0 && canRun && (
                              <Button variant="primary" size="lg" pending={pending} onClick={start}>
                                <Play className="size-4" /> Crear pedido de prueba
                              </Button>
                            )}
                            {i === 1 && canRun && (
                              <Button variant="primary" size="lg" pending={pending} onClick={wave}>
                                <Waves className="size-4" /> Crear ola {DEMO.waveCode}
                              </Button>
                            )}
                            {s.office && (
                              <Link href={s.office} className={buttonClass("secondary", "lg")} target={i === DEMO_LAST ? undefined : "_blank"}>
                                <ExternalLink className="size-4" /> {i === DEMO_LAST || i === 1 ? "Ver el pedido" : "Hacerlo en el PC"}
                              </Link>
                            )}
                            {s.phone && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-panel-2 px-3 font-mono text-sm text-muted">
                                <Smartphone className="size-4" aria-hidden /> {s.phone}
                              </span>
                            )}
                          </div>
                          {!canRun && i <= 1 && <p className="text-sm text-muted">Un supervisor debe iniciar la prueba desde aquí.</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>

        {state.events.length > 0 && (
          <Card className="p-5">
            <div className="label mb-3">Historial del pedido {DEMO.orderCode}</div>
            <ol className="space-y-2">
              {state.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="w-16 shrink-0 font-mono text-muted tabular-nums">{fmtTime(new Date(e.at))}</span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>

      <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
        <Card className="p-5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="label">Códigos de la prueba</span>
            <Link href="/print/prueba" target="_blank" className={buttonClass("secondary", "sm")}>
              <Printer className="size-4" /> Imprimir
            </Link>
          </div>
          <p className="mb-4 text-sm text-muted">Siempre son los mismos. Toca uno para verlo solo y en grande: así la cámara no lee otro por error.</p>
          <ul className="space-y-4">
            {qrs.map((q) => {
              const used = DEMO_STEPS[step]?.scans.includes(q.key) && step < DEMO_LAST;
              return (
                <li key={q.key}>
                  <button
                    type="button"
                    onClick={() => setBig(q.key)}
                    className={cn("flex w-full items-center gap-4 rounded-2xl p-2 text-left transition-colors hover:bg-panel-2", used && "bg-accent-soft ring-2 ring-accent hover:bg-accent-soft")}
                    aria-label={`Mostrar en grande el QR de ${DEMO_CODES[q.key].label}`}
                  >
                  <div className="size-28 shrink-0 rounded-xl bg-white p-2 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: q.svg }} />
                  <div className="min-w-0">
                    <div className="label">{DEMO_CODES[q.key].label}</div>
                    <div className="font-mono text-lg font-bold leading-tight">{DEMO_CODES[q.key].caption.split(" · ")[0]}</div>
                    {q.key === "product" && <div className="text-sm text-muted">{DEMO.productName}</div>}
                    {used && <div className="mt-1 text-xs font-semibold text-accent-strong">Se usa en este paso</div>}
                  </div>
                  <Maximize2 className="ml-auto size-4 shrink-0 text-muted" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
        <Dialog open={!!bigQr} onClose={() => setBig(null)} title={big ? `${DEMO_CODES[big].label}: escanéalo con el teléfono` : ""}>
          {bigQr && (
            <div className="flex flex-col items-center gap-3 px-5 pb-6">
              <div className="aspect-square w-full max-w-[min(420px,60vh)] rounded-2xl bg-white p-5 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: bigQr.svg }} />
              <div className="font-mono text-2xl font-bold">{DEMO_CODES[bigQr.key].caption.split(" · ")[0]}</div>
            </div>
          )}
        </Dialog>
        {phone && (
          <Card className="flex items-center gap-4 p-5">
            <div className="size-28 shrink-0 rounded-xl bg-white p-2 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: phone.svg }} />
            <div className="min-w-0">
              <div className="label">Abrir en el teléfono</div>
              <p className="mt-1 text-sm">Escanéalo con la cámara del teléfono para entrar al modo bodega.</p>
              <p className="mt-1 break-all font-mono text-xs text-muted">{phone.url}</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/** Compact banner on the phone: which step is next and where to tap. */
export function DemoPhoneBar({ initial }: { initial: DemoState }) {
  const [state] = useDemoState(initial, 3000);
  const step = state.step;
  if (step === 0) return null;
  const s = DEMO_STEPS[step];
  const finished = step === DEMO_LAST;
  return (
    <div className={cn("mb-5 rounded-3xl p-4", finished ? "bg-success-bg" : "bg-accent-soft ring-1 ring-accent")} role="status">
      <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-muted">
        <span>Prueba guiada · {DEMO.orderCode}</span>
        {!finished && <span>Paso {step + 1} de {DEMO_LAST}</span>}
      </div>
      <div className={cn("mt-1 text-lg font-semibold leading-tight", finished && "text-success")}>{s.title}</div>
      <p className="mt-1 text-sm leading-snug">{step === 1 ? "Esperando que se cree la ola en el PC." : s.text}</p>
      {s.scans.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {s.scans.map((c, n) => (
            <span key={c} className="rounded-full bg-panel px-2.5 py-1 font-mono text-xs font-semibold">
              {n + 1}. {DEMO_CODES[c].caption.split(" · ")[0]}
            </span>
          ))}
        </div>
      )}
      {s.phone && (
        <Link href={s.phone} className={cn(buttonClass("primary", "lg"), "mt-3 w-full")}>
          Ir a {s.title.toLowerCase()}
        </Link>
      )}
    </div>
  );
}
