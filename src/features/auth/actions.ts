"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/server/auth/session";
import { blockedMinutes, clearFails, recordFail } from "@/server/auth/login-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "Ingresa la contraseña").max(200),
  next: z.string().optional(),
});

// Same cost as real hashes so a missing user takes as long as a wrong password.
const DUMMY_HASH = "$2b$10$68HcYPUdv0QXMYLoqpt4kuc4IMZPvwHjIiUgIT5s8F28rpeixHUQC";

export async function login(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { email, password, next } = parsed.data;

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "local";
  const keys = [`email:${email}`, `ip:${ip}`];
  const wait = blockedMinutes(keys);
  if (wait > 0) return { error: `Demasiados intentos fallidos. Espera ${wait} min antes de volver a intentar.` };

  const user = await db.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.active) {
    recordFail(keys);
    return { error: "Correo o contraseña incorrectos" };
  }
  clearFails([`email:${email}`]);

  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  const ua = hdrs.get("user-agent") ?? "";
  const phone = /Android|iPhone|iPod|Mobile/i.test(ua);
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safeNext ?? (phone ? "/m" : "/"));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
