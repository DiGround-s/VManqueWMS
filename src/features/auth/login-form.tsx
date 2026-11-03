"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { login } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);
  return (
    <Card className="p-5">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Correo">
          <Input name="email" type="email" autoComplete="username" required autoFocus className="h-12 text-base" />
        </Field>
        <Field label="Contraseña">
          <Input name="password" type="password" autoComplete="current-password" required className="h-12 text-base" />
        </Field>
        {state?.error && <p className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>}
        <Button type="submit" variant="primary" size="lg" pending={pending}>
          Ingresar
        </Button>
      </form>
    </Card>
  );
}
