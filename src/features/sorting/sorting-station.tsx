"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanInput } from "@/components/ui/scan-input";
import { Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAction } from "@/lib/use-action";
import { beep } from "@/lib/beep";
import { cn } from "@/lib/cn";
import { sortScanAction } from "./actions";
import type { SortScanResult } from "./service";

type Display = { tone: "ok" | "warn" | "bad"; big: string; line1?: string; line2?: string; key: number };

export function SortingStation({ waves, selected, basePath, phone }: { waves: { id: string; code: string }[]; selected?: { id: string; code: string }; basePath: string; phone?: boolean }) {
  const waveId = selected?.id;
  const router = useRouter();
  const [pending, run] = useAction();
  const [display, setDisplay] = useState<Display | null>(null);
  const [log, setLog] = useState<{ text: string; tone: Display["tone"] }[]>([]);

  function show(d: Omit<Display, "key">) {
    beep(d.tone === "ok");
    setDisplay({ ...d, key: Date.now() });
    setLog((l) => [{ text: `${d.big} · ${d.line1 ?? ""}`, tone: d.tone }, ...l].slice(0, 12));
  }

  function onScan(code: string) {
    if (!waveId) return;
    run(() => sortScanAction({ waveId, code }), {
      onOk: (r: SortScanResult) => {
        if (r.kind === "slot") {
          show({ tone: "ok", big: `CASILLA ${r.slot}`, line1: `${r.orderCode} · ${r.sku}`, line2: r.orderComplete ? "PEDIDO COMPLETO ✓ — pásalo a empaque" : `${r.product} · faltan ${r.remainingInOrder} u.` });
          // Keep the last slot on screen long enough to read before the station moves on.
          if (r.waveDone) setTimeout(() => router.refresh(), 3500);
        } else if (r.kind === "complete") show({ tone: "warn", big: "YA SEPARADO", line1: r.sku, line2: "Todas las unidades de este producto ya están en su casilla" });
        else if (r.kind === "not_picked") show({ tone: "warn", big: "SIN RECOGER", line1: r.sku, line2: "La ola no registra esta unidad como recogida" });
        else show({ tone: "bad", big: "NO ES DE ESTA OLA", line1: r.sku, line2: r.product });
      },
      onError: (e) => show({ tone: "bad", big: "ERROR", line1: e }),
    });
  }

  if (waves.length === 0) return <Card><EmptyState title="No hay olas en la mesa">Cuando una ola termina el picking aparece aquí.</EmptyState></Card>;

  return (
    <div className="space-y-4">
      <div className={cn("grid gap-3", !phone && "md:grid-cols-[220px_1fr]")}>
        <Select value={selected?.code ?? ""} onChange={(e) => router.push(`${basePath}?ola=${e.target.value}`)} className={phone ? "h-14 text-lg" : "h-11"} aria-label="Ola">
          <option value="" disabled>Elige la ola…</option>
          {waves.map((w) => <option key={w.id} value={w.code}>{w.code}</option>)}
        </Select>
        {waveId && <ScanInput onScan={onScan} pending={pending} size={phone ? "xl" : "md"} placeholder="Escanea un producto" />}
      </div>
      {waveId && (
        <div
          key={display?.key}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border px-4 text-center",
            phone ? "min-h-64 py-6" : "min-h-[22rem] py-10",
            !display && "border-dashed border-border text-muted",
            display?.tone === "ok" && "border-success bg-success-bg",
            display?.tone === "warn" && "border-accent bg-warn-bg",
            display?.tone === "bad" && "flash-bad border-danger bg-danger-bg",
          )}
          aria-live="assertive"
        >
          {display ? (
            <>
              <div className={cn("font-mono font-bold leading-none tracking-tight", phone ? "text-5xl" : "text-8xl", display.tone === "bad" && "text-danger")}>{display.big}</div>
              {display.line1 && <div className={cn("mt-4 font-mono font-semibold", phone ? "text-xl" : "text-2xl")}>{display.line1}</div>}
              {display.line2 && <div className={cn("mt-1", phone ? "text-base" : "text-lg")}>{display.line2}</div>}
            </>
          ) : (
            <div className="text-lg">Escanea un producto para ver su casilla</div>
          )}
        </div>
      )}
      {log.length > 1 && (
        <ol className="space-y-1 text-sm">
          {log.slice(1).map((l, i) => (
            <li key={i} className={cn("font-mono", l.tone === "bad" ? "text-danger" : l.tone === "warn" ? "text-accent-strong" : "text-muted")}>{l.text}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
