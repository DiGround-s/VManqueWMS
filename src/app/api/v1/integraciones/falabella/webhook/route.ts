import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { falabellaWebhookAllowed, processFalabellaNotification } from "@/features/integrations/stores/connectors";

const body = z.object({ event: z.string().min(1).max(60), payload: z.object({ OrderId: z.coerce.string().min(1).max(40) }).passthrough() });

/**
 * Falabella Seller Center webhook (registered with CreateWebhook when the store is connected).
 * Falabella does not document a signature, so the URL carries a random secret (?k=) and the order is
 * always re-read from the API with our credentials. Answers 200 at once; the work runs after the response.
 */
export async function POST(req: Request) {
  if (!(await falabellaWebhookAllowed(new URL(req.url).searchParams.get("k")))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Aviso con formato inválido" }, { status: 400 });
  const { event, payload } = parsed.data;
  if (!["onOrderCreated", "onOrderItemsStatusChanged"].includes(event)) return NextResponse.json({ ok: true, ignored: event });
  const row = await db.marketplaceNotification.upsert({
    where: { externalId: `fal-${event}-${payload.OrderId}` },
    create: { channel: "FALABELLA", externalId: `fal-${event}-${payload.OrderId}`, topic: event, resource: `OrderId ${payload.OrderId}`, userId: "-" },
    update: { attempts: { increment: 1 } },
    select: { id: true, status: true },
  });
  if (row.status !== "PROCESSED") after(() => processFalabellaNotification(row.id));
  return NextResponse.json({ ok: true });
}
