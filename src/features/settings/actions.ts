"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";

export const saveSettingsAction = action("ADMIN", z.object({ companyName: z.string().trim().min(1, "Falta el nombre").max(80) }), async ({ companyName }) => {
  await db.setting.upsert({ where: { key: "companyName" }, create: { key: "companyName", value: companyName }, update: { value: companyName } });
  revalidatePath("/", "layout");
});
