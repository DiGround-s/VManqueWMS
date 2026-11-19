import "server-only";
import type { CaseKind, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { UserError } from "@/server/errors";
import { createOrder, cancelOrder } from "@/features/orders/service";
import { SLA_HOURS, SYSTEM_OPEN } from "@/features/inbox/scripts";
import { getAccount, ml } from "./client";

/* ---------------------------------------------------------------- Mercado Libre resources (only the fields we use) */
type MlOrder = {
  id: number;
  status: string;
  buyer: { id: number; nickname: string; first_name?: string; last_name?: string };
  order_items: { item: { id: string; title: string; seller_sku: string | null }; quantity: number; unit_price: number }[];
  shipping: { id: number | null };
};
type MlShipment = {
  receiver_address: { street_name: string; street_number: string; address_line?: string; city: { name: string }; receiver_name?: string; receiver_phone?: string | null; comment?: string | null };
  shipping_option?: { name?: string; cost?: number };
};
type MlQuestion = { id: number; item_id: string; text: string; status: string; date_created: string; from: { id: number } };
type MlMessage = { id: string; text: string; from: { user_id: number }; message_date: { created: string }; message_resources?: { id: string; name: string }[] };
type MlClaim = { id: number; resource_id: number; reason_id: string; status: string; return?: { status: string } | null; related_entities?: string[]; players: { role: string; user_id: number }[] };
type MlClaimMessage = { id: string; sender_role: string; message: string; date_created: string };

export const ref = { order: (id: number | string) => `MLC-${id}`, question: (id: number | string) => `MLC-Q-${id}`, pack: (id: number | string) => `MLC-PACK-${id}`, claim: (id: number | string) => `MLC-CLAIM-${id}` };

/* ---------------------------------------------------------------- notification processing */

/** Processes one stored notification: fetches the resource with our token and mirrors it in the WMS. */
export async function processNotification(id: string) {
  const n = await db.marketplaceNotification.findUnique({ where: { id } });
  if (!n || n.status === "PROCESSED" || n.status === "IGNORED") return;
  const finish = (status: "PROCESSED" | "IGNORED" | "ERROR", result: string) =>
    db.marketplaceNotification.update({ where: { id }, data: { status, result: result.slice(0, 500), processedAt: new Date() } });
  try {
    const acc = await getAccount();
    if (!acc) return finish("IGNORED", "Mercado Libre no está conectado");
    if (acc.sellerId !== n.userId) return finish("IGNORED", `El aviso es de otro vendedor (${n.userId})`);
    switch (n.topic) {
      case "orders_v2":
        return finish("PROCESSED", await syncOrder(n.resource.replace(/^\/orders\//, "")));
      case "questions":
        return finish("PROCESSED", await syncQuestion(n.resource.replace(/^\/questions\//, ""), acc.sellerId));
      case "messages":
        return finish("PROCESSED", await syncMessage(n.resource, acc.sellerId));
      case "claims":
        return finish("PROCESSED", await syncClaim(n.resource.replace(/^\/post-purchase\/v1\/claims\//, "")));
      default:
        return finish("IGNORED", `Tópico no usado: ${n.topic}`);
    }
  } catch (e) {
    return finish("ERROR", e instanceof Error ? e.message : String(e));
  }
}

/** orders_v2 → creates the WMS order (idempotent by externalRef) or cancels it if the buyer cancelled. */
export async function syncOrder(orderId: string, known?: MlOrder): Promise<string> {
  const o = known ?? (await ml<MlOrder>(`/orders/${orderId}`));
  const externalRef = ref.order(o.id);
  if (o.status === "cancelled") {
    const ours = await db.order.findUnique({ where: { externalRef }, select: { id: true, code: true, status: true } });
    if (!ours) return `Venta ${o.id} cancelada (no estaba en el WMS)`;
    if (ours.status === "CANCELLED") return `${ours.code} ya estaba cancelado`;
    if (ours.status === "SHIPPED") return `${ours.code} ya fue despachado; la cancelación se gestiona como devolución`;
    await cancelOrder(ours.id, null, "cancelado por el comprador en Mercado Libre");
    return `${ours.code} cancelado`;
  }
  if (o.status !== "paid") return `Venta ${o.id} en estado ${o.status}: se espera el pago`;
  const missing = o.order_items.filter((i) => !i.item.seller_sku);
  if (missing.length) throw new UserError(`La publicación ${missing[0].item.id} no tiene SKU de vendedor (seller_sku)`);
  const s = o.shipping.id ? await ml<MlShipment>(`/shipments/${o.shipping.id}`) : null;
  const a = s?.receiver_address;
  const r = await createOrder(
    {
      externalRef,
      channel: "MERCADOLIBRE",
      customerName: a?.receiver_name || [o.buyer.first_name, o.buyer.last_name].filter(Boolean).join(" ") || o.buyer.nickname,
      address: a ? a.address_line || `${a.street_name} ${a.street_number}` : "Retiro en punto Mercado Libre",
      commune: a?.city.name ?? "—",
      phone: a?.receiver_phone ?? undefined,
      carrier: s?.shipping_option?.name ?? "Mercado Envíos",
      notes: `Mercado Libre · venta #${o.id} · comprador ${o.buyer.nickname}${a?.comment ? ` · ${a.comment}` : ""}`,
      priority: 0,
      shippingFee: s?.shipping_option?.cost ?? 0,
      lines: o.order_items.map((i) => ({ sku: i.item.seller_sku!, qty: i.quantity })),
    },
    "API",
  );
  return r.created ? `Pedido ${r.code} creado` : `${r.code} ya existía (aviso repetido)`;
}

async function nickname(userId: number) {
  try {
    return (await ml<{ nickname: string }>(`/users/${userId}`)).nickname;
  } catch {
    return `Usuario ${userId}`;
  }
}

/** Upserts a conversation and appends only the messages we have not stored yet (deduped by externalId). */
async function upsertThread(args: {
  externalRef: string;
  kind: CaseKind;
  subject: string;
  customerName: string;
  orderRef?: string;
  returnStatus?: "REQUESTED" | null;
  messages: { externalId: string; author: "BUYER" | "AGENT"; body: string; createdAt: Date }[];
}) {
  const order = args.orderRef ? await db.order.findUnique({ where: { externalRef: args.orderRef }, select: { id: true } }) : null;
  const existing = await db.conversation.findUnique({ where: { externalRef: args.externalRef }, select: { id: true } });
  const known = existing
    ? new Set((await db.message.findMany({ where: { conversationId: existing.id, externalId: { not: null } }, select: { externalId: true } })).map((m) => m.externalId))
    : new Set<string | null>();
  // Our own replies are stored when sent; if the marketplace gave no id back, match them by text.
  const sentText = existing
    ? new Set((await db.message.findMany({ where: { conversationId: existing.id, author: "AGENT", externalId: null }, select: { body: true } })).map((m) => m.body))
    : new Set<string>();
  const fresh = args.messages.filter((m) => !known.has(m.externalId) && !(m.author === "AGENT" && sentText.has(m.body)));
  const buyerNew = fresh.filter((m) => m.author === "BUYER").length;
  const last = fresh.at(-1)?.createdAt ?? new Date();
  const msgs: Prisma.MessageCreateWithoutConversationInput[] = fresh.map((m) => ({ externalId: m.externalId, author: m.author, authorName: m.author === "BUYER" ? args.customerName : "Vendedor (Mercado Libre)", body: m.body, createdAt: m.createdAt }));
  if (!existing) {
    await db.conversation.create({
      data: {
        channel: "MERCADOLIBRE",
        externalRef: args.externalRef,
        kind: args.kind,
        status: buyerNew ? "OPEN" : "WAITING",
        returnStatus: args.returnStatus ?? null,
        subject: args.subject,
        customerName: args.customerName,
        orderId: order?.id ?? null,
        unread: buyerNew,
        dueAt: buyerNew ? new Date(Date.now() + SLA_HOURS.MERCADOLIBRE * 3_600_000) : null,
        lastMessageAt: last,
        messages: { create: [{ author: "SYSTEM", body: SYSTEM_OPEN[args.kind] + " (Mercado Libre)", createdAt: new Date(last.getTime() - 1000) }, ...msgs] },
      },
    });
    return `Conversación creada (${fresh.length} mensaje${fresh.length === 1 ? "" : "s"})`;
  }
  if (!fresh.length) return "Sin mensajes nuevos (aviso repetido)";
  await db.conversation.update({
    where: { id: existing.id },
    data: {
      ...(buyerNew ? { status: "OPEN", unread: { increment: buyerNew }, dueAt: new Date(Date.now() + SLA_HOURS.MERCADOLIBRE * 3_600_000) } : {}),
      lastMessageAt: last,
      messages: { create: msgs },
    },
  });
  return `${fresh.length} mensaje${fresh.length === 1 ? "" : "s"} nuevo${fresh.length === 1 ? "" : "s"}`;
}

/** questions → pre-sale question about a listing. */
async function syncQuestion(questionId: string, sellerId: string) {
  const q = await ml<MlQuestion>(`/questions/${questionId}`);
  void sellerId;
  if (q.status !== "UNANSWERED") return `Pregunta ${q.id} ya respondida`;
  const item = await ml<{ title: string }>(`/items/${q.item_id}`).catch(() => ({ title: q.item_id }));
  return upsertThread({
    externalRef: ref.question(q.id),
    kind: "QUESTION",
    subject: `Pregunta: ${item.title}`.slice(0, 190),
    customerName: await nickname(q.from.id),
    messages: [{ externalId: `q-${q.id}`, author: "BUYER", body: q.text, createdAt: new Date(q.date_created) }],
  });
}

/** messages → post-sale chat. The notification brings the message id; we read the whole thread of its sale. */
async function syncMessage(messageId: string, sellerId: string) {
  const m = (await ml<{ messages: MlMessage[] }>(`/messages/${messageId}?tag=post_sale`)).messages[0];
  const pack = m?.message_resources?.find((r) => r.name === "packs")?.id;
  if (!pack) throw new UserError(`El mensaje ${messageId} no indica su venta`);
  const thread = await ml<{ messages: MlMessage[] }>(`/messages/packs/${pack}/sellers/${sellerId}?tag=post_sale`);
  const order = await db.order.findUnique({ where: { externalRef: ref.order(pack) }, select: { customerName: true, code: true } });
  const buyerId = thread.messages.find((x) => String(x.from.user_id) !== sellerId)?.from.user_id;
  return upsertThread({
    externalRef: ref.pack(pack),
    kind: "SHIPPING",
    subject: `Mensajes de la venta #${pack}${order ? ` (${order.code})` : ""}`,
    customerName: order?.customerName ?? (buyerId ? await nickname(buyerId) : "Comprador"),
    orderRef: ref.order(pack),
    messages: thread.messages.map((x) => ({ externalId: `m-${x.id}`, author: String(x.from.user_id) === sellerId ? "AGENT" : "BUYER", body: x.text, createdAt: new Date(x.message_date.created) })),
  });
}

const CLAIM_REASON: Record<string, string> = { PDD: "producto defectuoso o distinto", PNR: "producto no recibido", CS: "compra cancelada" };

/** claims → mediation opened by the buyer (with or without a return). */
async function syncClaim(claimId: string) {
  const c = await ml<MlClaim>(`/post-purchase/v1/claims/${claimId}`);
  const msgs = await ml<MlClaimMessage[]>(`/post-purchase/v1/claims/${claimId}/messages`);
  const isReturn = Boolean(c.return) || (c.related_entities ?? []).includes("return");
  const order = await db.order.findUnique({ where: { externalRef: ref.order(c.resource_id) }, select: { customerName: true, code: true } });
  return upsertThread({
    externalRef: ref.claim(c.id),
    kind: isReturn ? "RETURN" : "CLAIM",
    returnStatus: isReturn ? "REQUESTED" : null,
    subject: `Reclamo #${c.id}: ${CLAIM_REASON[c.reason_id] ?? c.reason_id}${order ? ` (${order.code})` : ""}`,
    customerName: order?.customerName ?? "Comprador",
    orderRef: ref.order(c.resource_id),
    messages: msgs.map((x) => ({ externalId: `c-${x.id}`, author: x.sender_role === "complainant" ? "BUYER" : "AGENT", body: x.message, createdAt: new Date(x.date_created) })),
  });
}

/* ---------------------------------------------------------------- outbound: replies typed in Atención */

/** Sends an agent reply to Mercado Libre. Returns the marketplace id of the message (null when ML does not return one). */
export async function pushReply(externalRef: string, text: string): Promise<string | null> {
  const acc = await getAccount();
  if (!acc) throw new UserError("Mercado Libre no está conectado: la respuesta no se puede enviar.");
  let m: RegExpMatchArray | null;
  if ((m = externalRef.match(/^MLC-Q-(\d+)$/))) {
    await ml(`/answers`, { method: "POST", body: { question_id: Number(m[1]), text } });
    return `a-${m[1]}`;
  }
  if ((m = externalRef.match(/^MLC-PACK-(\d+)$/))) {
    const r = await ml<{ id: string }>(`/messages/packs/${m[1]}/sellers/${acc.sellerId}?tag=post_sale`, { method: "POST", body: { from: { user_id: Number(acc.sellerId) }, text } });
    return r.id ? `m-${r.id}` : null;
  }
  if ((m = externalRef.match(/^MLC-CLAIM-(\d+)$/))) {
    const r = await ml<{ id?: string }>(`/post-purchase/v1/claims/${m[1]}/actions/send-message`, { method: "POST", body: { receiver_role: "complainant", message: text } });
    return r.id ? `c-${r.id}` : null; // without an id, the next sync matches the reply by its text
  }
  return null; // not a Mercado Libre thread created by the connector (demo data): stays local
}

export const isMlThread = (externalRef: string | null | undefined) => Boolean(externalRef && /^MLC-(Q|PACK|CLAIM)-\d+$/.test(externalRef));

/* ---------------------------------------------------------------- backup: polling */

/** Asks Mercado Libre for the last 2 days of sales and creates any the notifications missed. */
export async function pollOrders() {
  const acc = await getAccount();
  if (!acc) throw new UserError("Mercado Libre no está conectado.");
  const from = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const r = await ml<{ results: MlOrder[] }>(`/orders/search?seller=${acc.sellerId}&order.date_created.from=${encodeURIComponent(from)}&sort=date_desc&limit=50`);
  let created = 0;
  for (const o of r.results) {
    if (o.status !== "paid") continue;
    if (await db.order.findUnique({ where: { externalRef: ref.order(o.id) }, select: { id: true } })) continue;
    await syncOrder(String(o.id), o);
    created += 1;
  }
  const retried = await db.marketplaceNotification.findMany({ where: { channel: "MERCADOLIBRE", status: "ERROR" }, select: { id: true } });
  for (const n of retried) {
    await db.marketplaceNotification.update({ where: { id: n.id }, data: { status: "RECEIVED" } });
    await processNotification(n.id);
  }
  return { checked: r.results.length, created, retried: retried.length };
}
