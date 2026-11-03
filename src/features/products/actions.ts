"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action, toMessage } from "@/server/action";
import { assertRole } from "@/server/auth/current";
import { db } from "@/server/db";
import { readSheet } from "@/server/sheet";
import type { ActionResult } from "@/lib/action-result";
import { productInput, type ProductInput } from "./schema";

export const createProductAction = action("SUPERVISOR", productInput, async (data) => {
  const p = await db.product.create({ data, select: { id: true } });
  revalidatePath("/", "layout");
  return p;
});

export const updateProductAction = action("SUPERVISOR", productInput.extend({ id: z.string().min(1).max(40) }), async ({ id, ...data }) => {
  await db.product.update({ where: { id }, data });
  revalidatePath("/", "layout");
});

export type ProductImportRow = { row: number; data: ProductInput | null; error?: string; exists: boolean };

/** Columns: sku, name, barcode (optional), image (optional). Existing SKUs are updated. */
export async function previewProductImport(form: FormData): Promise<ActionResult<ProductImportRow[]>> {
  try {
    await assertRole("SUPERVISOR");
    const rows = await readSheet(form.get("file"));
    const parsed = rows.map((r, i): ProductImportRow => {
      const p = productInput.safeParse({ sku: r.sku, name: r.name ?? r.nombre, barcode: r.barcode, imageUrl: r.image ?? r.imagen ?? "" });
      return p.success ? { row: i + 2, data: p.data, exists: false } : { row: i + 2, data: null, error: p.error.issues[0]?.message, exists: false };
    });
    const skus = parsed.flatMap((p) => (p.data ? [p.data.sku] : []));
    const seen = new Set<string>();
    for (const p of parsed) {
      if (!p.data) continue;
      if (seen.has(p.data.sku)) p.error = "SKU repetido en el archivo";
      seen.add(p.data.sku);
    }
    const existing = new Set((await db.product.findMany({ where: { sku: { in: skus } }, select: { sku: true } })).map((p) => p.sku));
    for (const p of parsed) if (p.data) p.exists = existing.has(p.data.sku);
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: toMessage(e) };
  }
}

export const confirmProductImport = action("SUPERVISOR", z.object({ products: z.array(productInput).min(1).max(5000) }), async ({ products }) => {
  await db.$transaction(
    // ponytail: one upsert per row; fine for catalogues of a few thousand SKUs.
    products.map((p) => db.product.upsert({ where: { sku: p.sku }, create: p, update: { name: p.name, barcode: p.barcode, ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}) } })),
  );
  revalidatePath("/", "layout");
  return { count: products.length };
});
