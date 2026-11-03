"use client";

import { useState } from "react";
import { CheckCircle2, Printer } from "lucide-react";
import { ScanInput } from "@/components/ui/scan-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { beep } from "@/lib/beep";
import { cn } from "@/lib/cn";
import { openPackingAction, packScanAction } from "./actions";
import type { PackingOrder } from "./service";

const labelUrl = (code: string) => `/print/etiqueta/${code}?auto=1`;

export function PackingStation({ phone }: { phone?: boolean }) {
  const [order, setOrder] = useState<PackingOrder | null>(null);
  const [error, setError] = useState<{ msg: string; key: number } | null>(null);
  const [pending, run] = useAction();

  function openOrder(code: string, slot?: number) {
    run(() => openPackingAction({ code, slot }), {
      onOk: (o) => {
        beep(true);
        setError(null);
        setOrder(o);
      },
      onError: () => beep(false),
    });
  }

  function onProduct(code: string) {
    if (!order) return;
    run(() => packScanAction({ orderId: order.id, code }), {
      onOk: (r) => {
        if (r.kind === "wrong") {
          beep(false);
          setError({ msg: r.message, key: Date.now() });
          return;
        }
        beep(true);
        setError(null);
        setOrder(r.order);
        if (r.complete) window.open(labelUrl(r.order.code), "_blank");
      },
      onError: (e) => {
        beep(false);
        setError({ msg: e, key: Date.now() });
      },
    });
  }

  const size = phone ? "xl" : "md";
  if (!order) {
    return (
      <Card className="space-y-5 p-4">
        <ScanInput onScan={(c) => openOrder(c)} pending={pending} size={size} label="Pedido" placeholder="Escanea o escribe el código del pedido" />
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            openOrder(String(f.get("wave")), Number(f.get("slot")));
          }}
        >
          <div className="label w-full">o por ola y casilla</div>
          <Input name="wave" placeholder="OLA-0001" required className={cn("w-40 font-mono", phone && "h-14 text-lg")} />
          <Input name="slot" type="number" min={1} placeholder="Casilla" required className={cn("w-28 font-mono", phone && "h-14 text-lg")} />
          <Button type="submit" pending={pending} size={phone ? "lg" : "md"}>Abrir</Button>
        </form>
      </Card>
    );
  }

  const total = order.lines.reduce((n, l) => n + l.qty, 0);
  const packed = order.lines.reduce((n, l) => n + l.packedQty, 0);
  const done = order.status === "PACKED";

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-mono text-2xl font-bold">{order.code}</div>
          <div className="text-sm text-muted">{order.customerName} · {order.commune} · {order.carrier ?? "sin transporte"}</div>
        </div>
        <div className="font-mono text-3xl font-semibold">{packed}/{total}</div>
      </Card>

      {done ? (
        <div className="flex flex-col items-center gap-4 rounded-md border-2 border-success bg-success-bg p-6 text-center">
          <CheckCircle2 className="size-16 text-success" />
          <div className="text-3xl font-bold">EMPACADO</div>
          <div className="flex w-full max-w-md flex-col gap-2">
            <a href={labelUrl(order.code)} target="_blank" rel="noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-accent-strong bg-accent px-5 text-lg font-semibold uppercase tracking-wide text-accent-ink">
              <Printer className="size-5" /> Imprimir etiqueta
            </a>
            <Button size="xl" onClick={() => setOrder(null)}>Siguiente pedido</Button>
          </div>
        </div>
      ) : (
        <>
          <ScanInput onScan={onProduct} pending={pending} size={size} placeholder="Escanea cada producto" />
          {error && (
            <div key={error.key} className="flash-bad rounded-md border-2 border-danger p-4 text-center text-xl font-bold text-danger" role="alert">
              ✕ {error.msg}
            </div>
          )}
          <ul className="space-y-2">
            {order.lines.map((l) => {
              const ok = l.packedQty >= l.qty;
              return (
                <li key={l.id} className={cn("flex items-center gap-3 rounded-md border p-3", ok ? "border-success bg-success-bg" : "border-border bg-panel")}>
                  {l.product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external product URLs
                    <img src={l.product.imageUrl} alt="" className="size-14 rounded-sm border border-border bg-white object-contain" />
                  ) : (
                    <div className="size-14 rounded-sm border border-dashed border-border" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm font-semibold">{l.product.sku}</div>
                    <div className={cn("truncate", phone && "text-lg")}>{l.product.name}</div>
                  </div>
                  <div className={cn("font-mono font-bold", phone ? "text-3xl" : "text-2xl", ok && "text-success")}>{l.packedQty}/{l.qty}</div>
                </li>
              );
            })}
          </ul>
          <Button variant="ghost" onClick={() => setOrder(null)}>Cambiar de pedido</Button>
        </>
      )}
    </div>
  );
}
