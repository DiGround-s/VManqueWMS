import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "@/server/db";
import { SESSION_COOKIE, verifySession } from "./session";

export type CurrentUser = { id: string; name: string; email: string; role: Role };

const RANK: Record<Role, number> = { OPERATOR: 0, SUPERVISOR: 1, ADMIN: 2 };
export const hasRole = (user: { role: Role }, min: Role) => RANK[user.role] >= RANK[min];

/** Reads the session and re-checks the user in the DB (active + current role), once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user?.active) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

export class AuthError extends Error {}

/** For server actions and services: throws instead of redirecting. */
export async function assertRole(min: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sesión expirada. Vuelve a ingresar.");
  if (!hasRole(user, min)) throw new AuthError("No tienes permiso para esta acción.");
  return user;
}

/** For pages: redirects to login or to the dashboard. */
export async function requirePageRole(min: Role = "OPERATOR"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user, min)) redirect("/?denied=1");
  return user;
}
