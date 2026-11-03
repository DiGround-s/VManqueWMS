"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { createOrderAction } from "./actions";

type Line = { sku: string; qty: string };

export function OrderForm({ products }: { products: { sku: string; name: string }[] }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [lines, setLines] = useState<Line[]>([{ sku: "", qty: "1" }]);

  function submit(form: FormData) {
    const f = Object.fromEntries(form) as Record<string, string>;
    run(
      () =>
        createOrderAction({
          externalRef: f.externalRef,
          customerName: f.customerName,
          address: f.address,
          commune: f.commune,
          phone: f.phone,
          carrier: f.carrier,
          notes: f.notes,
          priority: Number(f.priority || 0),
          lines: lines.filter((l) => l.sku.trim()).map((l) => ({ sku: l.sku.trim().toUpperCase(), qty: Number(l.qty) })),
        }),
      { success: (d) => `Pedido ${d.code} creado`, onOk: (d) => router.push(`/pedidos/${d.code}`) },
    );
  }

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form action={submit} className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader title="Cliente y envío" />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Cliente" className="sm:col-span-2"><Input name="customerName" required maxLength={200} /></Field>
          <Field label="Dirección" className="sm:col-span-2"><Input name="address" required maxLength={300} /></Field>
          <Field label="Comuna"><Input name="commune" required maxLength={100} /></Field>
          <Field label="Teléfono"><Input name="phone" type="tel" maxLength={40} /></Field>
          <Field label="Transporte"><Input name="carrier" maxLength={80} placeholder="Starken, Chilexpress, retiro…" /></Field>
          <Field label="Referencia externa" hint="Opcional. Evita duplicados."><Input name="externalRef" maxLength={80} /></Field>
          <Field label="Prioridad" hint="0 normal · 9 urgente"><Input name="priority" type="number" min={0} max={9} defaultValue={0} /></Field>
          <Field label="Notas" className="sm:col-span-2"><Textarea name="notes" maxLength={1000} /></Field>
        </div>
      </Card>
      <Card>
        <CardHeader title="Productos" action={<Button size="sm" onClick={() => setLines((ls) => [...ls, { sku: "", qty: "1" }])}><Plus className="size-4" /> Línea</Button>} />
        <datalist id="skus">
          {products.map((p) => <option key={p.sku} value={p.sku}>{p.name}</option>)}
        </datalist>
        <div className="space-y-2 p-4">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <Input list="skus" value={l.sku} onChange={(e) => setLine(i, { sku: e.target.value })} placeholder="SKU" className="flex-1 font-mono" aria-label={`SKU línea ${i + 1}`} />
              <Input type="number" min={1} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} className="w-24 font-mono" aria-label={`Cantidad línea ${i + 1}`} />
              <Button variant="ghost" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls))} aria-label="Quitar línea">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-border p-4">
          <Button type="submit" variant="primary" pending={pending}>Crear pedido</Button>
        </div>
      </Card>
    </form>
  );
}
