// Design B: dark cinematic stage, app in dark mode, timing driven by the narration.
// Each line waits for its voice to finish (in *video* time, so cut server waits don't count).
import { chromium } from "playwright";
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const APP = "http://localhost:3000";
const FRAMES = path.join(HERE, "frames-b");
const require = createRequire("C:/Users/power/OneDrive/Escritorio/VManqueWMS/package.json");
const QRCode = require("qrcode");
const VOICE = JSON.parse(fs.readFileSync(path.join(HERE, "lines-b.json"), "utf8"));

const ORDER = "PED-006344", LOC = "A-02-06-03", EAN = "7800010007401", PRODUCT = "Olla de greda de Pomaire", SKU = "VM-0021";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now() / 1000;

const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: "es-CL", timezoneId: "America/Santiago", colorScheme: "dark" });
context.on("page", (p) => p.waitForLoadState().then(() => { if (p.url().includes("/print/")) p.close(); }).catch(() => {}));

const login = await context.newPage();
await login.goto(`${APP}/login`);
await login.fill('input[type="email"]', "admin@vmanque.cl");
await login.fill('input[type="password"]', "admin1234");
await Promise.all([login.waitForURL(`${APP}/`), login.press('input[type="password"]', "Enter")]);
for (const u of ["/ventas", "/olas/nueva", "/mapa", "/m/picking", "/m/separar", "/m/empacar", "/m/despachar", `/pedidos/${ORDER}`]) {
  await login.goto(APP + u).catch(() => {});
  if (u === "/mapa") await login.locator("canvas").first().waitFor({ timeout: 90000 }).catch(() => {});
}
await login.close();

const page = await context.newPage();
await page.route(`${APP}/__stage`, (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: fs.readFileSync(path.join(HERE, "stage-b.html"), "utf8") }));
await page.goto(`${APP}/__stage`);
const S = (fn, ...args) => page.evaluate(([f, a]) => window.stage[f](...a), [fn, args]);
const office = await (await page.$("#office")).contentFrame();
const phone = await (await page.$("#phone")).contentFrame();

// ---- capture ----
let n = 0;
const frames = [];
const cdp = await context.newCDPSession(page);
fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });
cdp.on("Page.screencastFrame", async (f) => {
  const file = `f${String(n++).padStart(6, "0")}.jpg`;
  frames.push({ file, ts: f.metadata.timestamp });
  fs.writeFile(path.join(FRAMES, file), Buffer.from(f.data, "base64"), () => {});
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

// ---- cuts & speech ----
const cuts = [];
let cutTotal = 0;
async function hold(fn) {
  const a = now();
  try { return await fn(); } finally { const b = now(); cuts.push([a, b]); cutTotal += b - a; }
}
const speech = [];
let speaking = null;
async function say(id, { wait = true } = {}) {
  await settle();
  const v = VOICE[id];
  await page.evaluate(() => scrollTo(0, 0));
  await S("caption", v.text);
  speaking = { start: now(), cut0: cutTotal, dur: v.dur + 0.45 };
  speech.push({ id, file: v.file, t: speaking.start });
  if (wait) await settle();
}
async function settle() {
  while (speaking && now() - speaking.start - (cutTotal - speaking.cut0) < speaking.dur) await sleep(50);
  speaking = null;
}
const go = (frame, url, ready) => hold(async () => {
  await frame.goto(url);
  if (ready) await frame.locator(ready).first().waitFor({ timeout: 60000 });
  if (frame === office) await S("url", url.replace(APP, ""));
  await sleep(300);
});
async function click(frame, locator) {
  const el = frame.locator(locator).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  if (b) await S("cursorTo", b.x + b.width / 2, b.y + b.height / 2, true);
  await el.click();
  await page.evaluate(() => scrollTo(0, 0));
}
async function typeScan(frame, placeholder, code) {
  const input = frame.locator(`input[placeholder="${placeholder}"]`).first();
  await input.fill(code);
  await input.press("Enter");
  await page.evaluate(() => scrollTo(0, 0));
}
const chapter = async (nn, t, c) => { await settle(); await S("caption", ""); await S("chapter", nn, t, c); };

try {
  await S("panel", "title");
  await sleep(600);
  await say("intro");

  // 1 · Sales
  await go(office, `${APP}/ventas`, 'figure[aria-label^="Ingresos diarios"]');
  await chapter(1, "Ventas multicanal", "Servicios en red y tráfico de datos");
  await S("panel", "");
  await S("layout", "office");
  await say("s1a");
  const bar = office.locator('figure[aria-label^="Ingresos diarios"] button').nth(26);
  const bb = await bar.boundingBox();
  if (bb) await S("cursorTo", bb.x + bb.width / 2, bb.y + bb.height - 20);
  await bar.hover();
  await say("s1b", { wait: false });
  await sleep(2500);
  await click(office, 'button:has-text("Simular pedido entrante")');
  await hold(() => office.locator("text=Nuevo pedido de").first().waitFor({ timeout: 60000 }));
  await say("s1c", { wait: false });
  await S("cursorHide");
  await sleep(2600);
  await office.evaluate(() => { const el = document.getElementById("entrantes"); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" }); });

  // 2 · Network
  await chapter(2, "Cómo viaja la información", "Implementar redes LAN/WAN · Ciberseguridad");
  await S("layout", "none");
  await S("panel", "net");
  await say("s2a");
  const tagAt = [1090, 432];
  await say("s2b", { wait: false });
  await S("packet", [[380, 250], [760, 250], [760, 470], [960, 470], [1210, 470], [1210, 310]], { tag: "<b>Webhook de Mercado Libre</b><code>POST /api/v1/webhooks/mercadolibre\nAuthorization: Bearer ••••  (API key)</code><div class='layers'><span>HTTPS · TLS 1.3</span><span>TCP 443</span><span>IP pública → NAT 192.168.10.10</span></div>", at: tagAt, ms: 3600 });
  await S("packet", [[1330, 250], [1500, 250]], { tag: "<b>El servidor guarda el pedido</b><code>INSERT INTO \"Order\" … (idempotente por referencia)</code><div class='layers'><span>PostgreSQL</span><span>TCP 5432 · red interna</span></div>", at: tagAt, ms: 2000 });
  await S("packet", [[1500, 250], [1330, 250], [1210, 310], [1210, 470], [960, 470], [760, 470], [760, 250], [380, 250]], { cls: "resp", tag: "<b>Respuesta</b><code>201 Created  {\"code\":\"PED-006356\"}</code>", at: tagAt, ms: 2600 });
  await say("s2c", { wait: false });
  await S("packet", [[500, 760], [960, 760], [960, 470], [1210, 470], [1210, 310]], { tag: "<b>Escaneo desde el teléfono</b><code>POST /m/picking/OLA-0002  (acción del servidor)\n{\"code\":\"7800010007401\"}  + cookie de sesión</code><div class='layers'><span>Wi-Fi WPA3 · 802.11</span><span>VLAN 20</span><span>TCP 443</span><span>HTTPS</span></div>", at: tagAt, ms: 3600 });
  await S("packet", [[1330, 250], [1500, 250], [1330, 250]], { tag: "<b>Valida y descuenta stock</b><code>¿producto correcto? → UPDATE \"StockLevel\"</code>", at: tagAt, ms: 1800 });
  await S("packet", [[1210, 310], [1210, 470], [960, 470], [960, 760], [500, 760]], { cls: "resp", tag: "<b>Respuesta al teléfono</b><code>200 OK  ✓ 1 × VM-0021 recogido</code>", at: tagAt, ms: 2400 });
  await say("s2d", { wait: false });
  await S("packet", [[1210, 310], [1210, 360], [1500, 360]], { cls: "mqtt", tag: "<b>Publicación MQTT</b><code>vmanque/bc/led/A-02-06-03\n{\"on\":1,\"color\":\"green\",\"blink\":1}</code><div class='layers'><span>MQTT</span><span>TCP 1883</span><span>QoS 1</span></div>", at: tagAt, ms: 2400 });
  await S("packet", [[1500, 380], [1210, 380], [1210, 470], [960, 470], [960, 760], [1420, 760]], { cls: "mqtt", tag: "<b>El broker lo entrega al ESP32</b><code>suscrito a vmanque/bc/led/#  ·  VLAN 30 IoT</code>", at: tagAt, ms: 3000 });
  await S("led", true);
  await settle();
  await S("hideTag");
  await S("sec", true);
  await say("s2e");
  await S("sec", false);

  // 3 · Wave
  await go(office, `${APP}/olas/nueva`, `tr:has-text("${ORDER}")`);
  await S("led", false);
  await chapter(3, "Ola de picking", "Programar algoritmos para automatizar tareas");
  await S("panel", "");
  await S("layout", "office");
  await say("s3a", { wait: false });
  await sleep(3000);
  await click(office, `tr:has-text("${ORDER}") input[type="checkbox"]`);
  await sleep(500);
  await click(office, 'button:has-text("Crear ola")');
  await hold(async () => { await office.waitForURL(/\/olas\/OLA-/, { timeout: 90000 }); await office.locator("text=Recorrido de picking").waitFor({ timeout: 60000 }); });
  const wave = office.url().split("/").pop();
  await S("url", `/olas/${wave}`);
  await say("s3b");
  await S("cursorHide");

  // 4 · Picking + pick-to-light
  await go(phone, `${APP}/m/picking/${wave}`, 'button:has-text("Tomar ola")');
  await go(office, `${APP}/mapa?loc=${LOC}`, "canvas");
  await hold(() => sleep(2500));
  await chapter(4, "Picking con el teléfono y luz LED", "Tecnologías emergentes · IoT");
  await S("layout", "split");
  await say("s4a", { wait: false });
  await sleep(1800);
  await click(phone, 'button:has-text("Tomar ola")');
  await S("cursorHide");
  await hold(() => phone.locator('input[placeholder="Escanea la ubicación"]').waitFor({ timeout: 60000 }));
  await office.evaluate(() => window.scrollTo({ top: 330, behavior: "smooth" }));
  await say("s4b");
  const qr = await QRCode.toString(LOC, { type: "svg", margin: 0, width: 170 });
  await say("s4c", { wait: false });
  await S("scan", { kind: "qr", code: LOC, title: LOC, sub: "Zona A · pasillo 2 · rack 6 · nivel 3", qr });
  await typeScan(phone, "Escanea la ubicación", LOC);
  await say("s4d", { wait: false });
  await S("scan", { kind: "ean", code: EAN, title: PRODUCT, sub: SKU });
  await typeScan(phone, "Escanea cada unidad", EAN);
  await hold(() => phone.locator("text=Picking terminado").waitFor({ timeout: 60000 }));
  await settle();
  await go(office, `${APP}/mapa?loc=${LOC}`, "canvas");
  await hold(() => sleep(2500));
  await say("s4e");

  // 5 · Sort, pack, ship
  await go(office, `${APP}/pedidos/${ORDER}`, "text=Ingreso neto");
  await go(phone, `${APP}/m/separar?ola=${wave}`, 'input[placeholder="Escanea un producto"]');
  await chapter(5, "Separar, empacar y despachar", "Servicios en red · continuidad operacional");
  await say("s5a", { wait: false });
  await S("scan", { kind: "ean", code: EAN, title: PRODUCT, sub: SKU });
  await typeScan(phone, "Escanea un producto", EAN);
  await hold(() => phone.getByText(/^CASILLA \d+$/).waitFor({ timeout: 60000 }));
  await settle();
  await go(office, `${APP}/pedidos/${ORDER}`, "text=Ingreso neto");
  await go(phone, `${APP}/m/empacar`, 'input[placeholder="Escanea o escribe el código del pedido"]');
  await phone.evaluate(() => { window.open = () => null; });
  await say("s5b", { wait: false });
  await typeScan(phone, "Escanea o escribe el código del pedido", ORDER);
  await hold(() => phone.locator('input[placeholder="Escanea cada producto"]').waitFor({ timeout: 60000 }));
  await S("scan", { kind: "ean", code: EAN, title: PRODUCT, sub: SKU });
  await typeScan(phone, "Escanea cada producto", EAN);
  await hold(() => phone.getByText(/^EMPACADO$/).waitFor({ timeout: 60000 }));
  await settle();
  await go(office, `${APP}/pedidos/${ORDER}`, "text=Ingreso neto");
  await go(phone, `${APP}/m/despachar`, 'input[placeholder="Escanea la etiqueta del bulto"]');
  const qrOrder = await QRCode.toString(ORDER, { type: "svg", margin: 0, width: 170 });
  await say("s5c", { wait: false });
  await S("scan", { kind: "qr", code: ORDER, title: ORDER, sub: "Etiqueta de envío", qr: qrOrder, hud: "Apunta a la etiqueta del bulto" });
  await typeScan(phone, "Escanea la etiqueta del bulto", ORDER);
  await hold(() => phone.locator(`text=${ORDER} despachado`).waitFor({ timeout: 60000 }));
  await settle();
  await go(office, `${APP}/pedidos/${ORDER}`, "text=Ingreso neto");
  await say("s5d");

  // 6 · Map
  await go(office, `${APP}/mapa`, "canvas");
  await hold(() => sleep(2000));
  await chapter(6, "Mapa 3D de la bodega", "Diseñar soluciones de conectividad");
  await S("layout", "office");
  await sleep(600);
  const search = office.locator('input[aria-label="Buscar producto en el mapa"]');
  const sb = await search.boundingBox();
  if (sb) await S("cursorTo", sb.x + 60, sb.y + sb.height / 2, true);
  await say("s6a", { wait: false });
  await search.pressSequentially("miel", { delay: 120 });
  await sleep(400);
  await click(office, 'ul button:has-text("Miel de ulmo")');
  await S("cursorHide");
  await settle();
  await office.evaluate(() => window.scrollTo({ top: 520, behavior: "smooth" }));
  await say("s6b");

  // 7 · Competencies + end
  await chapter(7, "Competencias del perfil de egreso", "Ingeniería en Conectividad y Redes · Duoc UC");
  await S("layout", "none");
  await S("panel", "cards");
  await S("cards");
  await say("s7");
  await S("caption", "");
  await S("panel", "end");
  await say("end");
  await sleep(2500);
} catch (e) {
  console.error("FALLÓ:", e.message);
  await page.screenshot({ path: path.join(HERE, "error-b.png") });
  process.exitCode = 1;
} finally {
  await cdp.send("Page.stopScreencast").catch(() => {});
  await sleep(500);
  fs.writeFileSync(path.join(HERE, "frames-b.json"), JSON.stringify(frames));
  fs.writeFileSync(path.join(HERE, "cuts-b.json"), JSON.stringify(cuts));
  fs.writeFileSync(path.join(HERE, "speech-b.json"), JSON.stringify(speech));
  console.log("frames", frames.length, "· líneas", speech.length);
  await browser.close();
}
