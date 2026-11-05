"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ui/scan-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { beep, scanError } from "@/lib/beep";
import { cn } from "@/lib/cn";
import { scanInfoAction, type ScanInfo } from "@/features/scan/actions";
import { transferAction } from "./actions";

type Loc = Extract<ScanInfo, { type: "location" }>;
type Item = Loc["contents"][number];

/** Source location → product → quantity → target location. One TRANSFER movement. */
export function MoveFlow({ phone }: { phone?: boolean }) {
  const [from, setFrom] = useState<Loc | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [qty, setQty] = useState("");
  const [pending, run] = useAction();
  const size = phone ? "xl" : "md";
  const reset = () => (setFrom(null), setItem(null), setQty(""));

  const step = !from ? 1 : !item ? 2 : 3;

  return (
    <div className="space-y-4">
      <Steps step={step} labels={["Origen", "Producto", "Destino"]} />
      {from && <Summary label="Desde" value={from.code} onClear={reset} />}
      {item && <Summary label="Producto" value={`${item.sku} · ${item.name}`} onClear={() => setItem(null)} />}

      {step === 1 && (
        <ScanInput
          size={size}
          pending={pending}
          placeholder="Escanea la ubicación de origen"
          onScan={(code) =>
            run(() => scanInfoAction({ code }), {
              onOk: (r) => {
                if (r.type !== "location") return scanError("Eso no es una ubicación");
                if (!r.contents.some((c) => c.qty > 0)) return scanError(`${r.code} está vacía`);
                beep(true);
                setFrom(r);
              },
            })
          }
        />
      )}
      {step === 2 && from && (
        <>
          <ScanInput
            size={size}
            pending={pending}
            placeholder="Escanea el producto"
            onScan={(code) =>
              run(() => scanInfoAction({ code }), {
                onOk: (r) => {
                  const found = r.type === "product" && from.contents.find((c) => c.productId === r.id && c.qty > 0);
                  if (!found) return scanError(`Ese producto no está en ${from.code}`);
                  beep(true);
                  setItem(found);
                  setQty(String(found.qty));
                },
              })
            }
          />
          <ul className="space-y-2">
            {from.contents.filter((c) => c.qty > 0).map((c) => (
              <li key={c.productId}>
                <button type="button" onClick={() => (setItem(c), setQty(String(c.qty)))} className={cn("flex w-full items-center justify-between rounded-xl border border-border bg-panel px-3 text-left hover:border-accent", phone ? "py-4" : "py-2")}>
                  <span><span className="font-mono font-semibold">{c.sku}</span> <span className="text-muted">{c.name}</span></span>
                  <span className="font-mono text-xl">{c.qty}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {step === 3 && from && item && (
        <>
          <label className="flex items-center gap-3">
            <span className="label">Cantidad (máx. {item.qty})</span>
            <Input type="number" inputMode="numeric" min={1} max={item.qty} value={qty} onChange={(e) => setQty(e.target.value)} className={cn("font-mono", phone ? "h-14 w-28 text-2xl" : "w-28")} />
          </label>
          <ScanInput
            size={size}
            pending={pending}
            placeholder="Escanea la ubicación de destino"
            onScan={(code) =>
              run(() => scanInfoAction({ code }), {
                onOk: (r) => {
                  if (r.type !== "location") return scanError("Eso no es una ubicación");
                  run(() => transferAction({ productId: item.productId, fromLocationId: from.id, toLocationId: r.id, qty: Number(qty) }), {
                    success: `${qty} × ${item.sku}: ${from.code} → ${r.code}`,
                    onOk: () => (beep(true), reset()),
                    onError: () => beep(false),
                  });
                },
              })
            }
          />
        </>
      )}
    </div>
  );
}

export function Steps({ step, labels }: { step: number; labels: string[] }) {
  return (
    <ol className="flex gap-1.5">
      {labels.map((l, i) => (
        <li key={l} aria-current={i + 1 === step ? "step" : undefined} className={cn("flex flex-1 flex-col gap-1.5 text-xs font-bold", i + 1 === step ? "text-text" : "text-muted")}>
          <span className={cn(i + 1 < step && "line-through decoration-success decoration-2")}>{i + 1}. {l}</span>
          <span className={cn("h-1.5 rounded-full", i + 1 < step ? "bg-success" : i + 1 === step ? "bg-accent" : "bg-border")} aria-hidden />
        </li>
      ))}
    </ol>
  );
}

export function Summary({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-panel-2 px-3 py-2">
      <div className="min-w-0">
        <div className="label">{label}</div>
        <div className="truncate font-mono text-lg font-semibold">{value}</div>
      </div>
      <Button size="sm" variant="ghost" onClick={onClear}>Cambiar</Button>
    </div>
  );
}

