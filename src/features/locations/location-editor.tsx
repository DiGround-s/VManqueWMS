"use client";

import { useState } from "react";
import type { LocationRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { scanError } from "@/lib/beep";
import { scanInfoAction } from "@/features/scan/actions";
import { slotLimitsAction } from "@/features/inventory/actions";
import { updateLocationAction } from "./actions";

const toNum = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));

export function LocationEditor({ id, role, active, sortKey }: { id: string; role: LocationRole; active: boolean; sortKey: number }) {
  const [pending, run] = useAction();
  return (
    <form
      className="grid grid-cols-2 gap-3"
      action={(f) => run(() => updateLocationAction({ id, role: f.get("role") as LocationRole, active: f.get("active") === "on", sortKey: Number(f.get("sortKey")) }), { success: "Ubicación actualizada" })}
    >
      <Field label="Uso">
        <Select name="role" defaultValue={role}>
          <option value="PICK">Picking</option>
          <option value="RESERVE">Reserva</option>
          <option value="DOCK">Andén</option>
        </Select>
      </Field>
      <Field label="Orden de ruta"><Input name="sortKey" type="number" min={0} defaultValue={sortKey} className="font-mono" /></Field>
      <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={active} className="size-4 accent-[var(--accent)]" /> Activa</label>
      <Button type="submit" pending={pending} className="col-span-2">Guardar</Button>
    </form>
  );
}

export function SlotLimits({ locationId, productId, minQty, maxQty }: { locationId: string; productId: string; minQty: number | null; maxQty: number | null }) {
  const [pending, run] = useAction();
  return (
    <form className="flex items-center gap-1" action={(f) => run(() => slotLimitsAction({ locationId, productId, minQty: toNum(f.get("min")), maxQty: toNum(f.get("max")) }), { success: "Mín/máx guardado" })}>
      <Input name="min" type="number" min={0} defaultValue={minQty ?? ""} placeholder="mín" className="h-8 w-16 px-1.5 font-mono" aria-label="Mínimo" />
      <Input name="max" type="number" min={0} defaultValue={maxQty ?? ""} placeholder="máx" className="h-8 w-16 px-1.5 font-mono" aria-label="Máximo" />
      <Button type="submit" size="sm" pending={pending}>OK</Button>
    </form>
  );
}

export function AssignSlot({ locationId }: { locationId: string }) {
  const [pending, run] = useAction();
  const [sku, setSku] = useState("");
  return (
    <form
      className="grid grid-cols-3 gap-2"
      action={(f) =>
        run(() => scanInfoAction({ code: sku }), {
          onOk: (r) => {
            if (r.type !== "product") return scanError("SKU no encontrado");
            run(() => slotLimitsAction({ locationId, productId: r.id, minQty: toNum(f.get("min")), maxQty: toNum(f.get("max")) }), { success: `${r.sku} asignado`, onOk: () => setSku("") });
          },
        })
      }
    >
      <Field label="SKU" className="col-span-3"><Input value={sku} onChange={(e) => setSku(e.target.value)} required className="font-mono" /></Field>
      <Field label="Mínimo"><Input name="min" type="number" min={0} className="font-mono" /></Field>
      <Field label="Máximo"><Input name="max" type="number" min={0} className="font-mono" /></Field>
      <Button type="submit" pending={pending} className="self-end">Asignar</Button>
    </form>
  );
}
