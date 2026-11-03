import "server-only";
import { cache } from "react";
import { db } from "@/server/db";

export const DEFAULT_COMPANY = "VManque";

export const getCompanyName = cache(async () => (await db.setting.findUnique({ where: { key: "companyName" } }))?.value ?? DEFAULT_COMPANY);
