"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { createUserAction, resetPasswordAction, updateUserAction } from "./actions";

function RoleSelect({ defaultValue = "OPERATOR" }: { defaultValue?: Role }) {
  return (
    <Select name="role" defaultValue={defaultValue}>
      <option value="OPERATOR">Operador</option>
      <option value="SUPERVISOR">Supervisor</option>
      <option value="ADMIN">Administrador</option>
    </Select>
  );
}

export function NewUser() {
  const [open, setOpen] = useState(false);
  const [pending, run] = useAction();
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-4" /> Nuevo usuario</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo usuario" side>
        <form
          className="space-y-3"
          action={(form) => {
            const f = Object.fromEntries(form) as Record<string, string>;
            run(() => createUserAction({ name: f.name, email: f.email, role: f.role as Role, password: f.password }), { success: "Usuario creado", onOk: () => setOpen(false) });
          }}
        >
          <Field label="Nombre"><Input name="name" required maxLength={120} /></Field>
          <Field label="Correo"><Input name="email" type="email" required /></Field>
          <Field label="Rol"><RoleSelect /></Field>
          <Field label="Contraseña inicial" hint="Mínimo 8 caracteres"><Input name="password" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <Button type="submit" variant="primary" pending={pending} className="w-full">Crear</Button>
        </form>
      </Dialog>
    </>
  );
}

export function UserRow({ user }: { user: { id: string; name: string; email: string; role: Role; active: boolean } }) {
  const [open, setOpen] = useState(false);
  const [pending, run] = useAction();
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Editar</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={user.email} side>
        <form
          className="space-y-3"
          action={(form) =>
            run(() => updateUserAction({ id: user.id, name: String(form.get("name")), role: form.get("role") as Role, active: form.get("active") === "on" }), { success: "Usuario actualizado", onOk: () => setOpen(false) })
          }
        >
          <Field label="Nombre"><Input name="name" required defaultValue={user.name} /></Field>
          <Field label="Rol"><RoleSelect defaultValue={user.role} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={user.active} className="size-4 accent-[var(--accent)]" /> Activo (puede ingresar)</label>
          <Button type="submit" variant="primary" pending={pending} className="w-full">Guardar</Button>
        </form>
        <form
          className="mt-6 space-y-3 border-t border-border pt-4"
          action={(form) => run(() => resetPasswordAction({ id: user.id, password: String(form.get("password")) }), { success: "Contraseña cambiada" })}
        >
          <Field label="Nueva contraseña"><Input name="password" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <Button type="submit" pending={pending} className="w-full">Cambiar contraseña</Button>
        </form>
      </Dialog>
    </>
  );
}
