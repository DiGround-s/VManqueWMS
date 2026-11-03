"use server";

import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";
import { resolveCode } from "@/server/resolver";
import { stockSummary } from "@/server/inventory/summary";

export type ScanInfo =
  | { type: "location"; id: string; code: string; role: "PICK" | "RESERVE" | "DOCK"; active: boolean; contents: { productId: string; sku: string; name: string; imageUrl: string | null; qty: number }[] }
  | {
      type: "product";
      id: string;
      sku: string;
      name: string;
      barcode: string | null;
      imageUrl: string | null;
      active: boolean;
      locations: { locationId: string; code: string; role: "PICK" | "RESERVE" | "DOCK"; qty: number }[];
      available: number;
      committed: number;
    }
  | { type: "order"; id: string; code: string; status: string }
  | { type: "none"; code: string };

/** Resolves any scanned code (through the one resolver) and returns what the phone screens need. */
export const scanInfoAction = action("OPERATOR", z.object({ code: z.string().trim().min(1).max(120) }), async ({ code }): Promise<ScanInfo> => {
  const r = await resolveCode(code);
  if (r.type === "location") {
    const contents = await db.stockLevel.findMany({
      where: { locationId: r.location.id },
      orderBy: { product: { sku: "asc" } },
      take: 500, // a single shelf slot never holds more
      select: { qty: true, product: { select: { id: true, sku: true, name: true, imageUrl: true } } },
    });
    return {
      type: "location",
      id: r.location.id,
      code: r.location.code,
      role: r.location.role,
      active: r.location.active,
      contents: contents.map((c) => ({ productId: c.product.id, sku: c.product.sku, name: c.product.name, imageUrl: c.product.imageUrl, qty: c.qty })),
    };
  }
  if (r.type === "product") {
    const [levels, summary] = await Promise.all([
      db.stockLevel.findMany({
        where: { productId: r.product.id, qty: { gt: 0 } },
        orderBy: { location: { sortKey: "asc" } },
        take: 200,
        select: { qty: true, location: { select: { id: true, code: true, role: true } } },
      }),
      stockSummary([r.product.id]),
    ]);
    const s = summary.get(r.product.id);
    return {
      type: "product",
      ...r.product,
      locations: levels.map((l) => ({ locationId: l.location.id, code: l.location.code, role: l.location.role, qty: l.qty })),
      available: s?.available ?? 0,
      committed: s?.committed ?? 0,
    };
  }
  if (r.type === "order") return { type: "order", ...r.order };
  return r;
});
