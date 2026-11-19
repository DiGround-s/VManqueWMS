// Pruebas de los conectores de Falabella, Walmart, Paris y Hites (TND-01 a TND-11) contra las entorno de pruebas de las tiendas.
//   node tiendas-pruebas/servidor.mjs  (otra terminal)  y la web en http://localhost:3000, luego:
//   node tiendas-pruebas/pruebas.mjs
import { createRequire } from "module";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, "..");
const { chromium } = createRequire(path.join(raiz, "iot-lab", "package.json"))("playwright-core");
const { PrismaClient } = createRequire(path.join(raiz, "package.json"))("@prisma/client");
const db = new PrismaClient();
const WEB = "http://localhost:3000";
const SIM = "http://127.0.0.1:4200";
const IMG = path.join(raiz, "informe", "img");
fs.mkdirSync(path.join(aqui, "evidencia"), { recursive: true });
const CRED = {
  FALABELLA: ["integraciones@vmanque.cl", "lab-fala-6f1c0d9e4b7a2c58"],
  WALMART: ["lab-wmt-client-31b7", "lab-wmt-secreto-9e04c2"],
  PARIS: ["PAR-77012", "lab-paris-key-5d2a91"],
  HITES: ["HIT-4410", "lab-hites-key-c37e08"],
};
const PREFIX = { FALABELLA: "FAL", WALMART: "WMT", PARIS: "PAR", HITES: "HIT" };

const casos = [];
const add = (id, prueba, esperado, obtenido, ok) => {
  casos.push({ id, prueba, esperado, obtenido: String(obtenido), resultado: ok ? "OK" : "FALLA" });
  console.log(ok ? "OK   " : "FALLA", id, prueba, "→", String(obtenido).slice(0, 120));
};
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const estado = async () => (await fetch(`${SIM}/sim/estado`)).json();
const comprar = async (tienda, sku, qty = 1, extra = {}) =>
  (await fetch(`${SIM}/sim/comprar`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tienda, sku, qty, ...extra }) })).json();
async function hasta(fn, ms = 10000) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v || Date.now() - t0 > ms) return v;
    await espera(400);
  }
}
const pedido = (tienda, id) => db.order.findUnique({ where: { externalRef: `${PREFIX[tienda]}-${id}` }, include: { lines: { include: { product: true } } } });

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-CL", timezoneId: "America/Santiago" });
const page = await ctx.newPage();
const card = (t) => page.locator(`#integracion-${t.toLowerCase()}`);
async function conectar(tienda, id, secreto) {
  await page.goto(`${WEB}/ajustes`);
  await card(tienda).locator('input[name="id"]').fill(id);
  await card(tienda).locator('input[name="secret"]').fill(secreto);
  await card(tienda).getByRole("button", { name: "Conectar" }).click();
  const toast = page.locator("[data-sonner-toast]").last();
  await toast.waitFor({ timeout: 10000 });
  const txt = await toast.innerText();
  await page.waitForTimeout(800);
  return txt;
}
async function sincronizar(tienda) {
  await page.goto(`${WEB}/ajustes`);
  await card(tienda).getByRole("button", { name: /Sincronizar ahora/ }).click();
  await page.getByText(/pedidos revisados/).last().waitFor({ timeout: 10000 });
}

try {
  await db.marketplaceAccount.deleteMany({ where: { channel: { in: Object.keys(CRED) } } });
  await page.goto(`${WEB}/login`);
  await page.fill('input[name="email"]', "admin@vmanque.cl");
  await page.fill('input[name="password"]', "admin1234");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  const cat = (await estado()).catalogo;

  // TND-01 / 02 Falabella: credenciales
  const t1 = await conectar("FALABELLA", CRED.FALABELLA[0], "clave-equivocada");
  const sinCuenta = !(await db.marketplaceAccount.findUnique({ where: { channel: "FALABELLA" } }));
  add("TND-01", "Falabella: conectar con una API key equivocada", "La tienda rechaza la firma (E007) y no se guarda nada", `${t1.replace(/\s+/g, " ")}; cuenta guardada: ${sinCuenta ? "no" : "sí"}`, sinCuenta && /E007|Signature/.test(t1));
  await conectar("FALABELLA", ...CRED.FALABELLA);
  const acc = await db.marketplaceAccount.findUnique({ where: { channel: "FALABELLA" } });
  const hook = (await estado()).webhooks.find((w) => w.url.includes("/api/v1/integraciones/falabella/webhook"));
  add("TND-02", "Falabella: conectar con UserID y API key correctos", "Se valida con GetOrders, se registra el webhook (CreateWebhook) y la key queda cifrada",
    `webhook ${hook?.url} (${hook?.events.join(", ")}); key cifrada: ${acc?.refreshToken.startsWith("v1.") ? "sí" : "no"}`, Boolean(acc && hook && acc.refreshToken.startsWith("v1.")));

  // TND-03 venta por webhook
  const f3 = await comprar("FALABELLA", cat[2].sku, 2, { nombre: "Camila Fuentes", comuna: "Las Condes" });
  const p3 = await hasta(() => pedido("FALABELLA", f3.id));
  const n3 = (await estado()).notifs.find((n) => String(n.payload.OrderId) === f3.id);
  add("TND-03", "Falabella: venta nueva → webhook onOrderCreated", "Pedido creado leyendo GetOrder + GetOrderItems (2 ítems = 1 línea de 2 unidades)",
    `${p3?.code}: ${p3?.lines.map((l) => `${l.qty} × ${l.product.sku}`).join(", ")}, ${p3?.commune}; webhook → ${n3?.http} en ${n3?.ms} ms`, p3?.lines[0]?.qty === 2 && n3?.http === 200);

  // TND-04 webhook falso
  const falso = async (url) => (await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "onOrderCreated", payload: { OrderId: 999999 } }) })).status;
  const s1 = await falso(`${WEB}/api/v1/integraciones/falabella/webhook`);
  const s2 = await falso(`${WEB}/api/v1/integraciones/falabella/webhook?k=adivinado`);
  add("TND-04", "Falabella: webhook sin el token secreto o con uno inventado", "Se rechaza (401) y no se crea nada", `respuestas ${s1} y ${s2}; pedidos FAL-999999: ${await db.order.count({ where: { externalRef: "FAL-999999" } })}`, s1 === 401 && s2 === 401);

  // TND-05 firma
  const params = { Action: "GetOrders", Format: "JSON", Timestamp: new Date().toISOString(), UserID: CRED.FALABELLA[0], Version: "1.0" };
  const canon = Object.keys(params).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&");
  const firma = (key) => crypto.createHmac("sha256", key).update(canon).digest("hex");
  const ok5 = await fetch(`${SIM}/falabella/?${canon}&Signature=${firma(CRED.FALABELLA[1])}`);
  const mal5 = await fetch(`${SIM}/falabella/?${canon.replace("GetOrders", "GetOrder")}&Signature=${firma(CRED.FALABELLA[1])}`);
  add("TND-05", "Falabella: firma HMAC-SHA256 de cada consulta", "Con la firma correcta responde; si se altera un parámetro después de firmar, la rechaza", `firma correcta → ${ok5.status}; parámetro alterado → ${mal5.status}`, ok5.status === 200 && mal5.status === 403);

  // TND-06 Walmart OAuth
  const t6 = await conectar("WALMART", CRED.WALMART[0], "secreto-malo");
  const sin6 = !(await db.marketplaceAccount.findUnique({ where: { channel: "WALMART" } }));
  await conectar("WALMART", ...CRED.WALMART);
  const a6 = await db.marketplaceAccount.findUnique({ where: { channel: "WALMART" } });
  add("TND-06", "Walmart: OAuth 2.0 client credentials (POST /v3/token)", "Secreto malo: rechazado; correcto: token guardado cifrado con su vencimiento (~15 min)",
    `malo: ${t6.replace(/\s+/g, " ").slice(0, 60)} (cuenta: ${sin6 ? "no" : "sí"}); bueno: token vence en ${a6 ? Math.round((a6.expiresAt - Date.now()) / 60000) : "-"} min`, sin6 && a6 && a6.expiresAt > new Date());

  // TND-07 Walmart por consulta automática (instrumentation, cada 60 s)
  const w7 = await comprar("WALMART", cat[3].sku, 1, { nombre: "Diego Morales", comuna: "Maipú" });
  const t0 = Date.now();
  const p7 = await hasta(() => pedido("WALMART", w7.id), 80000);
  const seg = Math.round((Date.now() - t0) / 1000);
  await espera(1000);
  const o7 = (await estado()).orders.find((o) => o.id === w7.id);
  add("TND-07", "Walmart: venta nueva sin webhook", "La consulta automática (cada 60 s) crea el pedido y lo confirma a Walmart (acknowledge)",
    `${p7?.code} creado a los ${seg} s; estado en Walmart: ${o7?.estado}`, Boolean(p7) && o7?.estado === "confirmado" && seg <= 75);

  // TND-08 Walmart token vencido
  await fetch(`${SIM}/sim/expirar-token`, { method: "POST" });
  const w8 = await comprar("WALMART", cat[4].sku, 1, { nombre: "Antonia Rivas", comuna: "Ñuñoa" });
  await sincronizar("WALMART");
  const p8 = await pedido("WALMART", w8.id);
  add("TND-08", "Walmart: el token fue invalidado antes de tiempo", "Ante el 401 el conector pide un token nuevo y reintenta", `${p8?.code ?? "sin pedido"}`, Boolean(p8));

  // TND-09 / 10 Paris y Hites
  for (const [id, t, sku, nombre] of [["TND-09", "PARIS", cat[5].sku, "Tomás Herrera"], ["TND-10", "HITES", cat[6].sku, "Isidora Pinto"]]) {
    await conectar(t, ...CRED[t]);
    const v = await comprar(t, sku, 3, { nombre, comuna: "La Florida" });
    await sincronizar(t);
    const p = await pedido(t, v.id);
    const o = (await estado()).orders.find((x) => x.id === v.id);
    add(id, `${t === "PARIS" ? "Paris" : "Hites"}: venta nueva (API supuesta: REST + API key)`, "«Sincronizar ahora» trae el pedido y lo acepta en la tienda",
      `${p?.code}: ${p?.lines.map((l) => `${l.qty} × ${l.product.sku}`).join(", ")}; estado en la tienda: ${o?.estado}`, p?.lines[0]?.qty === 3 && o?.estado === "confirmado");
  }

  // TND-11 sin duplicados
  for (const t of ["FALABELLA", "WALMART", "PARIS", "HITES"]) await sincronizar(t);
  const dup = await db.order.groupBy({ by: ["externalRef"], where: { channel: { in: ["FALABELLA", "WALMART", "PARIS", "HITES"] }, source: "API" }, _count: true, having: { externalRef: { _count: { gt: 1 } } } });
  add("TND-11", "Sincronizar otra vez las cuatro tiendas", "Ningún pedido se duplica (idempotencia por referencia externa)", `referencias duplicadas: ${dup.length}`, dup.length === 0);

  // Capturas
  await page.goto(`${WEB}/ajustes`);
  await page.waitForTimeout(1200);
  await card("FALABELLA").screenshot({ path: path.join(IMG, "tnd-01-falabella.png") });
  await card("WALMART").screenshot({ path: path.join(IMG, "tnd-02-walmart.png") });
  await page.goto(`${WEB}/pedidos?canal=walmart`).catch(() => {});
  const panel = await ctx.newPage();
  await panel.goto(`${SIM}/?tienda=FALABELLA`);
  await panel.waitForTimeout(1500);
  await panel.screenshot({ path: path.join(IMG, "tnd-03-panel-tiendas.png") });
  await page.goto(`${WEB}/pedidos`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(IMG, "tnd-04-pedidos.png") });
} catch (e) {
  console.error(e);
  add("TND-XX", "Error inesperado en la ejecución", "-", e.message, false);
} finally {
  await browser.close();
  await db.$disconnect();
}
const ok = casos.filter((c) => c.resultado === "OK").length;
console.log(`\n${ok}/${casos.length} pruebas OK`);
fs.writeFileSync(path.join(aqui, "evidencia", "tiendas.json"), JSON.stringify({ titulo: "Pruebas de los conectores de Falabella, Walmart, Paris y Hites", fecha: new Date().toISOString(), casos }, null, 2));
if (ok !== casos.length) process.exitCode = 1;
