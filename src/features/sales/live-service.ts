import "server-only";
import type { OrderStatus, SalesChannel } from "@prisma/client";
import { db, Prisma } from "@/server/db";
import { CHANNEL_ORDER } from "@/lib/channels";
import { startOfTodayChile } from "@/lib/format";

const LOCAL = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')`;
const NOW = Prisma.sql`(now() AT TIME ZONE 'America/Santiago')`;
const n = (v: bigint | number | null | undefined) => Number(v ?? 0);

/** Everything the live board shows, in one round trip from the client (polled every few seconds). */
export async function liveSnapshot() {
  const now = new Date();
  const today = startOfTodayChile(now);

  const [hours, minutes, recent, events, buyerMsgs, pipeline, unanswered] = await Promise.all([
    // revenue per local hour, today and yesterday
    db.$queryRaw<{ day: number; h: number; total: bigint; orders: bigint }[]>`
      SELECT (CASE WHEN ${LOCAL} >= date_trunc('day', ${NOW}) THEN 0 ELSE 1 END)::int AS day, extract(hour FROM ${LOCAL})::int AS h, sum(total) AS total, count(*) AS orders
      FROM "Order" WHERE status <> 'CANCELLED' AND ${LOCAL} >= date_trunc('day', ${NOW}) - interval '1 day' GROUP BY 1, 2`,
    // "createdAt" is a UTC timestamp without zone: read it as UTC before comparing with now()
    db.$queryRaw<{ m: number; channel: SalesChannel; orders: bigint }[]>`
      SELECT floor(extract(epoch FROM (now() - ("createdAt" AT TIME ZONE 'UTC'))) / 60)::int AS m, channel, count(*) AS orders
      FROM "Order" WHERE ("createdAt" AT TIME ZONE 'UTC') >= now() - interval '60 minutes' GROUP BY 1, 2`,
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, code: true, externalRef: true, channel: true, customerName: true, commune: true, total: true, status: true, createdAt: true, lines: { take: 1, select: { qty: true, product: { select: { name: true, imageUrl: true } } } }, _count: { select: { lines: true } } },
    }),
    db.orderEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, message: true, toStatus: true, createdAt: true, order: { select: { code: true, channel: true } } } }),
    db.message.findMany({ where: { author: "BUYER" }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, body: true, createdAt: true, conversation: { select: { id: true, channel: true, customerName: true, kind: true } } } }),
    db.order.groupBy({ by: ["status"], where: { status: { notIn: ["SHIPPED", "CANCELLED"] } }, _count: true }),
    db.conversation.count({ where: { status: "OPEN" } }),
  ]);

  // cumulative revenue by hour (today stops at the current hour)
  const hourNow = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23" }).format(now));
  const per = [new Array(24).fill(0), new Array(24).fill(0)];
  const cnt = [new Array(24).fill(0), new Array(24).fill(0)];
  for (const r of hours) {
    per[r.day][r.h] += n(r.total);
    cnt[r.day][r.h] += n(r.orders);
  }
  const cum = (xs: number[], upto: number) => xs.slice(0, upto + 1).reduce<number[]>((a, v) => [...a, (a.at(-1) ?? 0) + v], []);
  const todayCum = cum(per[0], hourNow);
  const yesterdayCum = cum(per[1], 23);
  const todayTotal = todayCum.at(-1) ?? 0;
  const todayOrders = cnt[0].reduce((a, b) => a + b, 0);
  const ySameTime = yesterdayCum[hourNow] ?? 0;
  const yOrdersSame = cnt[1].slice(0, hourNow + 1).reduce((a, b) => a + b, 0);

  const perMinute = Array.from({ length: 60 }, () => Object.fromEntries(CHANNEL_ORDER.map((c) => [c, 0])) as Record<SalesChannel, number>);
  for (const r of minutes) if (r.m >= 0 && r.m < 60) perMinute[59 - r.m][r.channel] += n(r.orders);

  const byChannel = await db.order.groupBy({ by: ["channel"], where: { createdAt: { gte: today }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: true });
  const channels = CHANNEL_ORDER.map((c) => {
    const r = byChannel.find((x) => x.channel === c);
    return { channel: c, total: r?._sum.total ?? 0, orders: r?._count ?? 0 };
  });

  const activity = [
    ...events.map((e) => ({ id: `e${e.id}`, kind: "order" as const, at: e.createdAt, title: e.message, detail: e.order.code, channel: e.order.channel, status: e.toStatus as OrderStatus | null, href: `/pedidos/${e.order.code}` })),
    ...buyerMsgs.map((m) => ({ id: `m${m.id}`, kind: "message" as const, at: m.createdAt, title: `Mensaje de ${m.conversation.customerName}`, detail: m.body, channel: m.conversation.channel, status: null, href: `/atencion?c=${m.conversation.id}` })),
  ]
    .sort((a, b) => +b.at - +a.at)
    .slice(0, 8);

  return {
    now: now.toISOString(),
    hourNow,
    today: { total: todayTotal, orders: todayOrders, avg: todayOrders ? Math.round(todayTotal / todayOrders) : 0, ySameTime, yOrdersSame },
    lastHour: perMinute.reduce((a, m) => a + CHANNEL_ORDER.reduce((s, c) => s + m[c], 0), 0),
    todayCum,
    yesterdayCum,
    perMinute,
    channels,
    recent: recent.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
    activity: activity.map((a) => ({ ...a, at: a.at.toISOString() })),
    pipeline: Object.fromEntries(pipeline.map((p) => [p.status, p._count])) as Partial<Record<OrderStatus, number>>,
    unanswered,
  };
}

export type LiveSnapshot = Awaited<ReturnType<typeof liveSnapshot>>;
