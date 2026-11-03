"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";
import { UserError } from "@/server/errors";
import { hashApiKey } from "@/server/api-auth";

const id = z.string().min(1).max(40);
const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200);
const role = z.enum(["ADMIN", "SUPERVISOR", "OPERATOR"]);
const done = () => revalidatePath("/", "layout");

export const createUserAction = action(
  "ADMIN",
  z.object({ email: z.string().trim().toLowerCase().email("Correo inválido"), name: z.string().trim().min(1).max(120), role, password }),
  async ({ password, ...data }) => {
    await db.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
    done();
  },
);

export const updateUserAction = action("ADMIN", z.object({ id, name: z.string().trim().min(1).max(120), role, active: z.boolean() }), async ({ id, ...data }, me) => {
  if (id === me.id && (data.role !== "ADMIN" || !data.active)) throw new UserError("No puedes quitarte el rol de administrador ni desactivarte");
  await db.user.update({ where: { id }, data });
  done();
});

export const resetPasswordAction = action("ADMIN", z.object({ id, password }), async ({ id, password }) => {
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
});

export const changeOwnPasswordAction = action("OPERATOR", z.object({ current: z.string().min(1).max(200), password }), async ({ current, password }, me) => {
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
  if (!(await bcrypt.compare(current, user.passwordHash))) throw new UserError("La contraseña actual no es correcta");
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
});

/** The plain key is returned only here, once. Only its sha256 is stored. */
export const createApiKeyAction = action("ADMIN", z.object({ name: z.string().trim().min(1, "Ponle un nombre").max(80) }), async ({ name }) => {
  const key = `vmk_${randomBytes(24).toString("base64url")}`;
  await db.apiKey.create({ data: { name, keyHash: hashApiKey(key), prefix: key.slice(0, 10) } });
  done();
  return { key };
});

export const revokeApiKeyAction = action("ADMIN", z.object({ id }), async ({ id }) => {
  await db.apiKey.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  done();
});
