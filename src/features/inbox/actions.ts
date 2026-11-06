"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";
import { UserError } from "@/server/errors";
import { CHANNEL_VALUES } from "@/features/orders/schema";
import { SCRIPTS, SLA_HOURS, SYSTEM_OPEN, fill } from "./scripts";

const RETURN_STEP = {
  APPROVED: "Devolución aprobada · etiqueta de envío enviada al comprador",
  IN_TRANSIT: "El comprador despachó el producto de vuelta",
  RECEIVED: "Producto recibido en bodega para revisión",
  REFUNDED: "Reembolso emitido al comprador",
  REJECTED: "Devolución rechazada",
} as const;

const done = () => revalidatePath("/", "layout");

/** Answer the buyer. The marketplace API would get the same text (the demo keeps it local). */
export const replyAction = action("OPERATOR", z.object({ id: z.string().min(1), body: z.string().trim().min(1, "Escribe una respuesta").max(2000) }), async ({ id, body }, user) => {
  const c = await db.conversation.findUnique({ where: { id }, select: { status: true } });
  if (!c) throw new UserError("La conversación ya no existe.");
  const now = new Date();
  await db.conversation.update({
    where: { id },
    data: { status: c.status === "RESOLVED" ? "RESOLVED" : "WAITING", unread: 0, lastMessageAt: now, messages: { create: { author: "AGENT", authorName: user.name, body, createdAt: now } } },
  });
  done();
  return { ok: true };
});

export const markReadAction = action("OPERATOR", z.object({ id: z.string().min(1) }), async ({ id }) => {
  const r = await db.conversation.updateMany({ where: { id, unread: { gt: 0 } }, data: { unread: 0 } });
  if (r.count) done();
  return { changed: r.count > 0 };
});

export const setCaseStatusAction = action("OPERATOR", z.object({ id: z.string().min(1), status: z.enum(["OPEN", "WAITING", "RESOLVED"]) }), async ({ id, status }) => {
  await db.conversation.update({
    where: { id },
    data: { status, unread: 0, ...(status === "RESOLVED" ? { dueAt: null, messages: { create: { author: "SYSTEM", body: "Caso marcado como resuelto" } } } : {}) },
  });
  done();
  return { status };
});

/** Moves a return / exchange one step and leaves a system line in the thread. */
export const setReturnStatusAction = action(
  "SUPERVISOR",
  z.object({ id: z.string().min(1), step: z.enum(["APPROVED", "IN_TRANSIT", "RECEIVED", "REFUNDED", "REJECTED"]) }),
  async ({ id, step }) => {
    const now = new Date();
    await db.conversation.update({
      where: { id },
      data: {
        returnStatus: step,
        lastMessageAt: now,
        ...(step === "REFUNDED" || step === "REJECTED" ? { status: "RESOLVED", dueAt: null, unread: 0 } : {}),
        messages: { create: { author: "SYSTEM", body: RETURN_STEP[step], createdAt: now } },
      },
    });
    done();
    return { step };
  },
);

const r = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const NAMES = ["Valentina Ortiz", "Gonzalo Peña", "Trinidad Araya", "Nicolás Cáceres", "Josefa Lagos", "Renato Vidal"];

/**
 * Demo of the marketplaces' messaging webhooks: a buyer writes, through a random store,
 * either a new case or a follow-up in a thread that is waiting on them.
 */
export const simulateIncomingMessageAction = action("SUPERVISOR", z.object({ channel: z.enum(CHANNEL_VALUES).optional() }), async ({ channel }) => {
  const now = new Date();
  const waiting = channel ? null : await db.conversation.findFirst({ where: { status: "WAITING" }, orderBy: { lastMessageAt: "asc" }, select: { id: true, channel: true, customerName: true } });
  if (waiting && Math.random() < 0.35) {
    await db.conversation.update({
      where: { id: waiting.id },
      data: { status: "OPEN", unread: { increment: 1 }, lastMessageAt: now, messages: { create: { author: "BUYER", body: r(["Ok, quedo atento.", "Gracias! ¿Y para cuándo estaría?", "Ya lo envié, ¿me avisan cuando llegue?"]), createdAt: now } } },
    });
    done();
    return { id: waiting.id, channel: waiting.channel, who: waiting.customerName, isNew: false };
  }
  const s = r(SCRIPTS);
  const order = s.needsOrder
    ? await db.order
        .findMany({
          where: { ...(channel ? { channel } : { channel: { not: "DIRECT" } }), status: s.kind === "SHIPPING" || s.kind === "CANCEL" ? { notIn: ["SHIPPED", "CANCELLED"] } : "SHIPPED" },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: { id: true, externalRef: true, channel: true, customerName: true, lines: { take: 1, select: { product: { select: { name: true } } } } },
        })
        .then((xs) => (xs.length ? r(xs) : null))
    : null;
  const ch = order?.channel ?? channel ?? r(["MERCADOLIBRE", "MERCADOLIBRE", "FALABELLA", "PARIS", "DIRECT"] as const);
  const product = order?.lines[0]?.product.name ?? (await db.product.findFirst({ skip: Math.floor(Math.random() * 20), select: { name: true } }))?.name ?? "el producto";
  const ref = order?.externalRef ?? "";
  const created = await db.conversation.create({
    data: {
      channel: ch,
      externalRef: `${ch.slice(0, 3)}-MSG-${Math.floor(900000 + Math.random() * 99999)}`,
      kind: s.kind,
      status: "OPEN",
      returnStatus: s.returnStatus ? "REQUESTED" : null,
      subject: s.subject,
      customerName: order?.customerName ?? r(NAMES),
      orderId: order?.id ?? null,
      unread: s.buyer.length,
      dueAt: new Date(now.getTime() + SLA_HOURS[ch] * 3_600_000),
      lastMessageAt: now,
      messages: {
        create: [
          { author: "SYSTEM", body: SYSTEM_OPEN[s.kind], createdAt: new Date(now.getTime() - 2000) },
          ...s.buyer.map((b, i) => ({ author: "BUYER" as const, body: fill(b, product, ref), createdAt: new Date(now.getTime() - 1000 + i * 400) })),
        ],
      },
    },
  });
  done();
  return { id: created.id, channel: ch, who: created.customerName, isNew: true };
});
