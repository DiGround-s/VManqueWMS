import "server-only";
import { db } from "@/server/db";
import { mlConfig, mlConfigured } from "./mercadolibre/client";

export async function mlStatus() {
  const [account, notifications, counts] = await Promise.all([
    db.marketplaceAccount.findUnique({ where: { channel: "MERCADOLIBRE" }, select: { nickname: true, sellerId: true, expiresAt: true, connectedAt: true, updatedAt: true } }),
    db.marketplaceNotification.findMany({ where: { channel: "MERCADOLIBRE" }, orderBy: { receivedAt: "desc" }, take: 12 }),
    db.marketplaceNotification.groupBy({ by: ["status"], where: { channel: "MERCADOLIBRE" }, _count: true }),
  ]);
  const c = mlConfig();
  return {
    configured: mlConfigured(),
    apiUrl: c.api,
    clientId: c.clientId,
    account,
    notifications,
    counts: Object.fromEntries(counts.map((x) => [x.status, x._count])) as Record<string, number>,
  };
}
