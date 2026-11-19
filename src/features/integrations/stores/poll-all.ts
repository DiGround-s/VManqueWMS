import "server-only";
import { db } from "@/server/db";
import { pollOrders } from "../mercadolibre/sync";
import { pollStore, STORE_CHANNELS } from "./connectors";

/** One polling round over every connected store (backup for webhooks, main path for stores without them). */
export async function pollAllStores() {
  const connected = new Set((await db.marketplaceAccount.findMany({ select: { channel: true } })).map((a) => a.channel));
  const out: Record<string, string> = {};
  for (const c of STORE_CHANNELS) {
    if (!connected.has(c)) continue;
    try {
      const r = await pollStore(c);
      out[c] = `${r.checked} revisados, ${r.created} nuevos`;
    } catch (e) {
      out[c] = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  if (connected.has("MERCADOLIBRE")) {
    try {
      const r = await pollOrders();
      out.MERCADOLIBRE = `${r.checked} revisados, ${r.created} nuevos`;
    } catch (e) {
      out.MERCADOLIBRE = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  return out;
}
