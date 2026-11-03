"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { useAction } from "@/lib/use-action";
import { confirmOrderImport, previewOrderImport, type ImportPreview } from "./actions";

export function ImportOrders() {
  const router = useRouter();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [reading, runRead] = useAction();
  const [saving, runSave] = useAction();

  const valid = preview?.groups.filter((g) => g.order && !g.errors.length && !g.exists) ?? [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <form action={(form) => runRead(() => previewOrderImport(form), { onOk: setPreview })} className="flex flex-wrap items-end gap-3">
          <Input type="file" name="file" accept=".xlsx,.xls,.csv" required className="max-w-md py-2 h-auto" />
          <Button type="submit" pending={reading}>Revisar archivo</Button>
          <p className="w-full text-xs text-muted">
            Columnas: <Mono>ref, customer, address, commune, phone, carrier, sku, qty</Mono>. Nada se guarda hasta confirmar.
          </p>
        </form>
      </Card>
      {preview && (
        <Card>
          <CardHeader
            title={`${preview.groups.length} pedidos en el archivo · ${valid.length} listos para crear`}
            action={
              <Button
                variant="primary"
                disabled={valid.length === 0}
                pending={saving}
                onClick={() =>
                  runSave(() => confirmOrderImport({ orders: valid.map((g) => g.order!) }), {
                    success: (d) => `${d.created} pedidos creados${d.skipped ? ` · ${d.skipped} ya existían` : ""}`,
                    onOk: () => router.push("/pedidos?estado=PENDING"),
                  })
                }
              >
                Crear {valid.length} pedidos
              </Button>
            }
          />
          <Table>
            <thead><tr><Th>Fila</Th><Th>Ref</Th><Th>Cliente</Th><Th>Comuna</Th><Th className="text-right">Líneas</Th><Th>Resultado</Th></tr></thead>
            <tbody>
              {preview.groups.map((g) => (
                <Tr key={g.ref} className={g.errors.length ? "bg-danger-bg/50" : undefined}>
                  <Td><Mono>{g.firstRow}</Mono></Td>
                  <Td><Mono>{g.ref}</Mono></Td>
                  <Td>{g.order?.customerName ?? "—"}</Td>
                  <Td className="text-muted">{g.order?.commune ?? "—"}</Td>
                  <Td className="text-right"><Mono>{g.order?.lines.length ?? "—"}</Mono></Td>
                  <Td>
                    {g.errors.length ? (
                      <span className="text-sm text-danger">{g.errors.join(" · ")}</span>
                    ) : g.exists ? (
                      <Badge>Ya existe ({g.exists})</Badge>
                    ) : (
                      <Badge tone="success">OK</Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
