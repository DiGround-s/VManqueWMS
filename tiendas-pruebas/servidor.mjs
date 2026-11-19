// Entorno de pruebas de Falabella, Walmart (Líder), Paris y Hites para el laboratorio.
//   node tiendas-pruebas/servidor.mjs   → http://127.0.0.1:4200  (panel del comprador en /)
//
// Cada tienda imita la forma de su API:
//  · Falabella Seller Center (documentada): GET /falabella/?Action=...&UserID=...&Timestamp=...&Signature=<HMAC-SHA256>,
//    acciones GetOrders, GetOrder, GetOrderItems, CreateWebhook y SetStatusToReadyToShip; avisa con webhooks (onOrderCreated).
//  · Walmart Chile (documentada): OAuth2 client credentials en POST /walmart/v3/token (Basic id:secreto) y token en la
//    cabecera WM_SEC.ACCESS_TOKEN; GET /v3/orders y POST /v3/orders/{po}/acknowledge. Sin webhooks: se consulta.
//  · Paris y Hites (sin documentación pública): SUPUESTO de una API REST con API key (Bearer) y consulta periódica.
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const PORT = Number(process.env.TIENDAS_SIM_PORT ?? 4200);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.join(aqui, "evidencia");
fs.mkdirSync(EVID, { recursive: true });
const ESTADO = path.join(EVID, "estado.json");

// Credenciales que cada tienda le «entrega» al vendedor (sólo laboratorio).
export const CRED = {
  FALABELLA: { userId: "integraciones@vmanque.cl", apiKey: "lab-fala-6f1c0d9e4b7a2c58" },
  WALMART: { clientId: "lab-wmt-client-31b7", clientSecret: "lab-wmt-secreto-9e04c2" },
  PARIS: { sellerId: "PAR-77012", apiKey: "lab-paris-key-5d2a91" },
  HITES: { sellerId: "HIT-4410", apiKey: "lab-hites-key-c37e08" },
};
const TOKEN_TTL = Number(process.env.WALMART_SIM_TTL ?? 900); // Walmart: ~15 min

const vacio = () => ({ seq: 0, orders: [], webhooks: [], notifs: [], tokens: {} });
let S = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, "utf8")) : vacio();
const guardar = () => fs.writeFileSync(ESTADO, JSON.stringify(S, null, 1));
const catalogo = () => {
  const f = path.join(aqui, "..", "ml-pruebas", "publicaciones.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).map((p) => ({ sku: p.seller_sku, title: p.title, price: p.price, thumbnail: p.thumbnail })) : [];
};
const ahora = () => new Date().toISOString();
const log = (...a) => console.log(`[${new Date().toLocaleTimeString("es-CL")}]`, ...a);
const json = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};
async function leer(req) {
  let d = "";
  for await (const c of req) d += c;
  try {
    return d ? JSON.parse(d) : {};
  } catch {
    return Object.fromEntries(new URLSearchParams(d));
  }
}

// ------------------------------------------------------------------ compras (panel del comprador)
function comprar({ tienda, sku, qty = 1, nombre = "Comprador de prueba", calle = "Av. Apoquindo", numero = "4500", comuna = "Las Condes", telefono = "+56 9 4444 1212" }) {
  const p = catalogo().find((x) => x.sku === sku);
  if (!p) throw new Error("producto no existe");
  const n = ++S.seq;
  const o = {
    tienda, n, sku, title: p.title, qty: Number(qty), price: p.price, nombre, calle, numero, comuna, telefono, creado: ahora(), estado: "pendiente",
    id: { FALABELLA: String(3100000 + n), WALMART: `P${String(220000000000 + n)}`, PARIS: `${7000000 + n}-A`, HITES: `HT${900000 + n}` }[tienda],
  };
  S.orders.unshift(o);
  guardar();
  log(`venta ${tienda} ${o.id}: ${o.qty} × ${sku}`);
  if (tienda === "FALABELLA") avisarFalabella("onOrderCreated", { OrderId: Number(o.id) });
  return o;
}

// Webhooks de Falabella: el vendedor registró su URL con CreateWebhook; la tienda reintenta si no recibe 200.
async function avisarFalabella(evento, payload) {
  for (const w of S.webhooks.filter((x) => x.events.includes(evento))) {
    const n = { tienda: "FALABELLA", evento, payload, url: w.url.replace(/k=[^&]+/, "k=…"), intentos: 0, http: null, ms: null, hora: ahora() };
    S.notifs.unshift(n);
    S.notifs = S.notifs.slice(0, 100);
    const enviar = async () => {
      n.intentos += 1;
      const t0 = Date.now();
      try {
        const r = await fetch(w.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: evento, payload }), signal: AbortSignal.timeout(3000) });
        n.http = r.status;
      } catch (e) {
        n.http = e.name === "TimeoutError" ? "timeout" : "sin conexión";
      }
      n.ms = Date.now() - t0;
      guardar();
      log(`webhook Falabella ${evento} intento ${n.intentos} → ${n.http}`);
      if (n.http !== 200 && n.intentos < 5) setTimeout(enviar, 3000);
    };
    enviar();
  }
}

// ------------------------------------------------------------------ Falabella Seller Center
// Firma: parámetros (sin Signature) ordenados por nombre, codificados y unidos con &; HMAC-SHA256 con la API key, en hex.
const firmaFalabella = (params, key) =>
  crypto.createHmac("sha256", key).update(Object.keys(params).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&")).digest("hex");
const FE = { pendiente: "pending", confirmado: "ready_to_ship", despachado: "shipped", cancelado: "canceled" };
function falabella(u, res) {
  const q = Object.fromEntries(u.searchParams);
  const { Signature, ...rest } = q;
  const head = (body) => json(res, 200, { SuccessResponse: { Head: { RequestId: crypto.randomUUID(), RequestAction: q.Action, ResponseType: "", Timestamp: ahora() }, Body: body } });
  const err = (code, msg) => json(res, code === 7 ? 403 : 400, { ErrorResponse: { Head: { RequestAction: q.Action, ErrorType: "Sender", ErrorCode: code, ErrorMessage: msg } } });
  if (q.UserID !== CRED.FALABELLA.userId) return err(7, "E007: Login failed. Signature mismatch");
  if (!Signature || Signature !== firmaFalabella(rest, CRED.FALABELLA.apiKey)) return err(7, "E007: Login failed. Signature mismatch");
  if (!q.Timestamp || Math.abs(Date.now() - Date.parse(q.Timestamp)) > 10 * 60_000) return err(1, "E001: Parameter Timestamp is invalid or expired");
  const mios = S.orders.filter((o) => o.tienda === "FALABELLA");
  const orden = (o) => ({
    OrderId: Number(o.id), OrderNumber: String(o.id), CustomerFirstName: o.nombre.split(" ")[0], CustomerLastName: o.nombre.split(" ").slice(1).join(" "),
    CreatedAt: o.creado, Price: String(o.price * o.qty), ItemsCount: o.qty, Statuses: { Status: FE[o.estado] },
    AddressShipping: { FirstName: o.nombre, Address1: `${o.calle} ${o.numero}`, City: o.comuna, Ward: o.comuna, Phone: o.telefono, Country: "Chile" },
  });
  switch (q.Action) {
    case "GetOrders":
      return head({ Orders: { Order: mios.filter((o) => !q.CreatedAfter || o.creado >= q.CreatedAfter).slice(0, Number(q.Limit ?? 100)).map(orden) } });
    case "GetOrder": {
      const o = mios.find((x) => x.id === q.OrderId);
      return o ? head({ Orders: { Order: orden(o) } }) : err(16, "E016: Invalid Order ID");
    }
    case "GetOrderItems": {
      const o = mios.find((x) => x.id === q.OrderId);
      if (!o) return err(16, "E016: Invalid Order ID");
      // Seller Center entrega un OrderItem por unidad vendida.
      return head({ OrderItems: { OrderItem: Array.from({ length: o.qty }, (_, i) => ({ OrderItemId: Number(o.id) * 10 + i, Sku: o.sku, Name: o.title, ItemPrice: String(o.price), ShippingType: "Dropshipping", Status: FE[o.estado] })) } });
    }
    case "CreateWebhook": {
      const url = q.CallbackUrl;
      const events = String(q.Events ?? "").split(",").filter(Boolean);
      S.webhooks = S.webhooks.filter((w) => w.url.split("?")[0] !== url.split("?")[0]);
      S.webhooks.push({ id: crypto.randomUUID(), url, events, creado: ahora() });
      guardar();
      log(`webhook registrado: ${url.replace(/k=[^&]+/, "k=…")} (${events.join(", ")})`);
      return head({ Webhook: { webhookId: S.webhooks.at(-1).id } });
    }
    case "SetStatusToReadyToShip": {
      const o = mios.find((x) => x.id === q.OrderId);
      if (!o) return err(16, "E016: Invalid Order ID");
      o.estado = "confirmado";
      guardar();
      return head({ OrderItems: { OrderItem: { PurchaseOrderId: o.id } } });
    }
    default:
      return err(8, `E008: Invalid Action ${q.Action}`);
  }
}

// ------------------------------------------------------------------ Walmart Chile
async function walmart(req, res, sub) {
  if (req.method === "POST" && sub === "/v3/token") {
    const [id, secret] = Buffer.from((req.headers.authorization ?? "").replace(/^Basic\s+/i, ""), "base64").toString().split(":");
    const body = await leer(req);
    if (id !== CRED.WALMART.clientId || secret !== CRED.WALMART.clientSecret) return json(res, 401, { error: [{ code: "UNAUTHORIZED.GMP_GATEWAY_API", description: "Unauthorized" }] });
    if (body.grant_type !== "client_credentials") return json(res, 400, { error: [{ code: "INVALID_REQUEST", description: "grant_type" }] });
    const tok = `eyJ.lab.${crypto.randomBytes(18).toString("base64url")}`;
    S.tokens[tok] = Date.now() + TOKEN_TTL * 1000;
    guardar();
    return json(res, 200, { access_token: tok, token_type: "Bearer", expires_in: TOKEN_TTL });
  }
  const tok = req.headers["wm_sec.access_token"];
  if (!tok || !(S.tokens[tok] > Date.now())) return json(res, 401, { error: [{ code: "UNAUTHORIZED.GMP_GATEWAY_API", description: "Invalid or expired token" }] });
  if (!req.headers["wm_qos.correlation_id"]) return json(res, 400, { error: [{ code: "MISSING_HEADER", description: "WM_QOS.CORRELATION_ID" }] });
  const mios = S.orders.filter((o) => o.tienda === "WALMART");
  const po = (o) => ({
    purchaseOrderId: o.id, customerOrderId: `C${o.n}`, orderDate: Date.parse(o.creado),
    shippingInfo: { phone: o.telefono, postalAddress: { name: o.nombre, address1: `${o.calle} ${o.numero}`, city: o.comuna, country: "CHL" } },
    orderLines: { orderLine: [{ lineNumber: "1", item: { productName: o.title, sku: o.sku }, orderLineQuantity: { unitOfMeasurement: "EACH", amount: String(o.qty) }, charges: { charge: [{ chargeType: "PRODUCT", chargeAmount: { currency: "CLP", amount: o.price } }] }, orderLineStatuses: { orderLineStatus: [{ status: o.estado === "pendiente" ? "Created" : "Acknowledged" }] } }] },
  });
  if (req.method === "GET" && sub.startsWith("/v3/orders")) {
    const u = new URL(req.url, "http://x");
    const desde = u.searchParams.get("createdStartDate");
    const estado = u.searchParams.get("status");
    const xs = mios.filter((o) => (!desde || o.creado >= desde) && (!estado || (estado === "Created" ? o.estado === "pendiente" : o.estado !== "pendiente")));
    return json(res, 200, { list: { meta: { totalCount: xs.length, limit: 100 }, elements: { order: xs.map(po) } } });
  }
  const m = sub.match(/^\/v3\/orders\/([^/]+)\/acknowledge$/);
  if (req.method === "POST" && m) {
    const o = mios.find((x) => x.id === m[1]);
    if (!o) return json(res, 404, { error: [{ code: "CONTENT_NOT_FOUND", description: "PO not found" }] });
    o.estado = "confirmado";
    guardar();
    log(`Walmart: pedido ${o.id} confirmado (acknowledge)`);
    return json(res, 200, { order: po(o) });
  }
  return json(res, 404, { error: [{ code: "NOT_FOUND", description: sub }] });
}

// ------------------------------------------------------------------ Paris y Hites (supuesto: REST + API key)
async function generica(tienda, req, res, sub) {
  if ((req.headers.authorization ?? "") !== `Bearer ${CRED[tienda].apiKey}`) return json(res, 401, { error: "API key inválida" });
  const mios = S.orders.filter((o) => o.tienda === tienda);
  const fmt = (o) => ({
    id: o.id, sellerId: CRED[tienda].sellerId, createdAt: o.creado, status: o.estado === "pendiente" ? "NEW" : "ACCEPTED",
    customer: { name: o.nombre, phone: o.telefono }, shippingAddress: { street: `${o.calle} ${o.numero}`, commune: o.comuna },
    items: [{ sku: o.sku, name: o.title, quantity: o.qty, unitPrice: o.price }],
  });
  if (req.method === "GET" && sub === "/v1/orders") {
    const desde = new URL(req.url, "http://x").searchParams.get("createdFrom");
    return json(res, 200, { data: mios.filter((o) => !desde || o.creado >= desde).map(fmt) });
  }
  const m = sub.match(/^\/v1\/orders\/([^/]+)\/accept$/);
  if (req.method === "POST" && m) {
    const o = mios.find((x) => x.id === m[1]);
    if (!o) return json(res, 404, { error: "no existe" });
    o.estado = "confirmado";
    guardar();
    return json(res, 200, fmt(o));
  }
  return json(res, 404, { error: sub });
}

// ------------------------------------------------------------------ servidor
http
  .createServer(async (req, res) => {
    const u = new URL(req.url, `http://${req.headers.host}`);
    const p = u.pathname;
    try {
      if (req.method === "GET" && p === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(fs.readFileSync(path.join(aqui, "panel.html"), "utf8"));
      }
      if (req.method === "GET" && p === "/sim/estado") return json(res, 200, { catalogo: catalogo(), orders: S.orders.slice(0, 60), webhooks: S.webhooks.map((w) => ({ ...w, url: w.url.replace(/k=[^&]+/, "k=…") })), notifs: S.notifs.slice(0, 30) });
      if (req.method === "POST" && p === "/sim/comprar") return json(res, 200, comprar(await leer(req)));
      if (req.method === "POST" && p === "/sim/expirar-token") {
        for (const k of Object.keys(S.tokens)) S.tokens[k] = 0;
        guardar();
        return json(res, 200, { ok: true });
      }
      if (p === "/falabella/" || p === "/falabella") return falabella(u, res);
      if (p.startsWith("/walmart/")) return walmart(req, res, p.slice(8));
      if (p.startsWith("/paris/")) return generica("PARIS", req, res, p.slice(6));
      if (p.startsWith("/hites/")) return generica("HITES", req, res, p.slice(6));
      return json(res, 404, { error: "no existe" });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  })
  .listen(PORT, "127.0.0.1", () => log(`Entorno de pruebas de las tiendas de Falabella, Walmart, Paris y Hites en http://127.0.0.1:${PORT}`));
