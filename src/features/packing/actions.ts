"use server";

import { z } from "zod";
import { action } from "@/server/action";
import { openPacking, packScan } from "./service";

export const openPackingAction = action(
  "OPERATOR",
  z.object({ code: z.string().trim().min(1).max(120), slot: z.coerce.number().int().min(1).max(999).optional() }),
  async ({ code, slot }) => openPacking(code, slot),
);

export const packScanAction = action("OPERATOR", z.object({ orderId: z.string().min(1).max(40), code: z.string().trim().min(1).max(120) }), async ({ orderId, code }, user) =>
  packScan(orderId, code, user.id),
);
