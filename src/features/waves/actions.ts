"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { assignWave, cancelWave, closeWave, confirmPick, createWave, startWave } from "./service";

const id = z.string().min(1).max(40);
const done = () => revalidatePath("/", "layout");

export const createWaveAction = action(
  "SUPERVISOR",
  z.object({ orderIds: z.array(id).min(1, "Selecciona pedidos").max(200), assignedUserId: id.nullable() }),
  async ({ orderIds, assignedUserId }, user) => {
    const wave = await createWave(orderIds, assignedUserId, user.id);
    done();
    return wave;
  },
);

export const startWaveAction = action("OPERATOR", z.object({ id }), async ({ id }, user) => {
  await startWave(id, user.id);
  done();
});

export const confirmPickAction = action(
  "OPERATOR",
  z.object({ taskId: id, qty: z.coerce.number().int().min(0).max(100000), short: z.boolean() }),
  async ({ taskId, qty, short }, user) => {
    const res = await confirmPick(taskId, qty, short, user.id);
    done();
    return res;
  },
);

export const cancelWaveAction = action("SUPERVISOR", z.object({ id }), async ({ id }, user) => {
  await cancelWave(id, user.id);
  done();
});

export const assignWaveAction = action("SUPERVISOR", z.object({ id, userId: id.nullable() }), async ({ id, userId }) => {
  await assignWave(id, userId);
  done();
});

export const closeWaveAction = action("SUPERVISOR", z.object({ id }), async ({ id }) => {
  await closeWave(id);
  done();
});
