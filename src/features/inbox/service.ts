import "server-only";
import type { CaseKind, CaseStatus, Prisma, SalesChannel } from "@prisma/client";
import { db } from "@/server/db";
import { CHANNEL_ORDER } from "@/lib/channels";

export type InboxFilter = { channel?: SalesChannel; status?: CaseStatus | "ALL"; kind?: CaseKind; q?: string };

export async function listConversations(f: InboxFilter) {
  const where: Prisma.ConversationWhereInput = {
    ...(f.channel ? { channel: f.channel } : {}),
    ...(f.status && f.status !== "ALL" ? { status: f.status } : {}),
    ...(f.kind ? { kind: f.kind } : {}),
    ...(f.q
      ? { OR: [{ customerName: { contains: f.q, mode: "insensitive" } }, { subject: { contains: f.q, mode: "insensitive" } }, { order: { code: { contains: f.q, mode: "insensitive" } } }, { order: { externalRef: { contains: f.q, mode: "insensitive" } } }] }
      : {}),
  };
  return db.conversation.findMany({
    where,
    orderBy: [{ unread: "desc" }, { lastMessageAt: "desc" }],
    take: 60,
    select: {
      id: true, channel: true, kind: true, status: true, returnStatus: true, subject: true, customerName: true, unread: true, dueAt: true, lastMessageAt: true,
      order: { select: { code: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, author: true } },
    },
  });
}

export async function getConversation(id: string) {
  return db.conversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      order: {
        select: {
          id: true, code: true, externalRef: true, status: true, total: true, carrier: true, commune: true, address: true, createdAt: true, shippedAt: true,
          lines: { select: { qty: true, unitPrice: true, product: { select: { id: true, name: true, sku: true, imageUrl: true } } } },
        },
      },
    },
  });
}

/** Counters for the inbox header and the nav badge. */
export async function inboxCounts() {
  const [byStatus, byChannel, unread, returns, overdue] = await Promise.all([
    db.conversation.groupBy({ by: ["status"], _count: true }),
    db.conversation.groupBy({ by: ["channel"], where: { status: "OPEN" }, _count: true }),
    db.conversation.aggregate({ _sum: { unread: true } }),
    db.conversation.count({ where: { kind: { in: ["RETURN", "EXCHANGE"] }, returnStatus: { in: ["REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED"] } } }),
    db.conversation.count({ where: { status: "OPEN", dueAt: { lt: new Date() } } }),
  ]);
  const status = Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Partial<Record<CaseStatus, number>>;
  const channel = new Map(byChannel.map((c) => [c.channel, c._count]));
  return {
    open: status.OPEN ?? 0,
    waiting: status.WAITING ?? 0,
    resolved: status.RESOLVED ?? 0,
    unread: unread._sum.unread ?? 0,
    returns,
    overdue,
    perChannel: CHANNEL_ORDER.map((c) => ({ channel: c, open: channel.get(c) ?? 0 })),
  };
}

/** Threads still waiting on us, oldest first: for the nav badge. */
export const unansweredCount = () => db.conversation.count({ where: { status: "OPEN" } });
