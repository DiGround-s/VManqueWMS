"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { useAction } from "@/lib/use-action";
import { fmtDateTime } from "@/lib/format";
import { createWaveAction } from "./actions";

type Row = { id: string; code: string; customerName: string; commune: string; carrier: string | null; priority: number; createdAt: string; lines: number; units: number };

export function WaveCreator({ orders, operators, limit }: { orders: Row[]; operators: { id: string; name: string }[]; limit: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [operator, setOperator] = useState("");
  const [pending, run] = useAction();

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const all = selected.size === orders.length && orders.length > 0;
  const units = orders.filter((o) => selected.has(o.id)).reduce((n, o) => n + o.units, 0);

  if (orders.length === 0) return <Card><EmptyState title="No hay pedidos pendientes con estos filtros" /></Card>;

  return (
    <Card>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-panel px-4 py-3">
        <span className="font-mono text-sm"><b>{selected.size}</b> pedidos · <b>{units}</b> unidades</span>
        <Select value={operator} onChange={(e) => setOperator(e.target.value)} className="ml-auto w-56" aria-label="Operador">
          <option value="">Sin asignar (la toma quien llegue)</option>
          {operators.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
        <Button
          variant="primary"
          disabled={selected.size === 0}
          pending={pending}
          onClick={() =>
            run(() => createWaveAction({ orderIds: orders.filter((o) => selected.has(o.id)).map((o) => o.id), assignedUserId: operator || null }), {
              success: (w) => `Ola ${w.code} creada${w.shortUnits ? ` · faltan ${w.shortUnits} u. en estantería` : ""}`,
              onOk: (w) => router.push(`/olas/${w.code}`),
            })
          }
        >
          Crear ola
        </Button>
      </div>
      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={all} onChange={() => setSelected(all ? new Set() : new Set(orders.map((o) => o.id)))} aria-label="Seleccionar todos" />
            </Th>
            <Th>Pedido</Th><Th>Cliente</Th><Th>Comuna</Th><Th>Transporte</Th><Th className="text-right">Líneas</Th><Th className="text-right">Unidades</Th><Th>Ingreso</Th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <Tr key={o.id} className="cursor-pointer" onClick={() => toggle(o.id)}>
              <Td><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={selected.has(o.id)} onChange={() => toggle(o.id)} onClick={(e) => e.stopPropagation()} aria-label={o.code} /></Td>
              <Td><Mono className="font-semibold">{o.code}</Mono>{o.priority > 0 && <span className="ml-1.5 font-mono text-xs text-accent-strong">P{o.priority}</span>}</Td>
              <Td>{o.customerName}</Td>
              <Td className="text-muted">{o.commune}</Td>
              <Td className="text-muted">{o.carrier ?? "—"}</Td>
              <Td className="text-right"><Mono>{o.lines}</Mono></Td>
              <Td className="text-right"><Mono>{o.units}</Mono></Td>
              <Td className="text-muted">{fmtDateTime(o.createdAt)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {orders.length >= limit && <p className="px-4 py-2 text-xs text-muted">Se muestran los primeros {limit}. Filtra para ver otros.</p>}
    </Card>
  );
}
