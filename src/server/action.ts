import "server-only";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { assertRole, AuthError, type CurrentUser } from "./auth/current";
import { UserError } from "./errors";

import type { ActionResult } from "@/lib/action-result";
export type { ActionResult };

/**
 * Wraps a server action: checks the role, re-validates input with zod, and maps
 * known errors to a Spanish message. Unknown errors are logged and hidden.
 */
export function action<S extends z.ZodType, T>(
  role: Role,
  schema: S,
  fn: (input: z.infer<S>, user: CurrentUser) => Promise<T>,
) {
  return async (raw: z.input<S>): Promise<ActionResult<T>> => {
    try {
      const user = await assertRole(role);
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
      return { ok: true, data: await fn(parsed.data, user) };
    } catch (e) {
      return { ok: false, error: toMessage(e) };
    }
  };
}

export function toMessage(e: unknown): string {
  if (e instanceof UserError || e instanceof AuthError) return e.message;
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return "Ya existe un registro con ese valor (duplicado).";
    if (e.code === "P2003") return "No se puede: hay registros que dependen de este.";
    if (e.code === "P2025") return "Registro no encontrado o cambió mientras tanto.";
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("StockLevel_qty_nonnegative")) return "No hay stock suficiente en esa ubicación.";
  console.error(e);
  return "Error inesperado. Intenta de nuevo.";
}
