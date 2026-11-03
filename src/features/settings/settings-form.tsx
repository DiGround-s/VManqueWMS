"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { saveSettingsAction } from "./actions";

export function SettingsForm({ companyName }: { companyName: string }) {
  const [pending, run] = useAction();
  return (
    <Card className="max-w-md p-4">
      <form className="space-y-3" action={(f) => run(() => saveSettingsAction({ companyName: String(f.get("companyName")) }), { success: "Ajustes guardados" })}>
        <Field label="Nombre de la empresa" hint="Aparece en las etiquetas de envío y en el menú"><Input name="companyName" defaultValue={companyName} required maxLength={80} /></Field>
        <Button type="submit" variant="primary" pending={pending}>Guardar</Button>
      </form>
    </Card>
  );
}
