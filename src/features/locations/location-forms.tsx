"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { createLocationAction, generateLocationsAction } from "./actions";

type Wh = { id: string; code: string; name: string };

function WarehouseField({ warehouses }: { warehouses: Wh[] }) {
  return (
    <Field label="Bodega">
      <Select name="warehouseId" defaultValue={warehouses[0]?.id}>
        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
      </Select>
    </Field>
  );
}

function RoleField({ defaultValue = "PICK" }: { defaultValue?: string }) {
  return (
    <Field label="Uso">
      <Select name="role" defaultValue={defaultValue}>
        <option value="PICK">Picking</option>
        <option value="RESERVE">Reserva</option>
        <option value="DOCK">Andén</option>
      </Select>
    </Field>
  );
}

export function LocationGenerator({ warehouses }: { warehouses: Wh[] }) {
  const [pending, run] = useAction();
  const [count, setCount] = useState(0);
  const range = (name: string, label: string, to: number) => (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <Input name={`${name}From`} type="number" min={1} max={99} defaultValue={1} className="w-20 font-mono" aria-label={`${label} desde`} />
        <span className="text-muted">a</span>
        <Input name={`${name}To`} type="number" min={1} max={99} defaultValue={to} className="w-20 font-mono" aria-label={`${label} hasta`} />
      </div>
    </Field>
  );
  return (
    <Card>
      <CardHeader title="Generar en bloque" />
      <form
        className="grid gap-4 p-4 sm:grid-cols-2"
        onChange={(e) => {
          const f = new FormData(e.currentTarget);
          const n = (k: string) => Math.max(0, Number(f.get(`${k}To`)) - Number(f.get(`${k}From`)) + 1);
          setCount(n("aisle") * n("rack") * n("level"));
        }}
        action={(form) => {
          const f = Object.fromEntries(form) as Record<string, string>;
          run(
            () =>
              generateLocationsAction({
                warehouseId: f.warehouseId, zone: f.zone, role: f.role as "PICK",
                aisleFrom: Number(f.aisleFrom), aisleTo: Number(f.aisleTo), rackFrom: Number(f.rackFrom), rackTo: Number(f.rackTo), levelFrom: Number(f.levelFrom), levelTo: Number(f.levelTo),
              }),
            { success: (d) => `${d.created} ubicaciones creadas${d.skipped ? ` · ${d.skipped} ya existían` : ""}` },
          );
        }}
      >
        <WarehouseField warehouses={warehouses} />
        <Field label="Zona"><Input name="zone" defaultValue="A" maxLength={3} className="w-24 font-mono uppercase" required /></Field>
        {range("aisle", "Pasillos", 3)}
        {range("rack", "Racks", 10)}
        {range("level", "Niveles", 4)}
        <RoleField />
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <span className="text-sm text-muted">{count ? `${count} ubicaciones` : "Ajusta los rangos"}</span>
          <Button type="submit" variant="primary" pending={pending}>Generar</Button>
        </div>
      </form>
    </Card>
  );
}

export function SingleLocationForm({ warehouses }: { warehouses: Wh[] }) {
  const [pending, run] = useAction();
  return (
    <Card>
      <CardHeader title="Ubicación suelta (andén, devoluciones…)" />
      <form
        className="grid gap-4 p-4"
        action={(form) => {
          const f = Object.fromEntries(form) as Record<string, string>;
          run(() => createLocationAction({ warehouseId: f.warehouseId, code: f.code, zone: f.zone, role: f.role as "DOCK", sortKey: Number(f.sortKey || 0) }), { success: `Ubicación ${f.code.toUpperCase()} creada` });
        }}
      >
        <WarehouseField warehouses={warehouses} />
        <Field label="Código"><Input name="code" required placeholder="ANDEN-2" className="font-mono uppercase" /></Field>
        <Field label="Zona"><Input name="zone" required defaultValue="DOCK" className="font-mono uppercase" /></Field>
        <RoleField defaultValue="DOCK" />
        <Field label="Orden de ruta" hint="Número menor = se visita antes"><Input name="sortKey" type="number" min={0} defaultValue={0} className="font-mono" /></Field>
        <Button type="submit" pending={pending}>Crear</Button>
      </form>
    </Card>
  );
}
