import "server-only";
import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import { db } from "@/server/db";
import { open, seal } from "@/server/secret-box";
import { UserError } from "@/server/errors";
import { createOrder } from "@/features/orders/service";
import type { OrderInput } from "@/features/orders/schema";

/**
 * Connectors for Falabella, Walmart (Líder), Paris and Hites. Each speaks its store's API style:
 *  - Falabella Seller Center: query string signed with HMAC-SHA256 (UserID + API key) + webhooks.   (documented)
 *  - Walmart Marketplace Chile: OAuth 2.0 client credentials, WM_SEC.ACCESS_TOKEN header, polling.   (documented)
 *  - Paris, Hites: no public API docs → ASSUMED REST + API key (Bearer) + polling, to be confirmed at onboarding.
 * Base URLs come from the environment, so the same code points at the real API or at the lab test server.
 */
export type StoreChannel = "FALABELLA" | "WALMART" | "PARIS" | "HITES";
export const STORE_CHANNELS: StoreChannel[] = ["FALABELLA", "WALMART", "PARIS", "HITES"];

type Field = { name: "id" | "secret"; label: string };
export const STORE_INFO: Record<StoreChannel, { api: string; env: string; mode: "webhook" | "polling"; documented: boolean; prefix: string; fields: [Field, Field]; how: string }> = {
  FALABELLA: {
    api: "https://sellercenter-api.falabella.com",
    env: "FALABELLA_API_URL",
    mode: "webhook",
    documented: true,
    prefix: "FAL",
    fields: [{ name: "id", label: "UserID (correo de Seller Center)" }, { name: "secret", label: "API key" }],
    how: "Seller Center › Mi cuenta › Integraciones",
  },
  WALMART: {
    api: "https://marketplace.walmartapis.com",
    env: "WALMART_API_URL",
    mode: "polling",
    documented: true,
    prefix: "WMT",
    fields: [{ name: "id", label: "Client ID" }, { name: "secret", label: "Client Secret" }],
    how: "Seller Center › API Integration › API Key Management",
  },
  PARIS: {
    api: "https://api-developers.ecomm.cencosud.com",
    env: "PARIS_API_URL",
    mode: "polling",
    documented: false,
    prefix: "PAR",
    fields: [{ name: "id", label: "ID de vendedor" }, { name: "secret", label: "API key" }],
    how: "la entrega el ejecutivo de Paris Marketplace",
  },
  HITES: {
    api: "https://api.hites.com",
    env: "HITES_API_URL",
    mode: "polling",
    documented: false,
    prefix: "HIT",
    fields: [{ name: "id", label: "ID de vendedor" }, { name: "secret", label: "API key" }],
    how: "la entrega el equipo de marketplace de Hites",
  },
};

const base = (c: StoreChannel) => (process.env[STORE_INFO[c].env] ?? STORE_INFO[c].api).replace(/\/$/, "");
export const apiUrl = base;
const publicUrl = () => (process.env.APP_PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** A normalized order, whatever the store's format. */
type StoreOrder = { id: string; customer: string; address: string; commune: string; phone?: string; lines: { sku: string; qty: number }[]; isNew: boolean };

async function http<T>(url: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = body?.ErrorResponse?.Head?.ErrorMessage ?? body?.error?.[0]?.description ?? body?.error ?? r.statusText;
    throw new UserError(`${r.status}: ${msg}`);
  }
  return body as T;
}

/* ------------------------------------------------------------------ Falabella Seller Center */
function falabellaUrl(userId: string, apiKey: string, action: string, extra: Record<string, string> = {}) {
  const params: Record<string, string> = { Action: action, Format: "JSON", Timestamp: new Date().toISOString(), UserID: userId, Version: "1.0", ...extra };
  const canonical = Object.keys(params).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&");
  const signature = createHmac("sha256", apiKey).update(canonical).digest("hex");
  return `${base("FALABELLA")}/?${canonical}&Signature=${signature}`;
}
type FalOrder = { OrderId: number; CustomerFirstName: string; CustomerLastName: string; AddressShipping: { FirstName: string; Address1: string; City: string; Phone?: string }; Statuses: { Status: string } };
const asList = <T,>(x: T | T[] | undefined): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
async function falabellaOrder(userId: string, key: string, o: FalOrder): Promise<StoreOrder> {
  const items = await http<{ SuccessResponse: { Body: { OrderItems: { OrderItem: { Sku: string }[] | { Sku: string } } } } }>(falabellaUrl(userId, key, "GetOrderItems", { OrderId: String(o.OrderId) }));
  const qty = new Map<string, number>();
  for (const i of asList(items.SuccessResponse.Body.OrderItems.OrderItem)) qty.set(i.Sku, (qty.get(i.Sku) ?? 0) + 1); // one OrderItem per unit
  return { id: String(o.OrderId), customer: o.AddressShipping.FirstName || `${o.CustomerFirstName} ${o.CustomerLastName}`, address: o.AddressShipping.Address1, commune: o.AddressShipping.City, phone: o.AddressShipping.Phone, lines: [...qty].map(([sku, n]) => ({ sku, qty: n })), isNew: o.Statuses.Status === "pending" };
}

/* ------------------------------------------------------------------ Walmart Chile */
async function walmartToken(clientId: string, secret: string) {
  const r = await http<{ access_token: string; expires_in: number }>(`${base("WALMART")}/v3/token`, {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded", accept: "application/json", "WM_QOS.CORRELATION_ID": randomUUID(), "WM_SVC.NAME": "Walmart Marketplace" },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  return r;
}
/** Walmart call with the cached token; a 401 (token revoked or expired early) renews it once and retries. */
async function walmart<T>(path: string, method = "GET"): Promise<T> {
  const call = async (force: boolean) => http<T>(`${base("WALMART")}${path}`, { method, headers: walmartHeaders(await walmartAccess(force)) });
  try {
    return await call(false);
  } catch (e) {
    if (e instanceof UserError && e.message.startsWith("401")) return call(true);
    throw e;
  }
}
const walmartHeaders = (token: string) => ({ "WM_SEC.ACCESS_TOKEN": token, "WM_QOS.CORRELATION_ID": randomUUID(), "WM_SVC.NAME": "Walmart Marketplace", accept: "application/json" });
type WmtOrder = { purchaseOrderId: string; shippingInfo: { phone?: string; postalAddress: { name: string; address1: string; city: string } }; orderLines: { orderLine: { item: { sku: string }; orderLineQuantity: { amount: string }; orderLineStatuses: { orderLineStatus: { status: string }[] } }[] } };

/* ------------------------------------------------------------------ Paris / Hites (assumed REST) */
type RestOrder = { id: string; status: string; customer: { name: string; phone?: string }; shippingAddress: { street: string; commune: string }; items: { sku: string; quantity: number }[] };

/* ------------------------------------------------------------------ credentials */
async function credentials(c: StoreChannel) {
  const acc = await db.marketplaceAccount.findUnique({ where: { channel: c } });
  if (!acc) throw new UserError(`${c} no está conectada.`);
  return { acc, id: acc.sellerId, secret: open(acc.refreshToken) };
}

/** Walmart token cached in the account; renewed when it is about to expire (it lasts ~15 minutes) or was rejected. */
async function walmartAccess(force = false) {
  const { acc, id, secret } = await credentials("WALMART");
  if (!force && acc.expiresAt.getTime() - Date.now() > 60_000) return open(acc.accessToken);
  const t = await walmartToken(id, secret);
  await db.marketplaceAccount.update({ where: { channel: "WALMART" }, data: { accessToken: seal(t.access_token), expiresAt: new Date(Date.now() + t.expires_in * 1000) } });
  return t.access_token;
}

/** Lists recent orders (last 2 days) in a common shape. */
async function listOrders(c: StoreChannel): Promise<StoreOrder[]> {
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
  if (c === "FALABELLA") {
    const { id, secret } = await credentials(c);
    const r = await http<{ SuccessResponse: { Body: { Orders: { Order: FalOrder[] | FalOrder } } } }>(falabellaUrl(id, secret, "GetOrders", { CreatedAfter: since, Limit: "100" }));
    return Promise.all(asList(r.SuccessResponse.Body.Orders.Order).map((o) => falabellaOrder(id, secret, o)));
  }
  if (c === "WALMART") {
    const r = await walmart<{ list: { elements: { order: WmtOrder[] } } }>(`/v3/orders?createdStartDate=${encodeURIComponent(since)}&limit=100`);
    return r.list.elements.order.map((o) => ({
      id: o.purchaseOrderId,
      customer: o.shippingInfo.postalAddress.name,
      address: o.shippingInfo.postalAddress.address1,
      commune: o.shippingInfo.postalAddress.city,
      phone: o.shippingInfo.phone,
      lines: o.orderLines.orderLine.map((l) => ({ sku: l.item.sku, qty: Number(l.orderLineQuantity.amount) })),
      isNew: o.orderLines.orderLine.every((l) => l.orderLineStatuses.orderLineStatus[0]?.status === "Created"),
    }));
  }
  const { secret } = await credentials(c);
  const r = await http<{ data: RestOrder[] }>(`${base(c)}/v1/orders?createdFrom=${encodeURIComponent(since)}`, { headers: { authorization: `Bearer ${secret}`, accept: "application/json" } });
  return r.data.map((o) => ({ id: o.id, customer: o.customer.name, address: o.shippingAddress.street, commune: o.shippingAddress.commune, phone: o.customer.phone, lines: o.items.map((i) => ({ sku: i.sku, qty: i.quantity })), isNew: o.status === "NEW" }));
}

/** Tells the store we took the order (Walmart acknowledge; assumed "accept" for Paris/Hites). Falabella needs nothing here. */
async function acknowledge(c: StoreChannel, orderId: string) {
  if (c === "WALMART") {
    await walmart(`/v3/orders/${encodeURIComponent(orderId)}/acknowledge`, "POST");
  } else if (c === "PARIS" || c === "HITES") {
    const { secret } = await credentials(c);
    await http(`${base(c)}/v1/orders/${encodeURIComponent(orderId)}/accept`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
  }
}

const externalRef = (c: StoreChannel, id: string) => `${STORE_INFO[c].prefix}-${id}`;

/** Creates the WMS order (idempotent by externalRef) and confirms it to the store. */
async function importOrder(c: StoreChannel, o: StoreOrder) {
  const input: OrderInput = {
    externalRef: externalRef(c, o.id),
    channel: c,
    customerName: o.customer,
    address: o.address,
    commune: o.commune,
    phone: o.phone,
    carrier: c === "FALABELLA" ? "Falabella (Fpay Envíos)" : undefined,
    notes: `${c === "WALMART" ? "Walmart" : c[0] + c.slice(1).toLowerCase()} · pedido ${o.id}`,
    priority: 0,
    shippingFee: 0,
    lines: o.lines,
  };
  const r = await createOrder(input, "API");
  if (r.created && o.isNew) await acknowledge(c, o.id);
  return r;
}

const log = (c: StoreChannel, externalId: string, topic: string, resource: string, status: "PROCESSED" | "ERROR" | "IGNORED", result: string) =>
  db.marketplaceNotification.upsert({
    where: { externalId },
    create: { channel: c, externalId, topic, resource, userId: "-", status, result: result.slice(0, 500), processedAt: new Date() },
    update: { attempts: { increment: 1 }, status, result: result.slice(0, 500), processedAt: new Date() },
  });

/** Polling: brings every recent order the WMS does not have yet. Errors per order are logged, not thrown. */
export async function pollStore(c: StoreChannel) {
  const orders = await listOrders(c);
  let created = 0;
  for (const o of orders) {
    if (await db.order.findUnique({ where: { externalRef: externalRef(c, o.id) }, select: { id: true } })) continue;
    try {
      const r = await importOrder(c, o);
      if (r.created) created += 1;
      await log(c, `poll-${c}-${o.id}`, "polling", `pedido ${o.id}`, "PROCESSED", `Pedido ${r.code} creado${o.isNew && c !== "FALABELLA" ? " y confirmado a la tienda" : ""}`);
    } catch (e) {
      await log(c, `poll-${c}-${o.id}`, "polling", `pedido ${o.id}`, "ERROR", e instanceof Error ? e.message : String(e));
    }
  }
  return { checked: orders.length, created };
}

/** Falabella webhook processing: reads the order with our credentials (the notice itself is not trusted). */
export async function processFalabellaNotification(id: string) {
  const n = await db.marketplaceNotification.findUnique({ where: { id } });
  if (!n || n.status === "PROCESSED") return;
  try {
    const { id: userId, secret } = await credentials("FALABELLA");
    const orderId = n.resource.replace(/^OrderId /, "");
    const r = await http<{ SuccessResponse: { Body: { Orders: { Order: FalOrder } } } }>(falabellaUrl(userId, secret, "GetOrder", { OrderId: orderId }));
    const o = await falabellaOrder(userId, secret, r.SuccessResponse.Body.Orders.Order);
    const res = n.topic === "onOrderCreated" || !(await db.order.findUnique({ where: { externalRef: externalRef("FALABELLA", o.id) } })) ? await importOrder("FALABELLA", o) : null;
    await db.marketplaceNotification.update({ where: { id }, data: { status: "PROCESSED", processedAt: new Date(), result: res ? (res.created ? `Pedido ${res.code} creado` : `${res.code} ya existía (aviso repetido)`) : "Cambio de estado registrado" } });
  } catch (e) {
    await db.marketplaceNotification.update({ where: { id }, data: { status: "ERROR", processedAt: new Date(), result: (e instanceof Error ? e.message : String(e)).slice(0, 500) } });
  }
}

/* ------------------------------------------------------------------ connect */

/** Validates the credentials against the store before saving them (encrypted). Falabella also registers its webhook. */
export async function connectStore(c: StoreChannel, id: string, secret: string) {
  let accessToken = "";
  let expiresAt = new Date(Date.now() + 3650 * 86_400_000); // API keys do not expire
  if (c === "FALABELLA") await http(falabellaUrl(id, secret, "GetOrders", { Limit: "1" }));
  else if (c === "WALMART") {
    const t = await walmartToken(id, secret);
    accessToken = t.access_token;
    expiresAt = new Date(Date.now() + t.expires_in * 1000);
  } else await http(`${base(c)}/v1/orders?createdFrom=${encodeURIComponent(new Date().toISOString())}`, { headers: { authorization: `Bearer ${secret}` } });

  const webhookToken = c === "FALABELLA" ? randomBytes(18).toString("base64url") : null;
  if (c === "FALABELLA") {
    const callback = `${publicUrl()}/api/v1/integraciones/falabella/webhook?k=${webhookToken}`;
    await http(falabellaUrl(id, secret, "CreateWebhook", { CallbackUrl: callback, Events: "onOrderCreated,onOrderItemsStatusChanged" }));
  }
  const data = { sellerId: id, nickname: id, accessToken: seal(accessToken), refreshToken: seal(secret), expiresAt, webhookToken: webhookToken ? createHash("sha256").update(webhookToken).digest("hex") : null };
  await db.marketplaceAccount.upsert({ where: { channel: c }, create: { channel: c, ...data }, update: { ...data, connectedAt: new Date() } });
}

/** The webhook URL carries a random token; only its hash is stored. */
export async function falabellaWebhookAllowed(token: string | null) {
  if (!token) return false;
  const acc = await db.marketplaceAccount.findUnique({ where: { channel: "FALABELLA" }, select: { webhookToken: true } });
  return Boolean(acc?.webhookToken && acc.webhookToken === createHash("sha256").update(token).digest("hex"));
}
