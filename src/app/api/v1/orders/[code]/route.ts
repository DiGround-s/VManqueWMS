import { NextResponse } from "next/server";
import { apiError, authenticateApiKey } from "@/server/api-auth";
import { db } from "@/server/db";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await authenticateApiKey(req))) return apiError(401, "API key inválida o revocada");
  const { code } = await params;
  const order = await db.order.findFirst({
    where: { OR: [{ code: code.toUpperCase() }, { externalRef: code }] },
    select: {
      code: true, externalRef: true, status: true, carrier: true, createdAt: true, pickedAt: true, sortedAt: true, packedAt: true, shippedAt: true, cancelledAt: true,
      lines: { select: { qty: true, pickedQty: true, sortedQty: true, packedQty: true, product: { select: { sku: true } } } },
    },
  });
  if (!order) return apiError(404, "Pedido no encontrado");
  const sum = (k: "qty" | "pickedQty" | "sortedQty" | "packedQty") => order.lines.reduce((n, l) => n + l[k], 0);
  const { lines, ...rest } = order;
  return NextResponse.json({
    ...rest,
    progress: { units: sum("qty"), picked: sum("pickedQty"), sorted: sum("sortedQty"), packed: sum("packedQty") },
    lines: lines.map((l) => ({ sku: l.product.sku, qty: l.qty, picked: l.pickedQty, sorted: l.sortedQty, packed: l.packedQty })),
  });
}
