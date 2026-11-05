"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ui/scan-input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAction } from "@/lib/use-action";
import { beep, scanError } from "@/lib/beep";
import { cn } from "@/lib/cn";
import { scanInfoAction } from "@/features/scan/actions";
import { putbackAction } from "./actions";

export type PutbackItem = { id: string; qty: number; orderCode: string; sku: string; name: string; suggested: string | null };

/** Units of cancelled orders waiting to go back to a shelf: pick one, scan the location. */
export function PutbackList({ items, phone }: { items: PutbackItem[]; phone?: boolean }) {
  const [current, setCurrent] = useState<PutbackItem | null>(null);
  const [pending, run] = useAction();

  if (items.length === 0) return <EmptyState title="Nada por reponer">Cuando se cancela un pedido ya recogido, sus unidades aparecen aquí.</EmptyState>;

  if (current) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-panel-2 p-4">
          <div className="font-mono text-2xl font-bold">{current.qty} × {current.sku}</div>
          <div className={cn(phone && "text-lg")}>{current.name}</div>
          <div className="text-sm text-muted">Pedido {current.orderCode}{current.suggested && <> · sugerido <span className="font-mono">{current.suggested}</span></>}</div>
        </div>
        <ScanInput
          size={phone ? "xl" : "md"}
          pending={pending}
          placeholder="Escanea la ubicación donde lo dejas"
          onScan={(code) =>
            run(() => scanInfoAction({ code }), {
              onOk: (r) => {
                if (r.type !== "location") return scanError("Eso no es una ubicación");
                run(() => putbackAction({ putbackId: current.id, locationId: r.id }), {
                  success: `${current.qty} × ${current.sku} repuesto en ${r.code}`,
                  onOk: () => (beep(true), setCurrent(null)),
                });
              },
            })
          }
        />
        <Button variant="ghost" onClick={() => setCurrent(null)}>Volver a la lista</Button>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p.id}>
          <button type="button" onClick={() => setCurrent(p)} className={cn("flex w-full items-center gap-3 rounded-xl border border-border bg-panel px-4 text-left hover:border-accent", phone ? "min-h-16 py-3" : "py-2.5")}>
            <span className="font-mono text-2xl font-bold">{p.qty}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-mono font-semibold">{p.sku}</span>
              <span className="block truncate text-sm text-muted">{p.name} · {p.orderCode}</span>
            </span>
            {p.suggested && <span className="font-mono text-sm text-muted">{p.suggested}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
