"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";
import { UserError } from "@/server/errors";
import { connectStore, pollStore, STORE_CHANNELS } from "./connectors";

const channel = z.enum(STORE_CHANNELS as [string, ...string[]]).transform((c) => c as (typeof STORE_CHANNELS)[number]);

export const connectStoreAction = action(
  "ADMIN",
  z.object({ channel, id: z.string().trim().min(1, "Falta el identificador").max(120), secret: z.string().trim().min(1, "Falta la clave").max(300) }),
  async ({ channel: c, id, secret }) => {
    try {
      await connectStore(c, id, secret);
    } catch (e) {
      throw new UserError(`La tienda rechazó las credenciales: ${e instanceof Error ? e.message : String(e)}`);
    }
    revalidatePath("/ajustes");
    return { ok: true };
  },
);

export const syncStoreAction = action("SUPERVISOR", z.object({ channel }), async ({ channel: c }) => {
  const r = await pollStore(c);
  revalidatePath("/", "layout");
  return r;
});

export const disconnectStoreAction = action("ADMIN", z.object({ channel }), async ({ channel: c }) => {
  await db.marketplaceAccount.deleteMany({ where: { channel: c } });
  revalidatePath("/ajustes");
  return { ok: true };
});
