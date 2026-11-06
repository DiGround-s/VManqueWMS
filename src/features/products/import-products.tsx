"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th, Tr, Mono } from "@/components/ui/table";
import { useAction } from "@/lib/use-action";
import { confirmProductImport, previewProductImport, type ProductImportRow } from "./actions";

export function ImportProducts() {
  const router = useRouter();
  const [rows, setRows] = useState<ProductImportRow[] | null>(null);
  const [reading, runRead] = useAction();
  const [saving, runSave] = useAction();
  const valid = rows?.filter((r) => r.data && !r.error) ?? [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <form action={(form) => runRead(() => previewProductImport(form), { onOk: setRows })} className="flex flex-wrap items-end gap-3">
          <Input type="file" name="file" accept=".xlsx,.xls,.csv" required className="h-auto max-w-md py-2" />
          <Button type="submit" pending={reading}>Revisar archivo</Button>
        </form>
      </Card>
      {rows && (
        <Card>
          <CardHeader
            title={`${rows.length} filas · ${valid.length} válidas`}
            action={
              <Button variant="primary" disabled={!valid.length} pending={saving} onClick={() => runSave(() => confirmProductImport({ products: valid.map((r) => ({ ...r.data!, barcode: r.data!.barcode ?? undefined, imageUrl: r.data!.imageUrl ?? "", description: r.data!.description ?? undefined })) }), { success: (d) => `${d.count} productos guardados`, onOk: () => router.push("/productos") })}>
                Guardar {valid.length}
              </Button>
            }
          />
          <Table>
            <thead><tr><Th>Fila</Th><Th>SKU</Th><Th>Nombre</Th><Th>Código de barras</Th><Th>Resultado</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.row} className={r.error ? "bg-danger-bg/50" : undefined}>
                  <Td><Mono>{r.row}</Mono></Td>
                  <Td><Mono>{r.data?.sku ?? "—"}</Mono></Td>
                  <Td>{r.data?.name ?? "—"}</Td>
                  <Td><Mono className="text-muted">{r.data?.barcode ?? "—"}</Mono></Td>
                  <Td>{r.error ? <span className="text-sm text-danger">{r.error}</span> : r.exists ? <Badge tone="info">Se actualiza</Badge> : <Badge tone="success">Nuevo</Badge>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
