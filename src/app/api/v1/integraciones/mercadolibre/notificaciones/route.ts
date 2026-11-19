import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { mlConfig } from "@/features/integrations/mercadolibre/client";
import { processNotification } from "@/features/integrations/mercadolibre/sync";

/** Shape of every Mercado Libre notification (orders_v2, questions, messages, claims...). */
const notification = z.object({
  _id: z.string().min(1).max(100),
  resource: z.string().min(1).max(300),
  user_id: z.coerce.string(),
  topic: z.string().min(1).max(60),
  application_id: z.coerce.string(),
  attempts: z.coerce.number().int().default(1),
});

/**
 * Notifications URL registered in the Mercado Libre app. Mercado Libre expects HTTP 200 within 500 ms and
 * retries otherwise, so this only stores the notice and answers; the work runs right after the response.
 * A notice carries no data, only "resource X changed": we fetch X ourselves with our token, so a forged
 * notice cannot inject orders. Notices for another app are logged as ignored.
 */
export async function POST(req: Request) {
  const parsed = notification.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Aviso con formato inválido" }, { status: 400 });
  const n = parsed.data;
  const ownApp = n.application_id === mlConfig().clientId;
  const row = await db.marketplaceNotification.upsert({
    where: { externalId: n._id },
    create: {
      channel: "MERCADOLIBRE",
      externalId: n._id,
      topic: n.topic,
      resource: n.resource,
      userId: n.user_id,
      attempts: n.attempts,
      ...(ownApp ? {} : { status: "IGNORED", result: `Aplicación ajena (${n.application_id})`, processedAt: new Date() }),
    },
    update: { attempts: n.attempts },
    select: { id: true, status: true },
  });
  if (ownApp && (row.status === "RECEIVED" || row.status === "ERROR")) {
    after(async () => {
      if (row.status === "ERROR") await db.marketplaceNotification.update({ where: { id: row.id }, data: { status: "RECEIVED" } });
      await processNotification(row.id);
    });
  }
  return NextResponse.json({ ok: true });
}
