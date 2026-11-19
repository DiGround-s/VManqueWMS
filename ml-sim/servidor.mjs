// Mercado Libre simulado para el laboratorio: misma forma de API, OAuth y notificaciones que api.mercadolibre.com.
//   node ml-sim/servidor.mjs        → http://127.0.0.1:4100  (API, autorización y página del comprador en /comprador)
// La web de VManque se conecta igual que a la API real: sólo cambia la dirección base (ML_API_URL / ML_AUTH_URL).
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { PORT, APP, SELLER, BUYERS, TOKEN_TTL, NOTIF } from "./config.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.join(aqui, "evidencia");
fs.mkdirSync(EVID, { recursive: true });
const ESTADO = path.join(EVID, "estado.json");
const PUBS = path.join(aqui, "publicaciones.json");

// ------------------------------------------------------------------ estado (se guarda en evidencia/estado.json)
const vacio = () => ({ seq: { order: 0, ship: 0, question: 0, claim: 0 }, orders: {}, shipments: {}, questions: {}, messages: {}, claims: {}, codes: {}, tokens: {}, refresh: {}, notifs: [] });
let S = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, "utf8")) : vacio();
const guardar = () => fs.writeFileSync(ESTADO, JSON.stringify(S, null, 1));
const pubs = () => (fs.existsSync(PUBS) ? JSON.parse(fs.readFileSync(PUBS, "utf8")) : []);
const ahora = () => new Date().toISOString();
const hex = (n) => crypto.randomBytes(n).toString("hex");
const log = (...a) => console.log(`[${new Date().toLocaleTimeString("es-CL")}]`, ...a);

// ------------------------------------------------------------------ notificaciones (webhook hacia la app)
async function notificar(topic, resource) {
  const n = { _id: crypto.randomUUID(), resource, user_id: SELLER.id, topic, application_id: Number(APP.id), attempts: 0, sent: null, received: ahora(), estado: "pendiente", http: null };
  S.notifs.unshift(n);
  S.notifs = S.notifs.slice(0, 300);
  guardar();
  enviar(n);
  return n;
}
async function enviar(n) {
  n.attempts += 1;
  n.sent = ahora();
  const body = { _id: n._id, resource: n.resource, user_id: n.user_id, topic: n.topic, application_id: n.application_id, attempts: n.attempts, sent: n.sent, received: n.received };
  const t0 = Date.now();
  try {
    const r = await fetch(APP.callbackUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(NOTIF.timeoutMs) });
    n.http = r.status;
    n.ms = Date.now() - t0;
    n.estado = r.status === 200 ? "entregada" : "reintentando";
  } catch (e) {
    n.http = e.name === "TimeoutError" ? "timeout" : "sin conexión";
    n.ms = Date.now() - t0;
    n.estado = "reintentando";
  }
  fs.appendFileSync(path.join(EVID, "notificaciones.csv"), `${n.sent};${n.topic};${n.resource};${n.attempts};${n.http};${n.ms}\n`);
  log(`aviso ${n.topic} ${n.resource} intento ${n.attempts} → ${n.http} (${n.ms} ms)`);
  if (n.estado !== "entregada") {
    if (n.attempts < NOTIF.retries) setTimeout(() => enviar(n), NOTIF.everyMs);
    else n.estado = "fallida";
  }
  guardar();
}

// ------------------------------------------------------------------ utilidades HTTP
const json = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(data));
};
const mlError = (res, status, error, message) => json(res, status, { message, error, status, cause: [] });
const html = (res, body) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
};
async function leer(req) {
  let d = "";
  for await (const c of req) d += c;
  if (!d) return {};
  if ((req.headers["content-type"] ?? "").includes("application/x-www-form-urlencoded")) return Object.fromEntries(new URLSearchParams(d));
  try {
    return JSON.parse(d);
  } catch {
    return Object.fromEntries(new URLSearchParams(d));
  }
}
function autenticar(req, res) {
  const tok = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const t = S.tokens[tok];
  if (!t) return mlError(res, 401, "unauthorized", "invalid access token"), null;
  if (Date.parse(t.expira) < Date.now()) return mlError(res, 401, "unauthorized", "expired_token"), null;
  return t;
}
const nombre = (u) => `${u.first_name} ${u.last_name}`;
const usuario = (id) => (Number(id) === SELLER.id ? SELLER : BUYERS.find((b) => b.id === Number(id)));

// ------------------------------------------------------------------ acciones del comprador (las usa la página /comprador)
function comprar({ buyer = 0, item, qty = 1, nombre: rec, calle, numero, comuna, telefono, notificar: avisar = true }) {
  const p = pubs().find((x) => x.id === item);
  if (!p) throw new Error("publicación no existe");
  const b = BUYERS[Number(buyer)];
  const id = 2000010000000 + ++S.seq.order;
  const shipId = 44000000000 + ++S.seq.ship;
  const cantidad = Math.max(1, Number(qty));
  S.shipments[shipId] = {
    id: shipId,
    order_id: id,
    status: "ready_to_ship",
    logistic_type: "cross_docking",
    receiver_address: { address_line: `${calle} ${numero}`, street_name: calle, street_number: String(numero), city: { name: comuna }, state: { name: "RM (Metropolitana)" }, country: { id: "CL" }, receiver_name: rec || nombre(b), receiver_phone: telefono || null, comment: null },
    shipping_option: { name: "Mercado Envíos", cost: 3990 },
  };
  S.orders[id] = {
    id, status: "paid", date_created: ahora(), date_closed: ahora(), currency_id: "CLP",
    total_amount: p.price * cantidad, paid_amount: p.price * cantidad + 3990,
    buyer: { id: b.id, nickname: b.nickname, first_name: b.first_name, last_name: b.last_name },
    seller: { id: SELLER.id, nickname: SELLER.nickname },
    order_items: [{ item: { id: p.id, title: p.title, seller_sku: p.seller_sku }, quantity: cantidad, unit_price: p.price, full_unit_price: p.price, currency_id: "CLP" }],
    shipping: { id: shipId }, pack_id: null, tags: ["paid", "not_delivered"],
  };
  guardar();
  if (avisar !== false && avisar !== "false") notificar("orders_v2", `/orders/${id}`);
  return S.orders[id];
}
function preguntar({ buyer = 0, item, texto }) {
  const p = pubs().find((x) => x.id === item);
  const id = 13000000000 + ++S.seq.question;
  S.questions[id] = { id, item_id: p.id, seller_id: SELLER.id, text: texto, status: "UNANSWERED", date_created: ahora(), from: { id: BUYERS[Number(buyer)].id }, answer: null, deleted_from_listing: false, hold: false };
  guardar();
  notificar("questions", `/questions/${id}`);
  return S.questions[id];
}
function mensaje({ order, texto }) {
  const o = S.orders[order];
  const id = hex(16);
  S.messages[id] = { id, pack: String(o.id), from: { user_id: o.buyer.id }, to: { user_id: SELLER.id }, text: texto, message_date: { created: ahora() }, status: "available" };
  guardar();
  notificar("messages", id);
  return S.messages[id];
}
function reclamo({ order, motivo = "PDD", devolucion = false, texto }) {
  const o = S.orders[order];
  const id = 5300000000 + ++S.seq.claim;
  const dev = devolucion === true || devolucion === "true";
  S.claims[id] = {
    id, resource_id: o.id, resource: "order", type: "mediations", stage: "claim", status: "opened", reason_id: motivo,
    date_created: ahora(), last_updated: ahora(),
    players: [{ role: "complainant", type: "buyer", user_id: o.buyer.id }, { role: "respondent", type: "seller", user_id: SELLER.id }],
    related_entities: dev ? ["return"] : [], return: dev ? { status: "opened" } : null,
    messages: [{ id: hex(12), sender_role: "complainant", receiver_role: "respondent", message: texto, date_created: ahora() }],
  };
  guardar();
  notificar("claims", `/post-purchase/v1/claims/${id}`);
  return S.claims[id];
}
function mensajeReclamo({ claim, texto }) {
  const c = S.claims[claim];
  c.messages.push({ id: hex(12), sender_role: "complainant", receiver_role: "respondent", message: texto, date_created: ahora() });
  c.last_updated = ahora();
  guardar();
  notificar("claims", `/post-purchase/v1/claims/${claim}`);
  return c;
}
function cancelar({ order }) {
  const o = S.orders[order];
  o.status = "cancelled";
  o.tags = ["not_delivered", "cancelled"];
  guardar();
  notificar("orders_v2", `/orders/${o.id}`);
  return o;
}

// ------------------------------------------------------------------ servidor
const srv = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const p = u.pathname;
  const m = req.method;
  try {
    // --- página del comprador y acciones del simulador (no son parte de la API real) ---
    if (m === "GET" && (p === "/" || p === "/comprador")) return html(res, fs.readFileSync(path.join(aqui, "comprador.html"), "utf8"));
    if (m === "GET" && p === "/sim/estado") {
      return json(res, 200, {
        app: { id: APP.id, callbackUrl: APP.callbackUrl, redirectUri: APP.redirectUri, topics: APP.topics },
        seller: SELLER, buyers: BUYERS, publicaciones: pubs(),
        orders: Object.values(S.orders).reverse(), shipments: S.shipments, questions: Object.values(S.questions).reverse(),
        messages: Object.values(S.messages), claims: Object.values(S.claims).reverse(), notifs: S.notifs.slice(0, 40),
        conectado: Object.values(S.tokens).some((t) => Date.parse(t.expira) > Date.now()),
      });
    }
    const acciones = { comprar, preguntar, mensaje, reclamo, "mensaje-reclamo": mensajeReclamo, cancelar };
    if (m === "POST" && p.startsWith("/sim/")) {
      const a = p.slice(5);
      if (acciones[a]) return json(res, 200, acciones[a](await leer(req)));
      if (a === "reenviar") {
        const { _id } = await leer(req);
        const n = S.notifs.find((x) => x._id === _id);
        if (!n) return mlError(res, 404, "not_found", "aviso no existe");
        enviar(n);
        return json(res, 200, { ok: true });
      }
      if (a === "expirar-token") {
        for (const t of Object.values(S.tokens)) t.expira = new Date(Date.now() - 1000).toISOString();
        guardar();
        return json(res, 200, { ok: true });
      }
      if (a === "reiniciar") {
        S = vacio();
        guardar();
        return json(res, 200, { ok: true });
      }
    }

    // --- OAuth 2.0 (auth.mercadolibre.cl/authorization y api.mercadolibre.com/oauth/token) ---
    if (m === "GET" && p === "/authorization") {
      const q = Object.fromEntries(u.searchParams);
      if (q.client_id !== APP.id) return html(res, "<h2>Aplicación desconocida (client_id)</h2>");
      if (q.redirect_uri !== APP.redirectUri) return html(res, "<h2>redirect_uri no coincide con la registrada en la aplicación</h2>");
      return html(res, paginaAutorizar(q));
    }
    if (m === "POST" && p === "/authorization") {
      const b = await leer(req);
      const code = `TG-${hex(12)}-${SELLER.id}`;
      S.codes[code] = { client_id: b.client_id, redirect_uri: b.redirect_uri, expira: Date.now() + 10 * 60_000 };
      guardar();
      const dest = new URL(b.redirect_uri);
      dest.searchParams.set("code", code);
      if (b.state) dest.searchParams.set("state", b.state);
      res.writeHead(302, { location: dest.toString() });
      return res.end();
    }
    if (m === "POST" && p === "/oauth/token") {
      const b = await leer(req);
      if (b.client_id !== APP.id || b.client_secret !== APP.secret) return mlError(res, 401, "invalid_client", "invalid client_id or client_secret");
      let ok = false;
      if (b.grant_type === "authorization_code") {
        const c = S.codes[b.code];
        ok = c && c.expira > Date.now() && c.redirect_uri === b.redirect_uri;
        delete S.codes[b.code]; // el código se usa una sola vez
      } else if (b.grant_type === "refresh_token") {
        ok = !!S.refresh[b.refresh_token];
        delete S.refresh[b.refresh_token]; // cada refresh token sirve una vez y se entrega uno nuevo
      }
      if (!ok) return guardar(), mlError(res, 400, "invalid_grant", "Error validating grant. Your authorization code or refresh token may be expired or it was already used");
      const access = `APP_USR-${APP.id}-${hex(6)}-${hex(16)}-${SELLER.id}`;
      const refresh = `TG-${hex(16)}-${SELLER.id}`;
      S.tokens[access] = { user_id: SELLER.id, expira: new Date(Date.now() + TOKEN_TTL * 1000).toISOString() };
      S.refresh[refresh] = { user_id: SELLER.id };
      guardar();
      log(`token entregado (${b.grant_type})`);
      return json(res, 200, { access_token: access, token_type: "Bearer", expires_in: TOKEN_TTL, scope: "offline_access read write", user_id: SELLER.id, refresh_token: refresh });
    }

    // --- API con token (api.mercadolibre.com) ---
    const t = autenticar(req, res);
    if (!t) return;
    let r;
    if (m === "GET" && p === "/users/me") return json(res, 200, { ...SELLER, site_id: "MLC", country_id: "CL" });
    if (m === "GET" && (r = p.match(/^\/users\/(\d+)$/))) {
      const x = usuario(r[1]);
      return x ? json(res, 200, { id: x.id, nickname: x.nickname, site_id: "MLC" }) : mlError(res, 404, "not_found", "user not found");
    }
    if (m === "GET" && (r = p.match(/^\/items\/(MLC\d+)$/))) {
      const it = pubs().find((x) => x.id === r[1]);
      return it ? json(res, 200, { id: it.id, title: it.title, price: it.price, available_quantity: it.available_quantity, seller_id: SELLER.id, seller_custom_field: it.seller_sku }) : mlError(res, 404, "not_found", "item not found");
    }
    if (m === "GET" && p === "/orders/search") {
      if (u.searchParams.get("seller") !== String(SELLER.id)) return mlError(res, 403, "forbidden", "Invalid caller.id");
      const desde = u.searchParams.get("order.date_created.from");
      const xs = Object.values(S.orders).filter((o) => !desde || o.date_created >= desde).sort((a, b) => b.date_created.localeCompare(a.date_created));
      const limit = Number(u.searchParams.get("limit") ?? 50);
      return json(res, 200, { query: "", results: xs.slice(0, limit), paging: { total: xs.length, offset: 0, limit } });
    }
    if (m === "GET" && (r = p.match(/^\/orders\/(\d+)$/))) {
      const { ...o } = S.orders[r[1]] ?? {};
      return o.id ? json(res, 200, o) : mlError(res, 404, "not_found", `Order ${r[1]} not found`);
    }
    if (m === "GET" && (r = p.match(/^\/shipments\/(\d+)$/))) return S.shipments[r[1]] ? json(res, 200, S.shipments[r[1]]) : mlError(res, 404, "not_found", "shipment not found");
    if (m === "GET" && (r = p.match(/^\/questions\/(\d+)$/))) return S.questions[r[1]] ? json(res, 200, S.questions[r[1]]) : mlError(res, 404, "not_found", "question not found");
    if (m === "POST" && p === "/answers") {
      const b = await leer(req);
      const q = S.questions[b.question_id];
      if (!q) return mlError(res, 404, "not_found", "question not found");
      if (q.status === "ANSWERED") return mlError(res, 400, "bad_request", "The question has already been answered");
      q.status = "ANSWERED";
      q.answer = { text: b.text, status: "ACTIVE", date_created: ahora() };
      guardar();
      log(`respuesta a la pregunta ${q.id}`);
      return json(res, 200, q);
    }
    if (m === "GET" && (r = p.match(/^\/messages\/([0-9a-f]{32})$/))) {
      const x = S.messages[r[1]];
      return x ? json(res, 200, { messages: [{ ...x, message_resources: [{ id: x.pack, name: "packs" }] }] }) : mlError(res, 404, "not_found", "message not found");
    }
    if ((r = p.match(/^\/messages\/packs\/(\d+)\/sellers\/(\d+)$/))) {
      if (Number(r[2]) !== SELLER.id) return mlError(res, 403, "forbidden", "seller mismatch");
      const o = S.orders[r[1]];
      if (!o) return mlError(res, 404, "not_found", "pack not found");
      if (m === "POST") {
        const b = await leer(req);
        const id = hex(16);
        S.messages[id] = { id, pack: r[1], from: { user_id: SELLER.id }, to: { user_id: o.buyer.id }, text: b.text, message_date: { created: ahora() }, status: "available" };
        guardar();
        log(`mensaje del vendedor en la venta ${r[1]}`);
        return json(res, 201, S.messages[id]);
      }
      const xs = Object.values(S.messages).filter((x) => x.pack === r[1]).sort((a, b) => a.message_date.created.localeCompare(b.message_date.created));
      return json(res, 200, { paging: { total: xs.length, offset: 0, limit: 100 }, conversation_status: { status: "active" }, messages: xs });
    }
    if ((r = p.match(/^\/post-purchase\/v1\/claims\/(\d+)(\/messages|\/actions\/send-message)?$/))) {
      const c = S.claims[r[1]];
      if (!c) return mlError(res, 404, "not_found", "claim not found");
      if (m === "GET" && !r[2]) {
        const { messages, ...rest } = c;
        void messages;
        return json(res, 200, rest);
      }
      if (m === "GET" && r[2] === "/messages") return json(res, 200, c.messages);
      if (m === "POST" && r[2] === "/actions/send-message") {
        const b = await leer(req);
        const id = hex(12);
        c.messages.push({ id, sender_role: "respondent", receiver_role: b.receiver_role ?? "complainant", message: b.message, date_created: ahora() });
        c.last_updated = ahora();
        guardar();
        log(`mensaje del vendedor en el reclamo ${c.id}`);
        return json(res, 200, { id });
      }
    }
    return mlError(res, 404, "not_found", `Resource ${p} not found`);
  } catch (e) {
    return mlError(res, 500, "internal_error", e.message);
  }
});

function paginaAutorizar(q) {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  return `<!doctype html><html lang=es><head><meta charset=utf-8><title>Autorizar aplicación · Mercado Libre (simulado)</title>
<style>body{margin:0;font-family:system-ui,Segoe UI,sans-serif;background:#ededed;color:#333}.top{background:#ffe600;height:56px;display:flex;align-items:center;padding:0 24px;font-weight:700}
.box{max-width:520px;margin:48px auto;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.15);padding:32px}h1{font-size:22px;margin:0 0 8px}.muted{color:#777;font-size:14px}
ul{line-height:1.9;padding-left:20px}button{width:100%;background:#3483fa;color:#fff;border:0;border-radius:6px;padding:14px;font-size:16px;font-weight:600;cursor:pointer;margin-top:16px}
.sec{background:#fff;color:#3483fa;border:1px solid #3483fa}.tag{display:inline-block;background:#fff3cd;border:1px solid #f0d68a;border-radius:4px;font-size:12px;padding:2px 8px;margin-left:8px}</style></head>
<body><div class=top>Mercado Libre <span class=tag>simulador de laboratorio</span></div><div class=box>
<p class=muted>Sesión iniciada como <b>${SELLER.nickname}</b></p>
<h1>VManque WMS quiere acceder a tu cuenta</h1><p class=muted>Aplicación ${esc(q.client_id)}</p>
<p>Al autorizar, la aplicación podrá:</p><ul><li>Ver tus ventas y sus envíos</li><li>Leer y responder preguntas de tus publicaciones</li><li>Leer y responder mensajes post-venta y reclamos</li><li>Hacerlo sin que estés conectado (acceso offline)</li></ul>
<p class=muted>La aplicación nunca recibe tu contraseña. Puedes quitar el acceso cuando quieras.</p>
<form method=post action="/authorization"><input type=hidden name=client_id value="${esc(q.client_id)}"><input type=hidden name=redirect_uri value="${esc(q.redirect_uri)}"><input type=hidden name=state value="${esc(q.state)}">
<button id=autorizar>Autorizar</button></form></div></body></html>`;
}

srv.listen(PORT, "127.0.0.1", () => log(`Mercado Libre simulado en http://127.0.0.1:${PORT} · comprador: /comprador · avisos → ${APP.callbackUrl}`));
