"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { login } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Correo">
        <Input name="email" type="email" autoComplete="username" required autoFocus className="h-12 text-base" placeholder="nombre@vmanque.cl" />
      </Field>
      <Field label="Contraseña">
        <Input name="password" type="password" autoComplete="current-password" required className="h-12 text-base" />
      </Field>
      {state?.error && (
        <p role="alert" className="rounded-md border-2 border-danger/40 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" pending={pending} className="mt-1">
        Ingresar
      </Button>
    </form>
  );
}
