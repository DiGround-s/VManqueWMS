"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { changeOwnPasswordAction } from "./actions";

export function AccountForm() {
  const [pending, run] = useAction();
  return (
    <Card className="max-w-md p-4">
      <form
        className="space-y-3"
        action={(f) => {
          if (f.get("password") !== f.get("repeat")) return void run(async () => ({ ok: false as const, error: "Las contraseñas no coinciden" }));
          run(() => changeOwnPasswordAction({ current: String(f.get("current")), password: String(f.get("password")) }), { success: "Contraseña actualizada" });
        }}
      >
        <Field label="Contraseña actual"><Input name="current" type="password" required autoComplete="current-password" /></Field>
        <Field label="Nueva contraseña" hint="Mínimo 8 caracteres"><Input name="password" type="password" required minLength={8} autoComplete="new-password" /></Field>
        <Field label="Repite la nueva"><Input name="repeat" type="password" required minLength={8} autoComplete="new-password" /></Field>
        <Button type="submit" variant="primary" pending={pending}>Cambiar contraseña</Button>
      </form>
    </Card>
  );
}
