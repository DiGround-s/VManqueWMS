"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";
import { pollOrders } from "./mercadolibre/sync";

/** Forgets the stored tokens. On Mercado Libre the seller can also revoke the app from their account. */
export const disconnectMlAction = action("ADMIN", z.object({}), async () => {
  await db.marketplaceAccount.deleteMany({ where: { channel: "MERCADOLIBRE" } });
  revalidatePath("/ajustes");
  return { ok: true };
});

/** Backup to the notifications: asks Mercado Libre for recent sales and retries notices that failed. */
export const syncMlAction = action("SUPERVISOR", z.object({}), async () => {
  const r = await pollOrders();
  revalidatePath("/", "layout");
  return r;
});
