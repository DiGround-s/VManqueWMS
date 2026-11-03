"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";

export function NewApiKey() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [pending, run] = useAction();
  const close = () => (setOpen(false), setKey(null));
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-4" /> Nueva API key</Button>
      <Dialog open={open} onClose={close} title="Nueva API key">
        {key ? (
          <div className="space-y-3">
            <p className="text-sm">Cópiala ahora. <b>No se vuelve a mostrar</b>: sólo guardamos su huella.</p>
            <Input readOnly value={key} className="font-mono" onFocus={(e) => e.currentTarget.select()} autoFocus />
            <Button className="w-full" onClick={close}>Listo</Button>
          </div>
        ) : (
          <form className="space-y-3" action={(f) => run(() => createApiKeyAction({ name: String(f.get("name")) }), { onOk: (d) => setKey(d.key) })}>
            <Field label="Nombre" hint="Para saber qué sistema la usa"><Input name="name" required maxLength={80} autoFocus placeholder="Tienda web" /></Field>
            <Button type="submit" variant="primary" pending={pending} className="w-full">Crear</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}

export function RevokeKey({ id }: { id: string }) {
  const [pending, run] = useAction();
  return (
    <Button size="sm" variant="danger" pending={pending} onClick={() => confirm("¿Revocar esta key? Los sistemas que la usan dejarán de funcionar.") && run(() => revokeApiKeyAction({ id }), { success: "Key revocada" })}>
      Revocar
    </Button>
  );
}
