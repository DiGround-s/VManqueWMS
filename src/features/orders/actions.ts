"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { assertRole } from "@/server/auth/current";
import { toMessage } from "@/server/action";
import { readSheet } from "@/server/sheet";
import { db } from "@/server/db";
import type { ActionResult } from "@/lib/action-result";
import { orderInput } from "./schema";
import { cancelOrder, createOrder, insertOrder, productsBySku, releaseFromWave } from "./service";
import { groupOrderRows, type ImportGroup } from "./import";

const id = z.string().min(1).max(40);

export const createOrderAction = action("SUPERVISOR", orderInput, async (input, user) => {
  const order = await createOrder(input, "MANUAL", user.id);
  revalidatePath("/", "layout");
  return { code: order.code, created: order.created };
});

export const cancelOrderAction = action("SUPERVISOR", z.object({ id, reason: z.string().trim().min(3, "Indica el motivo").max(300) }), async ({ id, reason }, user) => {
  const res = await cancelOrder(id, user.id, reason);
  revalidatePath("/", "layout");
  return res;
});

export const releaseOrderAction = action("SUPERVISOR", z.object({ id }), async ({ id }, user) => {
  await releaseFromWave(id, user.id);
  revalidatePath("/", "layout");
});

export type ImportPreview = { groups: (ImportGroup & { exists?: string })[]; valid: number };

/** Parses the upload and checks SKUs and existing refs; nothing is written. */
export async function previewOrderImport(form: FormData): Promise<ActionResult<ImportPreview>> {
  try {
    await assertRole("SUPERVISOR");
    const groups: ImportPreview["groups"] = groupOrderRows(await readSheet(form.get("file")));
    if (groups.length === 0) return { ok: false, error: "El archivo no tiene filas" };
    const skus = [...new Set(groups.flatMap((g) => g.order?.lines.map((l) => l.sku) ?? []))];
    const refs = groups.map((g) => g.ref);
    const [products, existing] = await Promise.all([
      db.product.findMany({ where: { sku: { in: skus }, active: true }, select: { sku: true } }),
      db.order.findMany({ where: { externalRef: { in: refs } }, select: { externalRef: true, code: true } }),
    ]);
    const known = new Set(products.map((p) => p.sku));
    const existingByRef = new Map(existing.map((o) => [o.externalRef!, o.code]));
    for (const g of groups) {
      const missing = g.order?.lines.filter((l) => !known.has(l.sku)).map((l) => l.sku) ?? [];
      if (missing.length) g.errors.push(`SKU desconocido: ${missing.join(", ")}`);
      g.exists = existingByRef.get(g.ref);
    }
    return { ok: true, data: { groups, valid: groups.filter((g) => g.order && !g.errors.length && !g.exists).length } };
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
}

/** Creates every valid order in one transaction. Refs that already exist are skipped (idempotent). */
export const confirmOrderImport = action("SUPERVISOR", z.object({ orders: z.array(orderInput).min(1).max(2000) }), async ({ orders }, user) => {
  const refs = orders.map((o) => o.externalRef).filter((r): r is string => !!r);
  const existing = new Set((await db.order.findMany({ where: { externalRef: { in: refs } }, select: { externalRef: true } })).map((o) => o.externalRef));
  const todo = orders.filter((o) => !o.externalRef || !existing.has(o.externalRef));
  await db.$transaction(
    async (tx) => {
      const products = await productsBySku(tx, todo.flatMap((o) => o.lines.map((l) => l.sku)));
      // ponytail: one insert per order (nested lines need it); fine for a few thousand rows.
      for (const o of todo) await insertOrder(tx, o, "IMPORT", user.id, products);
    },
    { timeout: 60_000 },
  );
  revalidatePath("/", "layout");
  return { created: todo.length, skipped: orders.length - todo.length };
});
