"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanInput } from "@/components/ui/scan-input";
import { useAction } from "@/lib/use-action";
import { beep } from "@/lib/beep";
import { cn } from "@/lib/cn";
import { shipScanAction } from "./actions";

type Entry = { key: number; tone: "ok" | "warn" | "bad"; title: string; detail?: string };

export function DispatchStation({ phone }: { phone?: boolean }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [log, setLog] = useState<Entry[]>([]);
  const [count, setCount] = useState(0);
  const push = (e: Omit<Entry, "key">) => {
    beep(e.tone === "ok");
    setLog((l) => [{ ...e, key: Date.now() }, ...l].slice(0, 30));
  };

  return (
    <div className="space-y-4">
      <ScanInput
        size={phone ? "xl" : "md"}
        pending={pending}
        placeholder="Escanea la etiqueta del bulto"
        onScan={(code) =>
          run(() => shipScanAction({ code }), {
            onOk: (r) => {
              if (r.already) push({ tone: "warn", title: `${r.code} ya estaba despachado`, detail: r.customerName });
              else {
                setCount((c) => c + 1);
                router.refresh();
                push({ tone: "ok", title: `${r.code} despachado`, detail: `${r.customerName} · ${r.carrier ?? "sin transporte"}` });
              }
            },
            onError: (e) => push({ tone: "bad", title: e }),
          })
        }
      />
      <div className="label">Despachados en esta sesión: <span className="font-mono text-base text-text">{count}</span></div>
      <ol className="space-y-2" aria-live="polite">
        {log.map((e, i) => (
          <li
            key={e.key}
            className={cn(
              "rounded-xl border px-4",
              phone ? "py-4" : "py-2.5",
              e.tone === "ok" && "border-success bg-success-bg",
              e.tone === "warn" && "border-accent bg-warn-bg",
              e.tone === "bad" && "border-danger bg-danger-bg text-danger",
              i === 0 && e.tone === "bad" && "flash-bad",
              i > 0 && "opacity-70",
            )}
          >
            <div className={cn("font-mono font-semibold", phone && "text-lg")}>{e.title}</div>
            {e.detail && <div className="text-sm">{e.detail}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
