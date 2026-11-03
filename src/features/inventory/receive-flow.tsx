"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ui/scan-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";
import { beep, scanError } from "@/lib/beep";
import { cn } from "@/lib/cn";
import { scanInfoAction, type ScanInfo } from "@/features/scan/actions";
import { putawayAction, receiveAction } from "./actions";
import { Steps, Summary } from "./move-flow";

type Product = Extract<ScanInfo, { type: "product" }>;

/**
 * Recibir: product → qty → location, as a RECEIPT (goods from outside).
 * Ubicar: same steps, but the units come from the dock (PUTAWAY).
 */
export function ReceiveFlow({ mode, phone }: { mode: "receive" | "putaway"; phone?: boolean }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState("1");
  const [qtyOk, setQtyOk] = useState(false);
  const [pending, run] = useAction();
  const size = phone ? "xl" : "md";
  const reset = () => (setProduct(null), setQty("1"), setQtyOk(false));
  const step = !product ? 1 : !qtyOk ? 2 : 3;
  const dock = product?.locations.filter((l) => l.role === "DOCK").reduce((n, l) => n + l.qty, 0) ?? 0;

  return (
    <div className="space-y-4">
      <Steps step={step} labels={["Producto", "Cantidad", "Ubicación"]} />
      {product && <Summary label="Producto" value={`${product.sku} · ${product.name}`} onClear={reset} />}
      {step === 1 && (
        <ScanInput
          size={size}
          pending={pending}
          placeholder="Escanea el producto"
          onScan={(code) =>
            run(() => scanInfoAction({ code }), {
              onOk: (r) => {
                if (r.type !== "product") return scanError("Eso no es un producto");
                if (mode === "putaway" && !r.locations.some((l) => l.role === "DOCK")) return scanError(`${r.sku} no tiene unidades en el andén`);
                beep(true);
                setProduct(r);
                if (mode === "putaway") setQty(String(r.locations.filter((l) => l.role === "DOCK").reduce((n, l) => n + l.qty, 0)));
              },
            })
          }
        />
      )}
      {step === 2 && (
        <form onSubmit={(e) => (e.preventDefault(), Number(qty) > 0 && setQtyOk(true))} className="space-y-3">
          {mode === "putaway" && <p className="text-muted">En andén: <span className="font-mono text-text">{dock}</span></p>}
          <Input autoFocus type="number" inputMode="numeric" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className={cn("w-full text-center font-mono", phone ? "h-16 text-4xl" : "h-12 text-2xl")} aria-label="Cantidad" />
          <Button type="submit" variant="primary" size={phone ? "xl" : "lg"}>Siguiente</Button>
        </form>
      )}
      {step === 3 && product && (
        <>
          <Summary label="Cantidad" value={qty} onClear={() => setQtyOk(false)} />
          <ScanInput
            size={size}
            pending={pending}
            placeholder="Escanea la ubicación donde lo dejas"
            onScan={(code) =>
              run(() => scanInfoAction({ code }), {
                onOk: (r) => {
                  if (r.type !== "location") return scanError("Eso no es una ubicación");
                  const input = { productId: product.id, locationId: r.id, qty: Number(qty) };
                  run(() => (mode === "receive" ? receiveAction(input) : putawayAction(input)), {
                    success: `${qty} × ${product.sku} en ${r.code}`,
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
