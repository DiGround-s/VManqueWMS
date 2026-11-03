"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ScanInput } from "@/components/ui/scan-input";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAction } from "@/lib/use-action";
import { beep, scanError } from "@/lib/beep";
import { cn } from "@/lib/cn";
import { scanInfoAction } from "@/features/scan/actions";
import { adjustAction, countAction } from "./actions";

type Row = { productId: string; sku: string; name: string; expected: number; counted: string; added?: boolean };

/**
 * Count (operator) or adjust (supervisor, with a reason) the contents of one location.
 * Only rows whose counted quantity differs produce ADJUSTMENT movements.
 */
export function LocationCounter({ mode, phone }: { mode: "count" | "adjust"; phone?: boolean }) {
  const [loc, setLoc] = useState<{ id: string; code: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");
  const [pending, run] = useAction();

  function scanLocation(code: string) {
    run(() => scanInfoAction({ code }), {
      onOk: (r) => {
        if (r.type !== "location") return scanError("Eso no es una ubicación");
        beep(true);
        setLoc({ id: r.id, code: r.code });
        setRows(r.contents.map((c) => ({ productId: c.productId, sku: c.sku, name: c.name, expected: c.qty, counted: mode === "count" ? "" : String(c.qty) })));
      },
    });
  }

  function scanProduct(code: string) {
    run(() => scanInfoAction({ code }), {
      onOk: (r) => {
        if (r.type !== "product") return scanError("Eso no es un producto");
        beep(true);
        setRows((rs) => {
          const i = rs.findIndex((x) => x.productId === r.id);
          if (i >= 0) return rs.map((x, j) => (j === i ? { ...x, counted: String((Number(x.counted) || 0) + 1) } : x));
          return [{ productId: r.id, sku: r.sku, name: r.name, expected: 0, counted: "1", added: true }, ...rs];
        });
      },
    });
  }

  function submit() {
    if (!loc) return;
    const entries = rows.filter((r) => r.counted !== "").map((r) => ({ productId: r.productId, expected: r.expected, counted: Number(r.counted) }));
    if (mode === "count" && entries.length !== rows.length) return void alertMissing();
    const call = mode === "count" ? () => countAction({ locationId: loc.id, entries }) : () => adjustAction({ locationId: loc.id, entries, note });
    run(call, {
      success: (d) => (d.changed ? `${d.changed} diferencias ajustadas en ${loc.code}` : `${loc.code} cuadra, sin cambios`),
      onOk: () => {
        setLoc(null);
        setRows([]);
        setNote("");
      },
    });
  }
  const alertMissing = () => window.alert("Ingresa la cantidad contada de cada producto (0 si no hay).");
  const set = (i: number, counted: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, counted } : r)));

  if (!loc) return <ScanInput onScan={scanLocation} pending={pending} size={phone ? "xl" : "md"} label="Ubicación" placeholder="Escanea la ubicación" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-mono text-3xl font-bold">{loc.code}</div>
        <Button variant="ghost" onClick={() => setLoc(null)}>Cambiar</Button>
      </div>
      <ScanInput onScan={scanProduct} pending={pending} size={phone ? "xl" : "md"} placeholder="Escanea productos (+1 cada uno)" autoFocus={false} />
      {rows.length === 0 && <p className="text-muted">La ubicación está vacía. Escanea lo que encuentres.</p>}
      <ul className="space-y-2">
        {rows.map((r, i) => {
          const diff = r.counted === "" ? null : Number(r.counted) - r.expected;
          return (
            <li key={r.productId} className="flex items-center gap-3 rounded-md border border-border bg-panel p-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-semibold">{r.sku} {r.added && <Badge tone="info">nuevo</Badge>}</div>
                <div className={cn("truncate", phone && "text-lg")}>{r.name}</div>
                {mode === "adjust" && <div className="text-xs text-muted">Sistema: {r.expected}</div>}
                {diff != null && diff !== 0 && <div className={cn("font-mono text-sm", diff > 0 ? "text-success" : "text-danger")}>{diff > 0 ? `+${diff}` : diff}</div>}
              </div>
              {phone && <Button size="lg" onClick={() => set(i, String(Math.max(0, (Number(r.counted) || 0) - 1)))} aria-label="Menos"><Minus /></Button>}
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={r.counted}
                onChange={(e) => set(i, e.target.value)}
                className={cn("text-center font-mono", phone ? "h-14 w-20 text-2xl" : "w-24")}
                aria-label={`Cantidad contada ${r.sku}`}
              />
              {phone && <Button size="lg" onClick={() => set(i, String((Number(r.counted) || 0) + 1))} aria-label="Más"><Plus /></Button>}
            </li>
          );
        })}
      </ul>
      {mode === "adjust" && <Field label="Motivo del ajuste"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Merma, rotura, error de conteo…" /></Field>}
      <Button variant="primary" size={phone ? "xl" : "lg"} pending={pending} disabled={rows.length === 0} onClick={submit}>
        {mode === "count" ? "Confirmar conteo" : "Guardar ajuste"}
      </Button>
    </div>
  );
}
