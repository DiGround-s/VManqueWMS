// Drives the real app inside a 1920x1080 "stage" page and captures it frame by frame (CDP screencast).
// Usage: node record.mjs [--dry]   (--dry runs the flow without saving frames)
import { chromium } from "playwright";
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const DRY = process.argv.includes("--dry");
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const APP = "http://localhost:3000";
const FRAMES = path.join(HERE, "frames");
const require = createRequire("C:/Users/power/OneDrive/Escritorio/VManqueWMS/package.json");
const QRCode = require("qrcode");

const ORDER = "PED-006344";
const LOC = "A-02-06-03";
const EAN = "7800010007401";
const PRODUCT = "Olla de greda de Pomaire";
const SKU = "VM-0021";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: "es-CL", timezoneId: "America/Santiago" });
context.on("page", (p) => p.waitForLoadState().then(() => { if (p.url().includes("/print/")) p.close(); }).catch(() => {}));

// Log in once; the session cookie is shared by both iframes.
const login = await context.newPage();
await login.goto(`${APP}/login`);
await login.fill('input[type="email"]', "admin@vmanque.cl");
await login.fill('input[type="password"]', "admin1234");
await Promise.all([login.waitForURL(`${APP}/`), login.press('input[type="password"]', "Enter")]);
// Warm up the dev server so pages compile before recording.
for (const u of ["/ventas", "/olas/nueva", "/mapa", "/m/picking", "/m/separar", "/m/empacar", "/m/despachar", `/pedidos/${ORDER}`]) {
  await login.goto(APP + u).catch(() => {});
  if (u === "/mapa") await login.locator("canvas").first().waitFor({ timeout: 90000 }).catch(() => {});
}
await login.close();

const page = await context.newPage();
await page.route(`${APP}/__stage`, (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: fs.readFileSync(path.join(HERE, "stage.html"), "utf8") }));
await page.goto(`${APP}/__stage`);
const S = (fn, ...args) => page.evaluate(([f, a]) => window.stage[f](...a), [fn, args]);
const office = await (await page.$("#office")).contentFrame();
const phone = await (await page.$("#phone")).contentFrame();

// ---- capture ----
let n = 0;
const frames = [];
const cdp = await context.newCDPSession(page);
if (!DRY) {
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });
  cdp.on("Page.screencastFrame", async (f) => {
    const file = `f${String(n++).padStart(6, "0")}.jpg`;
    frames.push({ file, ts: f.metadata.timestamp });
    fs.writeFile(path.join(FRAMES, file), Buffer.from(f.data, "base64"), () => {});
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
}

// Server waits (page loads, slow dev compiles) are cut out of the final video.
const cuts = [];
async function hold(fn) {
  const a = Date.now() / 1000;
  try { return await fn(); } finally { cuts.push([a, Date.now() / 1000]); }
}
const go = (frame, url, ready) => hold(async () => { await frame.goto(url); if (ready) await frame.locator(ready).first().waitFor({ timeout: 60000 }); await sleep(300); });

async function cap(text, ms) {
  await page.evaluate(() => scrollTo(0, 0));
  await S("caption", text);
  await sleep(ms ?? Math.max(3200, text.length * 62));
}
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

try {
  // 0 · Title
  await S("panel", "title");
  await sleep(4800);

  // 1 · Sales hub
  await go(office, `${APP}/ventas`, 'figure[aria-label^="Ingresos diarios"]');
  await S("layout", "office");
  await S("chip", "1", "Ventas multicanal", "Servicios en red y tráfico de datos");
  await S("panel", "");
  await cap("VManque WMS reúne en un solo sistema los pedidos de Mercado Libre, Falabella, Paris y la tienda propia.");
  const bar = office.locator('figure[aria-label^="Ingresos diarios"] button').nth(26);
  const bb = await bar.boundingBox();
  if (bb) await S("cursorTo", bb.x + bb.width / 2, bb.y + bb.height - 20);
  await bar.hover();
  await cap("El panel muestra en vivo los ingresos de hoy, del mes y del año, separados por tienda.");
  await click(office, 'button:has-text("Simular pedido entrante")');
  await hold(() => office.locator("text=Nuevo pedido de").first().waitFor({ timeout: 60000 }));
  await cap("Cada tienda envía sus pedidos al servidor por un webhook HTTPS. Aquí llega uno nuevo, en tiempo real.", 4600);
  await S("cursorHide");
  await office.evaluate(() => { const el = document.getElementById("entrantes"); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" }); });
  await sleep(2200);

  // 2 · Network
  await S("chip", "2", "Cómo viaja la información", "Implementar redes LAN/WAN · Ciberseguridad");
  await S("layout", "none");
  await S("panel", "net");
  await cap("Diseño de red propuesto: la bodega se separa en VLAN para servidores, operadores con Wi-Fi y dispositivos IoT.", 5600);
  const tagAt = [1090, 432];
  S("caption", "1 · Un pedido llega desde Internet por HTTPS (puerto 443). El firewall sólo lo deja pasar hacia el servidor.");
  await S("packet", [[380, 250], [760, 250], [760, 470], [960, 470], [1210, 470], [1210, 310]], {
    tag: "<b>Webhook de Mercado Libre</b><code>POST /api/v1/webhooks/mercadolibre\nAuthorization: Bearer ••••  (API key)</code><div class='layers'><span>HTTPS · TLS 1.3</span><span>TCP 443</span><span>IP pública → NAT 192.168.10.10</span></div>",
    at: tagAt, ms: 3400,
  });
  await S("packet", [[1330, 250], [1500, 250]], { tag: "<b>El servidor guarda el pedido</b><code>INSERT INTO \"Order\" … (idempotente por referencia)</code><div class='layers'><span>PostgreSQL</span><span>TCP 5432 · red interna</span></div>", at: tagAt, ms: 1400 });
  await S("packet", [[1500, 250], [1330, 250], [1210, 310], [1210, 470], [960, 470], [760, 470], [760, 250], [380, 250]], { cls: "resp", tag: "<b>Respuesta</b><code>201 Created  {\"code\":\"PED-006356\"}</code>", at: tagAt, ms: 2400 });
  S("caption", "2 · El operador escanea con su teléfono. La lectura viaja por Wi-Fi hasta el servidor, que la valida contra la base de datos.");
  await S("packet", [[500, 760], [960, 760], [960, 470], [1210, 470], [1210, 310]], {
    tag: "<b>Escaneo desde el teléfono</b><code>POST /m/picking/OLA-0002  (acción del servidor)\n{\"code\":\"7800010007401\"}  + cookie de sesión</code><div class='layers'><span>Wi-Fi WPA3 · 802.11</span><span>VLAN 20</span><span>TCP 443</span><span>HTTPS</span></div>",
    at: tagAt, ms: 3400,
  });
  await S("packet", [[1330, 250], [1500, 250], [1330, 250]], { tag: "<b>Valida y descuenta stock</b><code>¿producto correcto? → UPDATE \"StockLevel\"</code>", at: tagAt, ms: 1600 });
  await S("packet", [[1210, 310], [1210, 470], [960, 470], [960, 760], [500, 760]], { cls: "resp", tag: "<b>Respuesta al teléfono</b><code>200 OK  ✓ 1 × VM-0021 recogido</code>", at: tagAt, ms: 2200 });
  S("caption", "3 · Para guiarlo, el servidor publica un mensaje MQTT y el ESP32 enciende la tira LED de esa estantería.");
  await S("packet", [[1210, 310], [1210, 360], [1500, 360]], { cls: "mqtt", tag: "<b>Publicación MQTT</b><code>vmanque/bc/led/A-02-06-03\n{\"on\":1,\"color\":\"green\",\"blink\":1}</code><div class='layers'><span>MQTT</span><span>TCP 1883</span><span>QoS 1</span></div>", at: tagAt, ms: 1600 });
  await S("packet", [[1500, 380], [1210, 380], [1210, 470], [960, 470], [960, 760], [1420, 760]], { cls: "mqtt", tag: "<b>El broker lo entrega al ESP32</b><code>suscrito a vmanque/bc/led/#  ·  VLAN 30 IoT</code>", at: tagAt, ms: 2600 });
  await S("led", true);
  await sleep(1500);
  await S("hideTag");
  await S("sec", true);
  await cap("Seguridad: tráfico cifrado con TLS, sesiones firmadas, permisos por rol, API keys con hash y redes aisladas.", 5200);
  await S("sec", false);

  // 3 · Wave
  await go(office, `${APP}/olas/nueva`, `tr:has-text("${ORDER}")`);
  await S("led", false);
  await S("panel", "");
  await S("layout", "office");
  await S("chip", "3", "Ola de picking", "Programar algoritmos para automatizar tareas");
  await cap("En la oficina se agrupan pedidos en una ola. Tomamos un pedido de Mercado Libre: una olla de greda.", 4200);
  await click(office, `tr:has-text("${ORDER}") input[type="checkbox"]`);
  await sleep(500);
  await click(office, 'button:has-text("Crear ola")');
  await hold(async () => { await office.waitForURL(/\/olas\/OLA-/, { timeout: 90000 }); await office.locator("text=Recorrido de picking").waitFor({ timeout: 60000 }); });
  const wave = office.url().split("/").pop();
  log("wave", wave);
  await cap("El sistema reserva el stock y arma el recorrido ordenado por pasillo, rack y nivel.", 3800);
  await S("cursorHide");

  // 4 · Picking on the phone + pick-to-light
  await go(phone, `${APP}/m/picking/${wave}`, 'button:has-text("Tomar ola")');
  await go(office, `${APP}/mapa?loc=${LOC}`, "canvas");
  await hold(() => sleep(2500));
  await S("layout", "split");
  await S("chip", "4", "Picking con el teléfono y luz LED", "Tecnologías emergentes · IoT");
  await cap("El operador toma la ola en su teléfono, conectado por Wi-Fi.", 3000);
  await click(phone, 'button:has-text("Tomar ola")');
  await S("cursorHide");
  await hold(() => phone.locator('input[placeholder="Escanea la ubicación"]').waitFor({ timeout: 60000 }));
  await office.evaluate(() => window.scrollTo({ top: 330, behavior: "smooth" }));
  await cap(`Pick-to-light: el ESP32 recibe la orden por MQTT y enciende el LED de ${LOC} para guiarlo.`, 5200);
  const qr = await QRCode.toString(LOC, { type: "svg", margin: 0, width: 170 });
  S("caption", "Con la cámara escanea el código QR de la ubicación…");
  await S("scan", { kind: "qr", code: LOC, title: LOC, sub: "Zona A · pasillo 2 · rack 6 · nivel 3", qr });
  await typeScan(phone, "Escanea la ubicación", LOC);
  await sleep(1200);
  S("caption", "…y el código de barras del producto. El sistema confirma que es el correcto.");
  await S("scan", { kind: "ean", code: EAN, title: PRODUCT, sub: SKU });
  await typeScan(phone, "Escanea cada unidad", EAN);
  await hold(() => phone.locator("text=Picking terminado").waitFor({ timeout: 60000 }));
  await sleep(1200);
  await go(office, `${APP}/mapa?loc=${LOC}`, "canvas");
  await hold(() => sleep(2500));
  await cap("Al confirmar, el LED se apaga y el stock se descuenta al instante en el mapa 3D.", 3400);

  // 5 · Sort, pack, ship
  await S("chip", "5", "Separar, empacar y despachar", "Servicios en red · continuidad operacional");
  await go(office, `${APP}/pedidos/${ORDER}`, "text=Venta");
  await go(phone, `${APP}/m/separar?ola=${wave}`, 'input[placeholder="Escanea un producto"]');
  await cap("En la mesa de separación, cada producto escaneado indica la casilla de su pedido.", 1800);
  await S("scan", { kind: "ean", code: EAN, title: PRODUCT, sub: SKU });
  await typeScan(phone, "Escanea un producto", EAN);
  await hold(() => phone.getByText(/^CASILLA \d+$/).waitFor({ timeout: 60000 }));
  await sleep(1800);
  await go(office, `${APP}/pedidos/${ORDER}`, "text=Ingreso neto");
  await sleep(1400);
  await go(phone, `${APP}/m/empacar`, 'input[placeholder="Escanea o escribe el código del pedido"]');
  await phone.evaluate(() => { window.open = () => null; }); // the label print tab is not part of the video
  S("caption", "Al empacar se verifica el pedido producto por producto y se imprime la etiqueta de envío.");
  await sleep(800);
  await typeScan(phone, "Escanea o escribe el código del pedido", ORDER);
  await hold(() => phone.locator('input[placeholder="Escanea cada producto"]').waitFor({ timeout: 60000 }));
  await sleep(800);
  await S("scan", { kind: "ean", code: EAN, title: PRODUCT, sub: SKU });
  await typeScan(phone, "Escanea cada producto", EAN);
  await hold(() => phone.getByText(/^EMPACADO$/).waitFor({ timeout: 60000 }));
  await sleep(1800);
  await go(office, `${APP}/pedidos/${ORDER}`, "text=Ingreso neto");
  await sleep(1400);
  await go(phone, `${APP}/m/despachar`, 'input[placeholder="Escanea la etiqueta del bulto"]');
  const qrOrder = await QRCode.toString(ORDER, { type: "svg", margin: 0, width: 170 });
  S("caption", "Al despachar se escanea la etiqueta del bulto y el pedido queda entregado al transporte.");
  await sleep(600);
  await S("scan", { kind: "qr", code: ORDER, title: ORDER, sub: "Etiqueta de envío", qr: qrOrder, hud: "Apunta a la etiqueta del bulto" });
  await typeScan(phone, "Escanea la etiqueta del bulto", ORDER);
  await hold(() => phone.locator(`text=${ORDER} despachado`).waitFor({ timeout: 60000 }));
  await sleep(1800);
  await go(office, `${APP}/pedidos/${ORDER}`, "text=Ingreso neto");
  await cap("El pedido queda trazado de principio a fin, con su comisión e ingreso neto.", 4200);

  // 6 · Map search
  await go(office, `${APP}/mapa`, "canvas");
  await hold(() => sleep(2000));
  await S("layout", "office");
  await S("chip", "6", "Mapa 3D de la bodega", "Diseñar soluciones de conectividad");
  await sleep(1500);
  const search = office.locator('input[aria-label="Buscar producto en el mapa"]');
  const sb = await search.boundingBox();
  if (sb) await S("cursorTo", sb.x + 60, sb.y + sb.height / 2, true);
  await search.pressSequentially("miel", { delay: 120 });
  await sleep(500);
  await click(office, 'ul button:has-text("Miel de ulmo")');
  await cap("Al buscar un producto, el mapa muestra todas sus ubicaciones y el ESP32 enciende sus LED.", 4200);
  await S("cursorHide");
  await office.evaluate(() => window.scrollTo({ top: 520, behavior: "smooth" }));
  await cap("El monitor serie muestra lo mismo que imprimiría el ESP32 real: Wi-Fi, MQTT y los píxeles encendidos.", 4800);

  // 7 · Competencies + end
  await S("layout", "none");
  await S("chip", "", "", "");
  await S("panel", "cards");
  await S("cards");
  await cap("El proyecto aplica las competencias del perfil de egreso de Ingeniería en Conectividad y Redes.", 6500);
  await S("caption", "");
  await S("panel", "end");
  await sleep(4500);
} catch (e) {
  console.error("FALLÓ:", e.message);
  await page.screenshot({ path: path.join(HERE, "error.png") });
  process.exitCode = 1;
} finally {
  if (!DRY) {
    await cdp.send("Page.stopScreencast").catch(() => {});
    await sleep(500);
    fs.writeFileSync(path.join(HERE, "frames.json"), JSON.stringify(frames));
    fs.writeFileSync(path.join(HERE, "cuts.json"), JSON.stringify(cuts));
    log("frames", frames.length);
  }
  await browser.close();
  log("listo");
}
