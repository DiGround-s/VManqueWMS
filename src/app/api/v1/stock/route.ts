import { NextResponse } from "next/server";
import { apiError, authenticateApiKey } from "@/server/api-auth";
import { db } from "@/server/db";
import { stockSummary } from "@/server/inventory/summary";

/** GET /api/v1/stock?sku=A&sku=B (or sku=A,B). Max 200 SKUs. */
export async function GET(req: Request) {
  if (!(await authenticateApiKey(req))) return apiError(401, "API key inválida o revocada");
  const url = new URL(req.url);
  const skus = [...new Set(url.searchParams.getAll("sku").flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean))];
  if (skus.length === 0) return apiError(400, "Indica al menos un sku (?sku=...)");
  if (skus.length > 200) return apiError(400, "Máximo 200 SKUs por consulta");
  const products = await db.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true } });
  const summary = await stockSummary(products.map((p) => p.id));
  const bySku = new Map(products.map((p) => [p.sku, p.id]));
  return NextResponse.json({
    items: skus.map((sku) => {
      const id = bySku.get(sku);
      if (!id) return { sku, found: false };
      const s = summary.get(id)!;
      return { sku, found: true, available: Math.max(0, s.available), onShelf: s.shelf, committed: s.committed, inProcess: s.inProcess, dock: s.dock };
    }),
  });
}
