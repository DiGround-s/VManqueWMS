"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";
import { nextCode } from "@/server/codes";
import { UserError } from "@/server/errors";
import { applyMovement } from "@/server/inventory/stock";

const id = z.string().min(1).max(40);
const done = () => revalidatePath("/", "layout");

export const createReceptionAction = action(
  "SUPERVISOR",
  z.object({ supplier: z.string().trim().max(120).optional(), note: z.string().trim().max(500).optional() }),
  async (i, user) => {
    const r = await db.$transaction(async (tx) =>
      tx.reception.create({ data: { code: await nextCode(tx, "reception"), supplier: i.supplier || null, note: i.note || null, createdById: user.id }, select: { code: true } }),
    );
    done();
    return r;
  },
);

async function assertDraft(receptionId: string) {
  const r = await db.reception.findUnique({ where: { id: receptionId }, select: { status: true } });
  if (r?.status !== "DRAFT") throw new UserError("La recepción ya fue confirmada");
}

export const addReceptionLineAction = action(
  "SUPERVISOR",
  z.object({ receptionId: id, productId: id, locationId: id, qty: z.coerce.number().int().min(1).max(1_000_000) }),
  async (i) => {
    await assertDraft(i.receptionId);
    await db.receptionLine.create({ data: i });
    done();
  },
);

export const removeReceptionLineAction = action("SUPERVISOR", z.object({ receptionId: id, lineId: id }), async ({ receptionId, lineId }) => {
  await assertDraft(receptionId);
  await db.receptionLine.deleteMany({ where: { id: lineId, receptionId } });
  done();
});

/** Confirms once: each line becomes a RECEIPT movement into its location. */
export const confirmReceptionAction = action("SUPERVISOR", z.object({ id }), async ({ id }, user) => {
  await db.$transaction(async (tx) => {
    const res = await tx.reception.updateMany({ where: { id, status: "DRAFT" }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
    if (!res.count) throw new UserError("La recepción ya fue confirmada");
    const r = await tx.reception.findUniqueOrThrow({ where: { id }, select: { code: true, lines: { select: { productId: true, locationId: true, qty: true } } } });
    if (r.lines.length === 0) throw new UserError("La recepción no tiene líneas");
    for (const l of r.lines) await applyMovement(tx, { type: "RECEIPT", productId: l.productId, qty: l.qty, toLocationId: l.locationId, reference: r.code, userId: user.id });
  });
  done();
});
