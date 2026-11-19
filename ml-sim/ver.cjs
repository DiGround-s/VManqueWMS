// Muestra lo que el conector dejó en la base: avisos, pedidos y conversaciones de Mercado Libre.
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  console.log(await db.marketplaceNotification.findMany({ orderBy: { receivedAt: "desc" }, take: 8, select: { topic: true, status: true, attempts: true, result: true } }));
  console.log(JSON.stringify(await db.order.findMany({ where: { externalRef: { startsWith: "MLC-2000010" } }, select: { code: true, externalRef: true, status: true, customerName: true, address: true, commune: true, total: true, lines: { select: { qty: true, product: { select: { sku: true } } } } } }), null, 1));
  console.log(JSON.stringify(await db.conversation.findMany({ where: { externalRef: { startsWith: "MLC-" } }, select: { externalRef: true, kind: true, status: true, subject: true, customerName: true, orderId: true, messages: { select: { author: true, body: true } } } }), null, 1));
  await db.$disconnect();
})();
