import { PrismaClient, type Prisma, type SalesChannel } from "@prisma/client";
import { SCRIPTS, SLA_HOURS, SYSTEM_OPEN, fill } from "../src/features/inbox/scripts";

/**
 * Buyer conversations for the unified inbox: questions, shipping, returns, claims.
 * Replaces the existing ones. Run on its own with `pnpm tsx prisma/seed-chats.ts`.
 */
export async function seedChats(db: PrismaClient, now = new Date()) {
  let state = 4242;
  const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  await db.conversation.deleteMany();
  const shipped = await db.order.findMany({
    where: { status: "SHIPPED", channel: { not: "DIRECT" }, shippedAt: { gte: new Date(now.getTime() - 12 * 86_400_000) } },
    orderBy: { shippedAt: "desc" },
    take: 60,
    select: { id: true, externalRef: true, channel: true, customerName: true, lines: { take: 1, select: { product: { select: { name: true } } } } },
  });
  const open = await db.order.findMany({
    where: { status: { notIn: ["SHIPPED", "CANCELLED"] } },
    select: { id: true, externalRef: true, channel: true, customerName: true, lines: { take: 1, select: { product: { select: { name: true } } } } },
  });
  const products = (await db.product.findMany({ select: { name: true }, take: 30 })).map((p) => p.name);
  const buyers = ["Rocío Herrera", "Pablo Saavedra", "Constanza Pinto", "Martín Olivares", "Daniela Bravo", "Sebastián Cid", "Francisca Leiva", "Andrés Riquelme"];

  // [script index, minutes ago, state]: "open" = waiting on us, "waiting" = we answered, "resolved"
  const plan: [number, number, "open" | "waiting" | "resolved"][] = [
    [1, 6, "open"], [5, 14, "open"], [3, 22, "open"], [8, 35, "open"], [7, 48, "open"], [6, 70, "open"],
    [4, 95, "open"], [10, 130, "open"], [0, 160, "waiting"], [2, 240, "waiting"], [9, 300, "waiting"],
    [3, 420, "waiting"], [1, 600, "open"], [0, 900, "resolved"], [5, 1300, "resolved"], [2, 1700, "resolved"],
    [8, 2100, "resolved"], [9, 2600, "resolved"], [0, 3200, "resolved"], [6, 3900, "resolved"],
  ];
  const channels: SalesChannel[] = ["MERCADOLIBRE", "FALABELLA", "PARIS", "MERCADOLIBRE", "DIRECT"];
  let n = 0;
  for (const [si, minutesAgo, st] of plan) {
    const s = SCRIPTS[si];
    const pool = s.kind === "SHIPPING" || s.kind === "CANCEL" ? open : shipped;
    const order = s.needsOrder && pool.length ? pool[(n * 7) % pool.length] : null;
    const channel: SalesChannel = order?.channel ?? channels[n % channels.length];
    const product = order?.lines[0]?.product.name ?? pick(products);
    const ref = order?.externalRef ?? "";
    const start = new Date(now.getTime() - minutesAgo * 60_000);
    const msgs: Prisma.MessageCreateWithoutConversationInput[] = [{ author: "SYSTEM", body: SYSTEM_OPEN[s.kind], createdAt: start }];
    let t = start.getTime();
    for (const b of s.buyer) msgs.push({ author: "BUYER", body: fill(b, product, ref), createdAt: new Date((t += 40_000)) });
    if (st !== "open") {
      const reply = s.agent?.[0] ?? "Hola, gracias por escribir. Ya lo estamos revisando con bodega y te confirmamos hoy mismo.";
      msgs.push({ author: "AGENT", authorName: "Supervisor", body: fill(reply, product, ref), createdAt: new Date((t += 9 * 60_000)) });
    }
    if (st === "resolved") {
      msgs.push({ author: "BUYER", body: "Perfecto, muchas gracias!", createdAt: new Date((t += 30 * 60_000)) });
      if (s.returnStatus) msgs.push({ author: "SYSTEM", body: "Producto recibido en bodega y reembolso emitido", createdAt: new Date((t += 60 * 60_000)) });
    }
    const last = new Date(Math.min(t, now.getTime() - 30_000));
    await db.conversation.create({
      data: {
        channel,
        externalRef: `${channel.slice(0, 3)}-MSG-${880000 + n}`,
        kind: s.kind,
        status: st === "open" ? "OPEN" : st === "waiting" ? "WAITING" : "RESOLVED",
        returnStatus: s.returnStatus ? (st === "resolved" ? "REFUNDED" : s.returnStatus) : null,
        subject: s.subject,
        customerName: order?.customerName ?? buyers[n % buyers.length],
        orderId: order?.id ?? null,
        unread: st === "open" ? s.buyer.length : 0,
        dueAt: st === "resolved" ? null : new Date(start.getTime() + SLA_HOURS[channel] * 3_600_000),
        lastMessageAt: last,
        createdAt: start,
        messages: { create: msgs.map((m) => ({ ...m, createdAt: new Date(Math.min(new Date(m.createdAt!).getTime(), now.getTime() - 30_000)) })) },
      },
    });
    n++;
  }
  return n;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed-chats.ts")) {
  const db = new PrismaClient();
  seedChats(db)
    .then((n) => console.log(`${n} conversaciones creadas`))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
