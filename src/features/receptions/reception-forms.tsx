"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { ScanInput } from "@/components/ui/scan-input";
import { useAction } from "@/lib/use-action";
import { beep, scanError } from "@/lib/beep";
import { scanInfoAction } from "@/features/scan/actions";
import { addReceptionLineAction, confirmReceptionAction, createReceptionAction, removeReceptionLineAction } from "./actions";

export function NewReception() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, run] = useAction();
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-4" /> Nueva recepción</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nueva recepción">
        <form
          className="space-y-3"
          action={(f) => run(() => createReceptionAction({ supplier: String(f.get("supplier") ?? ""), note: String(f.get("note") ?? "") }), { onOk: (r) => router.push(`/recepciones/${r.code}`) })}
        >
          <Field label="Proveedor"><Input name="supplier" maxLength={120} autoFocus /></Field>
          <Field label="Nota / documento"><Input name="note" maxLength={500} placeholder="Factura, guía…" /></Field>
          <Button type="submit" variant="primary" pending={pending} className="w-full">Crear</Button>
        </form>
      </Dialog>
    </>
  );
}

/** Scan a product, type the quantity, keep or scan the target location (defaults to the dock). */
export function AddReceptionLine({ receptionId, defaultLocation }: { receptionId: string; defaultLocation: string }) {
  const [product, setProduct] = useState<{ id: string; sku: string; name: string } | null>(null);
  const [qty, setQty] = useState("1");
  const [location, setLocation] = useState(defaultLocation);
  const [pending, run] = useAction();

  function add() {
    if (!product) return;
    run(() => scanInfoAction({ code: location }), {
      onOk: (r) => {
        if (r.type !== "location") return scanError("Ubicación no encontrada");
        run(() => addReceptionLineAction({ receptionId, productId: product.id, locationId: r.id, qty: Number(qty) }), {
          success: `${qty} × ${product.sku} → ${r.code}`,
          onOk: () => (setProduct(null), setQty("1")),
        });
      },
    });
  }

  return (
    <div className="space-y-3">
      {product ? (
        <div className="rounded-xl border border-border bg-panel-2 px-3 py-2">
          <div className="font-mono font-semibold">{product.sku}</div>
          <div className="text-sm">{product.name}</div>
        </div>
      ) : (
        <ScanInput
          label="Producto"
          pending={pending}
          onScan={(code) =>
            run(() => scanInfoAction({ code }), {
              onOk: (r) => {
                if (r.type !== "product") return scanError("Eso no es un producto");
                beep(true);
                setProduct({ id: r.id, sku: r.sku, name: r.name });
              },
            })
          }
        />
      )}
      <Field label="Cantidad"><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="font-mono" /></Field>
      <Field label="Ubicación destino" hint="Andén para ubicar después, o directo a su casilla"><Input value={location} onChange={(e) => setLocation(e.target.value)} className="font-mono uppercase" /></Field>
      <div className="flex gap-2">
        <Button variant="primary" disabled={!product} pending={pending} onClick={add}>Agregar</Button>
        {product && <Button variant="ghost" onClick={() => setProduct(null)}>Otro producto</Button>}
      </div>
    </div>
  );
}

export function RemoveLine({ receptionId, lineId }: { receptionId: string; lineId: string }) {
  const [pending, run] = useAction();
  return (
    <Button size="sm" variant="ghost" pending={pending} onClick={() => run(() => removeReceptionLineAction({ receptionId, lineId }))} aria-label="Quitar línea">
      <Trash2 className="size-4" />
    </Button>
  );
}

export function ConfirmReception({ id, disabled }: { id: string; disabled: boolean }) {
  const [pending, run] = useAction();
  return (
    <Button variant="primary" disabled={disabled} pending={pending} onClick={() => confirm("¿Confirmar la recepción? El stock entra y ya no se puede editar.") && run(() => confirmReceptionAction({ id }), { success: "Recepción confirmada: stock ingresado" })}>
      Confirmar recepción
    </Button>
  );
}
