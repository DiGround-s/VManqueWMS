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

/** Connection and last events of Falabella, Walmart, Paris and Hites. */
export async function storesStatus() {
  const { STORE_CHANNELS, STORE_INFO, apiUrl } = await import("./stores/connectors");
  return Promise.all(
    STORE_CHANNELS.map(async (c) => {
      const [account, notifications] = await Promise.all([
        db.marketplaceAccount.findUnique({ where: { channel: c }, select: { sellerId: true, connectedAt: true, expiresAt: true } }),
        db.marketplaceNotification.findMany({ where: { channel: c }, orderBy: { receivedAt: "desc" }, take: 6 }),
      ]);
      const i = STORE_INFO[c];
      return { channel: c, apiUrl: apiUrl(c), mode: i.mode, documented: i.documented, fields: i.fields, how: i.how, account, notifications };
    }),
  );
}
