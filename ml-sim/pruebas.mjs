// Pruebas del conector de Mercado Libre (ML-01 a ML-12) contra el Mercado Libre simulado.
//   node ml-sim/servidor.mjs   (en otra terminal)   y la web en http://localhost:3000, luego:
//   node ml-sim/pruebas.mjs
// Usa un navegador real (Edge) para el OAuth y para responder desde Atención; guarda capturas en informe/img.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { APP, SELLER } from "./config.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, "..");
const { chromium } = createRequire(path.join(raiz, "iot-lab", "package.json"))("playwright-core");
const { PrismaClient } = createRequire(path.join(raiz, "package.json"))("@prisma/client");
const db = new PrismaClient();
const WEB = "http://localhost:3000";
const SIM = "http://127.0.0.1:4100";
const IMG = path.join(raiz, "informe", "img");
fs.mkdirSync(IMG, { recursive: true });
fs.mkdirSync(path.join(aqui, "evidencia"), { recursive: true });

const casos = [];
const add = (id, prueba, esperado, obtenido, ok) => {
  casos.push({ id, prueba, esperado, obtenido: String(obtenido), resultado: ok ? "OK" : "FALLA" });
  console.log(ok ? "OK   " : "FALLA", id, prueba, "→", String(obtenido).slice(0, 110));
};
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const sim = async (accion, body) => (await fetch(`${SIM}/sim/${accion}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) })).json();
const estado = async () => (await fetch(`${SIM}/sim/estado`)).json();
async function hasta(fn, ms = 8000) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v || Date.now() - t0 > ms) return v;
    await espera(300);
  }
}
const aviso = async (resource) => (await estado()).notifs.find((n) => n.resource === resource);
const notifDb = (resource) => db.marketplaceNotification.findFirst({ where: { resource }, orderBy: { receivedAt: "desc" } });
const procesado = (resource) => hasta(async () => {
  const n = await notifDb(resource);
  return n && n.status !== "RECEIVED" ? n : null;
});
const COMPRA = { nombre: "Valentina Ortiz", calle: "Av. Providencia", numero: "1234", comuna: "Providencia", telefono: "+56 9 5555 1234" };

const browser = await chromium.launch({ channel: "msedge" });
async function sesion(email, clave) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-CL", timezoneId: "America/Santiago" });
  const page = await ctx.newPage();
  await page.goto(`${WEB}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', clave);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
}
async function responder(page, convId, texto, captura) {
  await page.goto(`${WEB}/atencion?c=${convId}`);
  await page.fill('textarea[aria-label="Respuesta"]', texto);
  await page.click('button[aria-label="Enviar respuesta"]');
  await page.getByText(texto).last().waitFor({ timeout: 8000 });
  await page.waitForTimeout(600);
  if (captura) await page.screenshot({ path: path.join(IMG, captura) });
}

try {
  // Punto de partida: sin cuenta conectada (las ventas anteriores del simulador se mantienen; sus ids no se repiten).
  await db.marketplaceAccount.deleteMany({ where: { channel: "MERCADOLIBRE" } });

  // ML-01 OAuth
  const admin = await sesion("admin@vmanque.cl", "admin1234");
  await admin.goto(`${WEB}/ajustes`);
  await admin.click("#conectar-ml");
  await admin.waitForURL(/\/authorization\?/);
  const urlAut = new URL(admin.url());
  await admin.screenshot({ path: path.join(IMG, "ml-01-autorizar.png") });
  await admin.click("#autorizar");
  await admin.waitForURL(/\/ajustes/);
  const acc = await hasta(() => db.marketplaceAccount.findUnique({ where: { channel: "MERCADOLIBRE" } }));
  const cifrado = acc && acc.accessToken.startsWith("v1.") && !acc.accessToken.includes("APP_USR") && !acc.refreshToken.includes("TG-");
  add("ML-01", "Conectar la cuenta con OAuth 2.0 (botón en Ajustes → autorizar en Mercado Libre)",
    "Vuelve conectado como VMANQUE_TIENDA; tokens guardados cifrados",
    `client_id=${urlAut.searchParams.get("client_id")}, state=${urlAut.searchParams.get("state")?.slice(0, 8)}…; cuenta ${acc?.nickname} (${acc?.sellerId}); token cifrado: ${cifrado ? "sí" : "no"}`,
    acc?.nickname === SELLER.nickname && acc.sellerId === String(SELLER.id) && cifrado);

  // ML-02 venta
  const pub = (await estado()).publicaciones[1];
  const venta = await sim("comprar", { ...COMPRA, buyer: 0, item: pub.id, qty: 2 });
  const n2 = await procesado(`/orders/${venta.id}`);
  const ped = await db.order.findUnique({ where: { externalRef: `MLC-${venta.id}` }, include: { lines: { include: { product: true } } } });
  const a2 = await aviso(`/orders/${venta.id}`);
  add("ML-02", "Venta nueva: aviso orders_v2 → el conector lee /orders y /shipments y crea el pedido",
    `Pedido con 2 × ${pub.seller_sku}, dirección y comuna del envío; respuesta al aviso < 500 ms`,
    `${n2?.result}; ${ped?.lines.map((l) => `${l.qty} × ${l.product.sku}`).join(", ")}; ${ped?.address}, ${ped?.commune}; respuesta ${a2?.http} en ${a2?.ms} ms`,
    ped && ped.channel === "MERCADOLIBRE" && ped.lines[0]?.qty === 2 && ped.lines[0]?.product.sku === pub.seller_sku && ped.commune === "Providencia" && a2?.http === 200 && a2.ms < 500);

  // ML-03 aviso repetido
  await sim("reenviar", { _id: a2._id });
  await espera(1500);
  const n3 = await notifDb(`/orders/${venta.id}`);
  const cuantos = await db.order.count({ where: { externalRef: `MLC-${venta.id}` } });
  add("ML-03", "Mercado Libre reenvía el mismo aviso (reintento)", "No se duplica el pedido",
    `intentos registrados: ${n3?.attempts}; pedidos con esa venta: ${cuantos}`, n3?.attempts === 2 && cuantos === 1);

  // ML-04 pregunta
  const preg = await sim("preguntar", { buyer: 1, item: pub.id, texto: "Hola, ¿tienen stock para despacho hoy a Ñuñoa?" });
  const n4 = await procesado(`/questions/${preg.id}`);
  const convQ = await db.conversation.findUnique({ where: { externalRef: `MLC-Q-${preg.id}` }, include: { messages: true } });
  add("ML-04", "Pregunta en una publicación: aviso questions", "Conversación tipo pregunta en Atención con el texto del comprador",
    `${n4?.result}; «${convQ?.subject}» de ${convQ?.customerName}`, convQ?.kind === "QUESTION" && convQ.messages.some((m) => m.body.includes("stock para despacho")));

  // ML-05 responder pregunta desde Atención
  const sup = await sesion("supervisor@vmanque.cl", "super1234");
  const resp5 = "¡Hola! Sí, tenemos stock y si compras antes de las 14:00 sale hoy.";
  await responder(sup, convQ.id, resp5, "ml-05-atencion-pregunta.png");
  const q5 = (await estado()).questions.find((q) => q.id === preg.id);
  add("ML-05", "Responder la pregunta desde Atención", "La respuesta llega a Mercado Libre (POST /answers) y la pregunta queda respondida",
    `estado en Mercado Libre: ${q5?.status}; respuesta: «${q5?.answer?.text?.slice(0, 40)}…»`, q5?.status === "ANSWERED" && q5.answer.text === resp5);

  // ML-06 mensajes post-venta (ida y vuelta, sin duplicar)
  const m1 = await sim("mensaje", { order: venta.id, texto: "Hola, ¿cuándo despachan mi compra?" });
  await procesado(m1.id);
  const convP = await db.conversation.findUnique({ where: { externalRef: `MLC-PACK-${venta.id}` } });
  const resp6 = "Hola Valentina, tu compra sale hoy por Mercado Envíos. Te llegará el seguimiento.";
  await responder(sup, convP.id, resp6, "ml-06-atencion-postventa.png");
  const m2 = await sim("mensaje", { order: venta.id, texto: "¡Gracias!" });
  await procesado(m2.id);
  const msgs6 = await db.message.findMany({ where: { conversationId: convP.id }, orderBy: { createdAt: "asc" } });
  const enMl = (await estado()).messages.filter((m) => m.pack === String(venta.id));
  add("ML-06", "Mensajes post-venta: comprador → Atención → respuesta → comprador", "El hilo queda ligado al pedido; la respuesta llega a Mercado Libre y no se duplica al re-sincronizar",
    `pedido ${ped?.code}; en Mercado Libre ${enMl.length} mensajes; en el WMS ${msgs6.filter((m) => m.author !== "SYSTEM").length} (comprador, vendedor, comprador)`,
    convP?.orderId === ped?.id && enMl.length === 3 && msgs6.filter((m) => m.author === "AGENT").length === 1 && msgs6.filter((m) => m.author === "BUYER").length === 2);

  // ML-07 reclamo con devolución
  const rec = await sim("reclamo", { order: venta.id, texto: "El producto llegó con la caja rota. Quiero devolverlo.", devolucion: true });
  await procesado(`/post-purchase/v1/claims/${rec.id}`);
  const convC = await db.conversation.findUnique({ where: { externalRef: `MLC-CLAIM-${rec.id}` } });
  const resp7 = "Lamentamos el problema. Aprobamos la devolución: te llegará la etiqueta para enviarlo sin costo.";
  await responder(sup, convC.id, resp7, "ml-07-atencion-reclamo.png");
  await sim("mensaje-reclamo", { claim: rec.id, texto: "Perfecto, lo envío mañana." });
  await espera(1500);
  const c7 = (await estado()).claims.find((c) => c.id === rec.id);
  const msgs7 = await db.message.findMany({ where: { conversationId: convC.id, author: { not: "SYSTEM" } } });
  add("ML-07", "Reclamo con devolución: aviso claims → caso en Atención → respuesta", "Caso tipo devolución ligado al pedido; la respuesta llega al reclamo en Mercado Libre",
    `tipo ${convC?.kind}, devolución ${convC?.returnStatus}; mensajes en el reclamo de ML: ${c7?.messages.length}; en el WMS: ${msgs7.length}`,
    convC?.kind === "RETURN" && convC.orderId === ped?.id && c7?.messages.some((m) => m.sender_role === "respondent" && m.message === resp7) && msgs7.length === 3);

  // ML-08 token vencido → renovación
  const antes = (await db.marketplaceAccount.findUnique({ where: { channel: "MERCADOLIBRE" } })).updatedAt;
  await sim("expirar-token");
  const v8 = await sim("comprar", { ...COMPRA, buyer: 2, nombre: "Trinidad Araya", comuna: "Ñuñoa", item: pub.id, qty: 1 });
  const n8 = await procesado(`/orders/${v8.id}`);
  const despues = (await db.marketplaceAccount.findUnique({ where: { channel: "MERCADOLIBRE" } })).updatedAt;
  add("ML-08", "El access token venció (Mercado Libre lo da por 6 horas)", "El conector lo renueva con el refresh token y procesa la venta igual",
    `${n8?.result}; token renovado: ${despues > antes ? "sí" : "no"}`, n8?.status === "PROCESSED" && despues > antes);

  // ML-09 avisos falsos
  const falso = async (body) => (await fetch(`${WEB}/api/v1/integraciones/mercadolibre/notificaciones`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).status;
  const s1 = await falso({ _id: `falso-app-${Date.now()}`, resource: "/orders/9999", user_id: SELLER.id, topic: "orders_v2", application_id: 1111, attempts: 1 });
  const s2 = await falso({ _id: `falso-user-${Date.now()}`, resource: "/orders/9998", user_id: 42, topic: "orders_v2", application_id: APP.id, attempts: 1 });
  const s3 = await falso({ hola: "mundo" });
  await espera(1200);
  const f1 = await notifDb("/orders/9999");
  const f2 = await notifDb("/orders/9998");
  const creados = await db.order.count({ where: { externalRef: { in: ["MLC-9999", "MLC-9998"] } } });
  add("ML-09", "Avisos falsificados: otra aplicación, otro vendedor y JSON inválido", "Se ignoran y no crean nada (el aviso no trae datos: el conector siempre consulta con su token)",
    `respuestas ${s1}, ${s2}, ${s3}; estados ${f1?.status} y ${f2?.status}; pedidos creados ${creados}`,
    f1?.status === "IGNORED" && f2?.status === "IGNORED" && s3 === 400 && creados === 0);

  // ML-10 aviso perdido → sincronizar
  const v10 = await sim("comprar", { ...COMPRA, buyer: 1, nombre: "Gonzalo Peña", comuna: "Maipú", item: pub.id, qty: 1, notificar: false });
  await espera(800);
  const sinAviso = await db.order.count({ where: { externalRef: `MLC-${v10.id}` } });
  await admin.goto(`${WEB}/ajustes`);
  await admin.getByRole("button", { name: /Sincronizar ahora/ }).click();
  await admin.getByText(/Revisadas \d+ ventas/).waitFor({ timeout: 10000 });
  const conSync = await db.order.count({ where: { externalRef: `MLC-${v10.id}` } });
  add("ML-10", "Una venta cuyo aviso nunca llegó", "«Sincronizar ahora» la recupera consultando /orders/search",
    `antes: ${sinAviso} pedido(s); después de sincronizar: ${conSync}`, sinAviso === 0 && conSync === 1);

  // ML-11 cancelación
  await sim("cancelar", { order: v10.id });
  await procesado(`/orders/${v10.id}`);
  await hasta(async () => (await db.order.findUnique({ where: { externalRef: `MLC-${v10.id}` } }))?.status === "CANCELLED");
  const p11 = await db.order.findUnique({ where: { externalRef: `MLC-${v10.id}` } });
  add("ML-11", "El comprador cancela la compra en Mercado Libre", "El pedido queda cancelado en el WMS", `${p11?.code}: ${p11?.status}`, p11?.status === "CANCELLED");

  // ML-12 SKU inexistente
  const v12 = await sim("comprar", { ...COMPRA, buyer: 0, item: "MLC1599999999", qty: 1 });
  const n12 = await procesado(`/orders/${v12.id}`);
  const p12 = await db.order.count({ where: { externalRef: `MLC-${v12.id}` } });
  add("ML-12", "Venta de una publicación cuyo SKU no existe en el WMS", "No se crea un pedido incompleto; el aviso queda en error con el motivo visible en Ajustes",
    `${n12?.status}: ${n12?.result}; pedidos creados: ${p12}`, n12?.status === "ERROR" && /SKU/.test(n12.result ?? "") && p12 === 0);

  // Capturas para el informe
  await admin.goto(`${WEB}/ajustes`);
  await admin.waitForTimeout(1200);
  await admin.locator("#integracion-ml").screenshot({ path: path.join(IMG, "ml-02-ajustes-integracion.png") });
  await admin.goto(`${WEB}/pedidos/${ped.code}`);
  await admin.waitForTimeout(1000);
  await admin.screenshot({ path: path.join(IMG, "ml-03-pedido.png") });
  const comprador = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await comprador.goto(`${SIM}/comprador`);
  await comprador.waitForTimeout(1500);
  await comprador.screenshot({ path: path.join(IMG, "ml-04-comprador.png"), fullPage: true });

  // Limpieza: cancela en Mercado Libre las compras de prueba que siguen activas (el conector las cancela en el WMS).
  for (const id of [venta.id, v8.id]) await sim("cancelar", { order: id });
  await espera(1500);
} catch (e) {
  console.error(e);
  add("ML-XX", "Error inesperado en la ejecución", "-", e.message, false);
} finally {
  await browser.close();
  await db.$disconnect();
}
const ok = casos.filter((c) => c.resultado === "OK").length;
console.log(`\n${ok}/${casos.length} pruebas OK`);
fs.writeFileSync(path.join(aqui, "evidencia", "ml.json"), JSON.stringify({ titulo: "Pruebas del conector de Mercado Libre", fecha: new Date().toISOString(), casos }, null, 2));
if (ok !== casos.length) process.exitCode = 1;
