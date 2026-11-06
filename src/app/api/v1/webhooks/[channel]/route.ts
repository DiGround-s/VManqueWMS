import { NextResponse } from "next/server";
import { apiError, authenticateApiKey } from "@/server/api-auth";
import { toMessage } from "@/server/action";
import { UserError } from "@/server/errors";
import { orderInput } from "@/features/orders/schema";
import { createOrder } from "@/features/orders/service";

const SLUGS = { mercadolibre: "MERCADOLIBRE", falabella: "FALABELLA", paris: "PARIS", tienda: "DIRECT" } as const;

/**
 * One endpoint per store: `POST /api/v1/webhooks/{mercadolibre|falabella|paris|tienda}`.
 * The body is the same order JSON as `/api/v1/orders`; the store comes from the URL.
 * Idempotent by `externalRef`, so a store retrying the same notification creates nothing new.
 */
export async function POST(req: Request, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = SLUGS[channel as keyof typeof SLUGS];
  if (!ch) return apiError(404, `Tienda desconocida: ${channel}`);
  if (!(await authenticateApiKey(req))) return apiError(401, "API key inválida o revocada");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "El cuerpo debe ser JSON");
  }
  const parsed = orderInput.safeParse({ ...(body as object), channel: ch });
  if (!parsed.success) return apiError(422, "Datos inválidos", parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  try {
    const order = await createOrder(parsed.data, "API");
    return NextResponse.json({ code: order.code, created: order.created, channel: ch }, { status: order.created ? 201 : 200 });
  } catch (e) {
    if (e instanceof UserError) return apiError(422, e.message);
    return apiError(500, toMessage(e));
  }
}
