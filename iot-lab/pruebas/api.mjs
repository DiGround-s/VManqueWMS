// Pruebas funcionales de la API REST (/api/v1) con resultados esperados y obtenidos.
//   $env:VM_KEY="vmk_..."; node pruebas/api.mjs                 (crea pedidos de prueba)
//   $env:VM_KEY="vmk_..."; node pruebas/api.mjs persistencia    (después de reiniciar la web: siguen ahí)
// La key se crea en la web: Administración → API keys (sólo administrador).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { APP_URL, DATABASE_URL } from "../config.mjs";
import { informe } from "./util.mjs";

const KEY = process.env.VM_KEY;
if (!KEY) {
  console.error("Falta VM_KEY (crea una API key en la web: API keys → Nueva API key)");
  process.exit(1);
}
const estado = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "evidencia", "api-pedidos.json");
const auth = { Authorization: `Bearer ${KEY}` };

async function http(method, url, { headers = {}, body, raw } = {}) {
  const res = await fetch(APP_URL + url, {
    method,
    headers: { ...headers, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

const casos = [];
async function caso(id, prueba, peticion, esperado, fn, check) {
  const r = await fn();
  const ok = check(r);
  const obtenido = `${r.status} ${JSON.stringify(r.json)}`;
  casos.push({ id, prueba, peticion, esperado, obtenido, resultado: ok ? "OK" : "FALLA" });
  return r;
}

const pedido = (extra = {}) => ({
  externalRef: `PRUEBA-${Date.now()}`,
  customerName: "Cliente de prueba",
  address: "Av. Siempre Viva 742",
  commune: "Santiago",
  lines: [{ sku: "VM-0021", qty: 1 }],
  ...extra,
});

if (process.argv[2] === "persistencia") {
  const prev = JSON.parse(fs.readFileSync(estado, "utf8"));
  for (const p of prev.pedidos) {
    await caso(`PER-${p.code}`, `Pedido ${p.code} sigue existiendo después de reiniciar la web`, `GET /api/v1/orders/${p.code}`, "200 y mismas líneas", () => http("GET", `/api/v1/orders/${p.code}`, { headers: auth }), (r) => r.status === 200 && r.json?.lines?.[0]?.sku === p.sku && r.json?.lines?.[0]?.qty === p.qty);
  }
  const db = new pg.Client({ connectionString: DATABASE_URL.replace(/\?schema=\w+/, "") });
  await db.connect();
  const { rows } = await db.query(`SELECT o.code, o.source, o.status, l.qty, p.sku FROM "Order" o JOIN "OrderLine" l ON l."orderId" = o.id JOIN "Product" p ON p.id = l."productId" WHERE o.code = ANY($1)`, [prev.pedidos.map((p) => p.code)]);
  await db.end();
  casos.push({ id: "PER-BD", prueba: "Los pedidos están en PostgreSQL (consulta directa)", peticion: 'SELECT ... FROM "Order"', esperado: `${prev.pedidos.length} filas, source=API`, obtenido: JSON.stringify(rows), resultado: rows.length === prev.pedidos.length && rows.every((r) => r.source === "API") ? "OK" : "FALLA" });
  informe("api-persistencia", "Persistencia de la API después de reiniciar", casos);
  process.exit();
}

await caso("API-01", "Salud del servicio", "GET /api/health", "200", () => http("GET", "/api/health"), (r) => r.status === 200);
await caso("API-02", "Consultar stock sin API key", "GET /api/v1/stock?sku=VM-0021", "401", () => http("GET", "/api/v1/stock?sku=VM-0021"), (r) => r.status === 401);
await caso("API-03", "Consultar stock con key inventada", "GET /api/v1/stock (Bearer vmk_falsa)", "401", () => http("GET", "/api/v1/stock?sku=VM-0021", { headers: { Authorization: "Bearer vmk_falsa123" } }), (r) => r.status === 401);
const s1 = await caso("API-04", "Stock de producto existente", "GET /api/v1/stock?sku=VM-0021", "200, found=true", () => http("GET", "/api/v1/stock?sku=VM-0021", { headers: auth }), (r) => r.status === 200 && r.json?.items?.[0]?.found === true);
await caso("API-05", "Stock de producto inexistente", "GET /api/v1/stock?sku=NO-EXISTE", "200, found=false", () => http("GET", "/api/v1/stock?sku=NO-EXISTE", { headers: auth }), (r) => r.status === 200 && r.json?.items?.[0]?.found === false);
await caso("API-06", "Stock sin indicar SKU", "GET /api/v1/stock", "400", () => http("GET", "/api/v1/stock", { headers: auth }), (r) => r.status === 400);

const p1 = pedido();
const c1 = await caso("API-07", "Crear pedido válido (VM-0021 × 1)", "POST /api/v1/orders", "201, created=true", () => http("POST", "/api/v1/orders", { headers: auth, body: p1 }), (r) => r.status === 201 && r.json?.created === true);
await caso("API-08", "Repetir el mismo pedido (misma externalRef)", "POST /api/v1/orders", "200, created=false, mismo código", () => http("POST", "/api/v1/orders", { headers: auth, body: p1 }), (r) => r.status === 200 && r.json?.created === false && r.json?.code === c1.json?.code);
const s2 = await caso("API-09", "El pedido compromete stock", "GET /api/v1/stock?sku=VM-0021", "committed sube en 1, onShelf igual", () => http("GET", "/api/v1/stock?sku=VM-0021", { headers: auth }), (r) => r.json?.items?.[0]?.committed === s1.json.items[0].committed + 1 && r.json?.items?.[0]?.onShelf === s1.json.items[0].onShelf);
await caso("API-10", "Cantidad 0", "POST /api/v1/orders (qty 0)", "422", () => http("POST", "/api/v1/orders", { headers: auth, body: pedido({ lines: [{ sku: "VM-0021", qty: 0 }] }) }), (r) => r.status === 422);
await caso("API-11", "Cantidad negativa", "POST /api/v1/orders (qty -3)", "422", () => http("POST", "/api/v1/orders", { headers: auth, body: pedido({ lines: [{ sku: "VM-0021", qty: -3 }] }) }), (r) => r.status === 422);
await caso("API-12", "Cantidad decimal", "POST /api/v1/orders (qty 1.5)", "422", () => http("POST", "/api/v1/orders", { headers: auth, body: pedido({ lines: [{ sku: "VM-0021", qty: 1.5 }] }) }), (r) => r.status === 422);
await caso("API-13", "Cantidad de texto", 'POST /api/v1/orders (qty "abc")', "422", () => http("POST", "/api/v1/orders", { headers: auth, body: pedido({ lines: [{ sku: "VM-0021", qty: "abc" }] }) }), (r) => r.status === 422);
await caso("API-14", "SKU inexistente", "POST /api/v1/orders (sku NO-EXISTE)", "422", () => http("POST", "/api/v1/orders", { headers: auth, body: pedido({ lines: [{ sku: "NO-EXISTE", qty: 1 }] }) }), (r) => r.status === 422);
await caso("API-15", "Falta el nombre del cliente", "POST /api/v1/orders (sin customerName)", "422", () => http("POST", "/api/v1/orders", { headers: auth, body: pedido({ customerName: undefined }) }), (r) => r.status === 422);
await caso("API-16", "Cuerpo que no es JSON", "POST /api/v1/orders (texto)", "400", () => http("POST", "/api/v1/orders", { headers: auth, raw: "esto no es json" }), (r) => r.status === 400);
await caso("API-17", "Crear pedido sin API key", "POST /api/v1/orders", "401", () => http("POST", "/api/v1/orders", { body: pedido() }), (r) => r.status === 401);

// Pedir más de lo que hay: el pedido se acepta (queda pendiente), pero el stock físico no cambia ni queda negativo.
const disp = s2.json.items[0].available;
const p2 = pedido({ lines: [{ sku: "VM-0021", qty: disp + 50 }] });
const c2 = await caso("API-18", `Pedir más que el disponible (${disp + 50} u. con ${disp} disponibles)`, "POST /api/v1/orders", "201 (pedido pendiente)", () => http("POST", "/api/v1/orders", { headers: auth, body: p2 }), (r) => r.status === 201);
await caso("API-19", "Después de pedir de más", "GET /api/v1/stock?sku=VM-0021", "available=0 (nunca negativo), onShelf igual", () => http("GET", "/api/v1/stock?sku=VM-0021", { headers: auth }), (r) => r.json?.items?.[0]?.available === 0 && r.json?.items?.[0]?.onShelf === s1.json.items[0].onShelf);
await caso("API-20", "Consultar el pedido creado", `GET /api/v1/orders/${c1.json?.code}`, "200, status PENDING", () => http("GET", `/api/v1/orders/${c1.json?.code}`, { headers: auth }), (r) => r.status === 200 && r.json?.status === "PENDING");
await caso("API-21", "Consultar pedido inexistente", "GET /api/v1/orders/PED-999999", "404", () => http("GET", "/api/v1/orders/PED-999999", { headers: auth }), (r) => r.status === 404);

fs.mkdirSync(path.dirname(estado), { recursive: true });
fs.writeFileSync(estado, JSON.stringify({ pedidos: [{ code: c1.json?.code, sku: "VM-0021", qty: 1 }, { code: c2.json?.code, sku: "VM-0021", qty: disp + 50 }] }, null, 2));
informe("api", "Pruebas funcionales de la API REST", casos);
