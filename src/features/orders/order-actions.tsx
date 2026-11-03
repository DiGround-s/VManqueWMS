"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { cancelOrderAction, releaseOrderAction } from "./actions";

export function OrderActions({ id, canCancel, canRelease }: { id: string; canCancel: boolean; canRelease: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, run] = useAction();
  return (
    <>
      {canRelease && (
        <Button pending={pending} onClick={() => run(() => releaseOrderAction({ id }), { success: "Pedido liberado: queda pendiente para otra ola" })}>
          Liberar de la ola
        </Button>
      )}
      {canCancel && <Button variant="danger" onClick={() => setOpen(true)}>Cancelar pedido</Button>}
      <Dialog open={open} onClose={() => setOpen(false)} title="Cancelar pedido">
        <p className="mb-3 text-sm text-muted">
          Lo que no se ha recogido se libera. Si ya hay unidades recogidas, quedan en la lista de reposición para devolverlas a una ubicación.
        </p>
        <Field label="Motivo"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus /></Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Volver</Button>
          <Button
            variant="danger"
            pending={pending}
            onClick={() =>
              run(() => cancelOrderAction({ id, reason }), {
                success: (d) => (d.putbacks ? `Cancelado · ${d.putbacks} u. por reponer` : "Pedido cancelado"),
                onOk: () => setOpen(false),
              })
            }
          >
            Cancelar pedido
          </Button>
        </div>
      </Dialog>
    </>
  );
}
