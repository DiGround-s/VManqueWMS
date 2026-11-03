"use server";

import { z } from "zod";
import { action } from "@/server/action";
import { sortScan } from "./service";

// No revalidatePath: the station keeps its own state and refreshes progress itself.
export const sortScanAction = action("OPERATOR", z.object({ waveId: z.string().min(1).max(40), code: z.string().trim().min(1).max(120) }), async ({ waveId, code }, user) =>
  sortScan(waveId, code, user.id),
);
