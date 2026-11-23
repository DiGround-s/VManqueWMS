"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { createDemoWave, demoState, resetDemo } from "./service";

const done = () => revalidatePath("/", "layout");

export const startDemoAction = action("SUPERVISOR", z.object({}), async (_, user) => {
  await resetDemo(user.id);
  done();
});

export const demoWaveAction = action("SUPERVISOR", z.object({}), async (_, user) => {
  await createDemoWave(user.id);
  done();
});

/** Polled by the guide on the PC and the banner on the phone. */
export const demoStateAction = action("OPERATOR", z.object({}), async () => demoState());
