"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { createProductAction, updateProductAction } from "./actions";

type P = { id: string; sku: string; name: string; barcode: string | null; imageUrl: string | null; description: string | null; active: boolean };

export function ProductForm({ product, readOnly }: { product?: P; readOnly?: boolean }) {
  const router = useRouter();
  const [pending, run] = useAction();
  return (
    <Card className="p-4">
      <form
        className="grid gap-4 sm:grid-cols-2"
        action={(form) => {
          const f = Object.fromEntries(form) as Record<string, string>;
          const data = { sku: f.sku, name: f.name, barcode: f.barcode, imageUrl: f.imageUrl, description: f.description, active: f.active === "on" };
          if (product) run(() => updateProductAction({ id: product.id, ...data }), { success: "Producto guardado" });
          else run(() => createProductAction(data), { success: "Producto creado", onOk: (p) => router.push(`/productos/${p.id}`) });
        }}
      >
        <fieldset disabled={readOnly} className="contents">
          <Field label="SKU"><Input name="sku" required defaultValue={product?.sku} className="font-mono uppercase" maxLength={40} /></Field>
          <Field label="Código de barras" hint="EAN/UPC, opcional"><Input name="barcode" defaultValue={product?.barcode ?? ""} className="font-mono" maxLength={40} /></Field>
          <Field label="Nombre" className="sm:col-span-2"><Input name="name" required defaultValue={product?.name} maxLength={200} /></Field>
          <Field label="URL de foto" className="sm:col-span-2"><Input name="imageUrl" type="text" defaultValue={product?.imageUrl ?? ""} maxLength={500} placeholder="https://… o /products/photos/archivo.jpg" /></Field>
          <Field label="Descripción" className="sm:col-span-2"><Textarea name="description" defaultValue={product?.description ?? ""} maxLength={1000} rows={3} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="size-4 accent-[var(--accent)]" /> Activo</label>
          {!readOnly && <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="primary" pending={pending}>{product ? "Guardar" : "Crear producto"}</Button></div>}
        </fieldset>
      </form>
    </Card>
  );
}
