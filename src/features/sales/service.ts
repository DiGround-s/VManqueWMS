import "server-only";
import type { SalesChannel } from "@prisma/client";
import { db, Prisma } from "@/server/db";
import { CHANNEL_ORDER } from "@/lib/channels";

/**
 * Revenue figures for the multi-store monitor. Every bucket uses Chile's local time
 * (orders are stored in UTC) and leaves cancelled orders out.
 */
const LOCAL = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')`;
const NOW = Prisma.sql`(now() AT TIME ZONE 'America/Santiago')`;

export type ChannelValues = Record<SalesChannel, number>;
export type Bucket = { key: string; label: string; long: string; values: ChannelValues; orders: number };

const zero = (): ChannelValues => ({ PARIS: 0, DIRECT: 0, FALABELLA: 0, MERCADOLIBRE: 0 });
const n = (v: bigint | number | null) => Number(v ?? 0);

type SummaryKey = "today" | "today_n" | "yesterday" | "month" | "month_n" | "month_fee" | "prev_month" | "last_month_full" | "year" | "year_n" | "year_fee" | "prev_year" | "day_of_month" | "days_in_month";

export async function revenueSummary() {
  const [r] = await db.$queryRaw<Record<string, bigint | null>[]>`
    WITH o AS (SELECT ${LOCAL} AS t, total, commission FROM "Order" WHERE status <> 'CANCELLED'), x AS (SELECT ${NOW} AS t)
    SELECT
      sum(total) FILTER (WHERE o.t >= date_trunc('day', x.t)) AS today,
      count(*)   FILTER (WHERE o.t >= date_trunc('day', x.t)) AS today_n,
      sum(total) FILTER (WHERE o.t >= date_trunc('day', x.t) - interval '1 day' AND o.t < x.t - interval '1 day') AS yesterday,
      sum(total) FILTER (WHERE o.t >= date_trunc('month', x.t)) AS month,
      count(*)   FILTER (WHERE o.t >= date_trunc('month', x.t)) AS month_n,
      sum(commission) FILTER (WHERE o.t >= date_trunc('month', x.t)) AS month_fee,
      sum(total) FILTER (WHERE o.t >= date_trunc('month', x.t) - interval '1 month' AND o.t < x.t - interval '1 month') AS prev_month,
      sum(total) FILTER (WHERE o.t >= date_trunc('month', x.t) - interval '1 month' AND o.t < date_trunc('month', x.t)) AS last_month_full,
      sum(total) FILTER (WHERE o.t >= date_trunc('year', x.t)) AS year,
      count(*)   FILTER (WHERE o.t >= date_trunc('year', x.t)) AS year_n,
      sum(commission) FILTER (WHERE o.t >= date_trunc('year', x.t)) AS year_fee,
      sum(total) FILTER (WHERE o.t >= date_trunc('year', x.t) - interval '1 year' AND o.t < x.t - interval '1 year') AS prev_year,
      extract(day FROM x.t)::bigint AS day_of_month,
      extract(day FROM date_trunc('month', x.t) + interval '1 month' - interval '1 day')::bigint AS days_in_month
    FROM o, x GROUP BY x.t`;
  const v = Object.fromEntries(Object.entries(r ?? {}).map(([k, x]) => [k, n(x)])) as Record<SummaryKey, number>;
  const dayFraction = await db.$queryRaw<{ f: number }[]>`SELECT (extract(epoch FROM ${NOW} - date_trunc('day', ${NOW})) / 86400)::float AS f`;
  // Run-rate projection: what the month closes at if the pace so far holds.
  const elapsed = Math.max(0.1, v.day_of_month - 1 + (dayFraction[0]?.f ?? 0.5));
  return { ...v, projection: Math.round((v.month / elapsed) * v.days_in_month), avgTicket: v.month_n ? Math.round(v.month / v.month_n) : 0 };
}

async function series(unit: "day" | "month", count: number): Promise<Bucket[]> {
  const span = unit === "day" ? Prisma.sql`interval '1 day'` : Prisma.sql`interval '1 month'`;
  const rows = await db.$queryRaw<{ b: Date; channel: SalesChannel; total: bigint; orders: bigint }[]>`
    SELECT date_trunc(${unit}, ${LOCAL}) AS b, channel, sum(total) AS total, count(*) AS orders FROM "Order"
    WHERE status <> 'CANCELLED' AND ${LOCAL} >= date_trunc(${unit}, ${NOW}) - ${span} * ${count - 1}::int
    GROUP BY 1, 2`;
  const [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT date_trunc(${unit}, ${NOW}) AS now`;
  const buckets: Bucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    // Timestamps without zone come back as UTC midnights; read them with UTC getters.
    const d = new Date(now);
    if (unit === "day") d.setUTCDate(d.getUTCDate() - i);
    else d.setUTCMonth(d.getUTCMonth() - i);
    const key = d.toISOString().slice(0, unit === "day" ? 10 : 7);
    const opts: Intl.DateTimeFormatOptions = { timeZone: "UTC" };
    buckets.push({
      key,
      label: unit === "day" ? String(d.getUTCDate()) : d.toLocaleDateString("es-CL", { ...opts, month: "short" }).replace(".", ""),
      long: unit === "day" ? d.toLocaleDateString("es-CL", { ...opts, weekday: "long", day: "numeric", month: "long" }) : d.toLocaleDateString("es-CL", { ...opts, month: "long", year: "numeric" }),
      values: zero(),
      orders: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const r of rows) {
    const b = byKey.get(new Date(r.b).toISOString().slice(0, unit === "day" ? 10 : 7));
    if (!b) continue;
    b.values[r.channel] += n(r.total);
    b.orders += n(r.orders);
  }
  return buckets;
}

export const dailySeries = (days = 30) => series("day", days);
export const monthlySeries = (months = 12) => series("month", months);

/** Per store, this month: sales, orders, fee, net, plus what is still waiting in the warehouse. */
export async function channelBreakdown() {
  const rows = await db.$queryRaw<{ channel: SalesChannel; total: bigint; orders: bigint; fee: bigint; today: bigint; last_at: Date | null }[]>`
    SELECT channel,
      coalesce(sum(total) FILTER (WHERE ${LOCAL} >= date_trunc('month', ${NOW})), 0) AS total,
      count(*) FILTER (WHERE ${LOCAL} >= date_trunc('month', ${NOW})) AS orders,
      coalesce(sum(commission) FILTER (WHERE ${LOCAL} >= date_trunc('month', ${NOW})), 0) AS fee,
      count(*) FILTER (WHERE ${LOCAL} >= date_trunc('day', ${NOW})) AS today,
      max("createdAt") AS last_at
    FROM "Order" WHERE status <> 'CANCELLED' GROUP BY channel`;
  const open = await db.order.groupBy({ by: ["channel"], where: { status: { notIn: ["SHIPPED", "CANCELLED"] } }, _count: true });
  const openBy = new Map(open.map((o) => [o.channel, o._count]));
  const byChannel = new Map(rows.map((r) => [r.channel, r]));
  return CHANNEL_ORDER.map((c) => {
    const r = byChannel.get(c);
    const total = n(r?.total ?? 0);
    const fee = n(r?.fee ?? 0);
    return { channel: c, total, orders: n(r?.orders ?? 0), fee, net: total - fee, today: n(r?.today ?? 0), lastAt: r?.last_at ?? null, open: openBy.get(c) ?? 0 };
  });
}

export async function topProducts(limit = 6) {
  const rows = await db.$queryRaw<{ id: string; sku: string; name: string; imageUrl: string | null; units: bigint; revenue: bigint }[]>`
    SELECT p.id, p.sku, p.name, p."imageUrl", sum(l.qty) AS units, sum(l.qty * l."unitPrice") AS revenue
    FROM "OrderLine" l JOIN "Order" o ON o.id = l."orderId" JOIN "Product" p ON p.id = l."productId"
    WHERE o.status <> 'CANCELLED' AND ((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') >= date_trunc('month', ${NOW})
    GROUP BY p.id ORDER BY revenue DESC LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, units: n(r.units), revenue: n(r.revenue) }));
}

export async function recentOrders(channel?: SalesChannel, take = 12) {
  return db.order.findMany({
    where: channel ? { channel } : {},
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, code: true, externalRef: true, channel: true, customerName: true, commune: true, total: true, status: true, createdAt: true, _count: { select: { lines: true } } },
  });
}
