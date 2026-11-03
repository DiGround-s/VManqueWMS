"use server";

import { z } from "zod";
import { action } from "@/server/action";
import { shipScan } from "./service";

export const shipScanAction = action("OPERATOR", z.object({ code: z.string().trim().min(1).max(120) }), async ({ code }, user) => shipScan(code, user.id));
