"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";
import { applyCount, completePutback, putaway, receive, setSlotLimits, transfer } from "./service";

const id = z.string().min(1).max(40);
const qty = z.coerce.number().int("Cantidad entera").min(1, "Cantidad mínima 1").max(1_000_000);
const done = () => revalidatePath("/", "layout");

export const receiveAction = action("OPERATOR", z.object({ productId: id, locationId: id, qty }), async (i, user) => {
  await receive(i.productId, i.locationId, i.qty, user.id);
  done();
});

export const putawayAction = action("OPERATOR", z.object({ productId: id, locationId: id, qty }), async (i, user) => {
  await putaway(i.productId, i.locationId, i.qty, user.id);
  done();
});

export const transferAction = action(
  "OPERATOR",
  z.object({ productId: id, fromLocationId: id, toLocationId: id, qty, note: z.string().trim().max(200).optional() }),
  async (i, user) => {
    await transfer(i.productId, i.fromLocationId, i.toLocationId, i.qty, user.id, i.note);
    done();
  },
);

const countEntry = z.object({ productId: id, expected: z.number().int().min(0), counted: z.coerce.number().int().min(0, "No puede ser negativo").max(1_000_000) });

export const countAction = action("OPERATOR", z.object({ locationId: id, entries: z.array(countEntry).min(1).max(500) }), async (i, user) => {
  const res = await applyCount(i.locationId, i.entries, user.id, "Conteo");
  done();
  return res;
});

/** Manual adjustment from the office: same guarded path as a count, one product. */
export const adjustAction = action(
  "SUPERVISOR",
  z.object({ locationId: id, entries: z.array(countEntry).min(1).max(500), note: z.string().trim().min(3, "Indica el motivo del ajuste").max(200) }),
  async (i, user) => {
    const res = await applyCount(i.locationId, i.entries, user.id, `Ajuste: ${i.note}`);
    done();
    return res;
  },
);

export const putbackAction = action("OPERATOR", z.object({ putbackId: id, locationId: id }), async (i, user) => {
  await completePutback(i.putbackId, i.locationId, user.id);
  done();
});

export const slotLimitsAction = action(
  "SUPERVISOR",
  z.object({ locationId: id, productId: id, minQty: z.coerce.number().int().min(0).nullable(), maxQty: z.coerce.number().int().min(0).nullable() }),
  async (i) => {
    await setSlotLimits(i.locationId, i.productId, i.minQty, i.maxQty);
    done();
  },
);

/** Contents of a location, for count/move screens. */
export const locationContentsAction = action("OPERATOR", z.object({ locationId: id }), async ({ locationId }) =>
  db.stockLevel.findMany({
    where: { locationId },
    orderBy: { product: { sku: "asc" } },
    take: 500, // a single shelf slot never holds more
    select: { qty: true, product: { select: { id: true, sku: true, name: true, imageUrl: true } } },
  }),
);
