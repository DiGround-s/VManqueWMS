"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";
import { createOrder } from "@/features/orders/service";
import { CHANNEL_VALUES } from "@/features/orders/schema";
import { CHANNELS } from "@/lib/channels";
import { liveSnapshot } from "./live-service";

const NAMES = ["Camila Rojas", "Diego Vargas", "Sofía Navarro", "Lucas Torres", "Emilia Carrasco", "Felipe Sepúlveda", "Javiera Morales", "Ignacio Fuentes"];
const PLACES: [string, string][] = [["Av. Providencia 1234", "Providencia"], ["Av. Grecia 2550", "Ñuñoa"], ["Los Leones 980", "Providencia"], ["Av. Libertad 455", "Viña del Mar"], ["Calle O'Higgins 1020", "Concepción"], ["Av. Alemania 0870", "Temuco"]];
const r = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/**
 * Demo of a marketplace integration: builds the order a store's webhook would send and
 * runs it through the same service the API uses (`/api/v1/webhooks/<store>`).
 */
export const simulateIncomingOrderAction = action("SUPERVISOR", z.object({ channel: z.enum(CHANNEL_VALUES).optional() }), async ({ channel }) => {
  const ch = channel ?? r(["MERCADOLIBRE", "MERCADOLIBRE", "FALABELLA", "PARIS", "DIRECT"] as const);
  // Only products with shelf stock, so the new order can be picked right away.
  const stocked = await db.product.findMany({ where: { active: true, stock: { some: { qty: { gt: 2 }, location: { role: { not: "DOCK" } } } } }, select: { sku: true } });
  const skus = [...stocked].sort(() => Math.random() - 0.5).slice(0, Math.random() < 0.6 ? 1 : 2);
  const [address, commune] = r(PLACES);
  const ref = `${CHANNELS[ch].refPrefix}-${ch === "MERCADOLIBRE" ? 2200000000 + Math.floor(Math.random() * 99999999) : 300000 + Math.floor(Math.random() * 99999)}`;
  const order = await createOrder(
    {
      externalRef: ref,
      customerName: r(NAMES),
      address,
      commune,
      phone: undefined,
      notes: undefined,
      carrier: ch === "DIRECT" ? "Chilexpress" : r(["Starken", "Chilexpress", "Blue Express"]),
      priority: 0,
      channel: ch,
      shippingFee: ch === "DIRECT" ? 3990 : 0,
      lines: skus.map((s) => ({ sku: s.sku, qty: 1 })),
    },
    "API",
  );
  revalidatePath("/", "layout");
  return { code: order.code, ref, store: CHANNELS[ch].label };
});

/** Polled by the live board. */
export const liveSnapshotAction = action("OPERATOR", z.object({}), async () => liveSnapshot());
