// Pruebas de seguridad de la web (WEB-01 a WEB-12): cabeceras HTTP, clickjacking, cookie, fuerza bruta, inyección SQL,
// XSS, peticiones desde otro sitio (CSRF), redirección abierta y documentos sin sesión.
//   node pruebas/seguridad_web.mjs      (con la web en modo producción en APP_URL)
// Guarda capturas en informe/img/seguridad/ y los resultados en iot-lab/evidencia/web.json.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";
import { APP_URL } from "../config.mjs";
import { informe } from "./util.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const IMG = path.join(here, "..", "..", "informe", "img", "seguridad");
fs.mkdirSync(IMG, { recursive: true });
const KEY = fs.readFileSync(path.join(here, "..", "evidencia", "api-key.txt"), "utf8").trim();
const casos = [];
const add = (id, prueba, esperado, obtenido, ok) => casos.push({ id, prueba, esperado, obtenido, resultado: ok ? "OK" : "FALLA" });
const api = (ruta, init = {}) => fetch(APP_URL + ruta, { ...init, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });

const browser = await chromium.launch({ channel: "msedge" });
async function contexto() {
  return browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-CL" });
}
async function entrar(page, email, pass, next) {
  await page.goto(`${APP_URL}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

// WEB-01 Cabeceras de seguridad
{
  const r = await fetch(`${APP_URL}/login`);
  const h = (n) => r.headers.get(n);
  const esperadas = { "x-frame-options": "DENY", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "strict-transport-security": "max-age=31536000", "content-security-policy": "frame-ancestors 'none'", "permissions-policy": "camera=(self)" };
  const faltan = Object.entries(esperadas).filter(([k, v]) => !(h(k) ?? "").includes(v)).map(([k]) => k);
  add("WEB-01", "Cabeceras de seguridad en GET /login", "Las 6 cabeceras presentes y sin X-Powered-By", faltan.length ? `faltan: ${faltan.join(", ")}` : `6/6 presentes; X-Powered-By: ${h("x-powered-by") ?? "ausente"}`, !faltan.length && !h("x-powered-by"));
  fs.writeFileSync(path.join(IMG, "cabeceras.txt"), `GET ${APP_URL}/login → ${r.status}\n` + [...r.headers].filter(([k]) => /frame|content-type-options|referrer|permissions|strict|security-policy|powered|set-cookie|cache/.test(k)).map(([k, v]) => `${k}: ${v}`).join("\n"));
}

// WEB-02 Clickjacking: otro sitio intenta mostrar la web dentro de un iframe
{
  const ctx = await contexto();
  const page = await ctx.newPage();
  const bloqueos = [];
  page.on("console", (m) => /frame|ancestors/i.test(m.text()) && bloqueos.push(m.text()));
  await page.setContent(`<html><body style="font-family:sans-serif;margin:24px"><h2>Sitio externo (otro origen)</h2><p>Intenta mostrar la página de VManque WMS dentro de un iframe:</p><iframe src="${APP_URL}/login" width="900" height="520" style="border:3px dashed #c00"></iframe></body></html>`);
  await page.waitForTimeout(3000);
  const frame = page.frames().find((f) => f !== page.mainFrame());
  let contenido = "";
  try { contenido = (await frame?.evaluate(() => document.body?.innerText ?? "")) ?? ""; } catch { contenido = ""; }
  await page.screenshot({ path: path.join(IMG, "web02-iframe.png") });
  const cargo = /Ingresar|contraseña/i.test(contenido);
  add("WEB-02", "Otro sitio carga /login dentro de un iframe (clickjacking)", "El navegador se niega a mostrarla", cargo ? "La página se mostró dentro del iframe" : `Bloqueada por el navegador${bloqueos.length ? " (frame-ancestors / X-Frame-Options)" : ""}`, !cargo);
  await ctx.close();
}

// WEB-03 Cookie de sesión
{
  const ctx = await contexto();
  const page = await ctx.newPage();
  await entrar(page, "supervisor@vmanque.cl", "super1234");
  const c = (await ctx.cookies()).find((x) => x.name === "vm_session");
  const dias = c ? Math.round((c.expires * 1000 - Date.now()) / 86400000) : 0;
  const ok = c && c.httpOnly && c.sameSite === "Lax" && c.secure && dias <= 7;
  add("WEB-03", "Atributos de la cookie de sesión tras iniciar sesión", "HttpOnly, Secure, SameSite=Lax y vence en ≤ 7 días", c ? `HttpOnly=${c.httpOnly}, Secure=${c.secure}, SameSite=${c.sameSite}, vence en ${dias} días` : "sin cookie", ok);
  await ctx.close();
}

// WEB-04 Fuerza bruta: 6 intentos seguidos con clave incorrecta
{
  const ctx = await contexto();
  const page = await ctx.newPage();
  const correo = `atacante-${Date.now()}@ejemplo.cl`;
  const mensajes = [];
  for (let i = 1; i <= 6; i++) {
    await entrar(page, correo, `clave-${i}`);
    mensajes.push((await page.locator("form").innerText()).split("\n").find((l) => /incorrect|Demasiados/i.test(l)) ?? "");
  }
  await page.screenshot({ path: path.join(IMG, "web04-fuerza-bruta.png") });
  const ok = mensajes.slice(0, 5).every((m) => /incorrect/i.test(m)) && /Demasiados intentos/.test(mensajes[5]);
  add("WEB-04", "6 intentos de login seguidos con clave incorrecta", "Los 5 primeros: «incorrectos»; el 6.º: bloqueo de 15 min", `1–5: «${mensajes[0]}»; 6: «${mensajes[5]}»`, ok);
  await ctx.close();
}

// WEB-05 / WEB-06 Inyección SQL en la API
{
  const r1 = await api(`/api/v1/stock?sku=${encodeURIComponent("' OR '1'='1")}`);
  const j1 = await r1.json();
  add("WEB-05", "Inyección SQL en la API: GET /api/v1/stock?sku=' OR '1'='1", "200 y found=false (no devuelve todo el catálogo)", `${r1.status} · ${j1.items?.length} resultado, found=${j1.items?.[0]?.found}`, r1.status === 200 && j1.items?.length === 1 && j1.items[0].found === false);
  const r2 = await api(`/api/v1/stock?sku=${encodeURIComponent('VM-0001\'; DROP TABLE "Product"; --')}`);
  const r3 = await api(`/api/v1/stock?sku=VM-0001`);
  const j3 = await r3.json();
  add("WEB-06", "Inyección SQL con DROP TABLE en el SKU y luego consultar VM-0001", "La tabla sigue intacta: VM-0001 found=true", `${r2.status} found=${(await r2.json()).items?.[0]?.found}; después VM-0001 found=${j3.items?.[0]?.found}, disponible ${j3.items?.[0]?.available}`, r3.status === 200 && j3.items?.[0]?.found === true);
}

// WEB-07 Inyección en el buscador de pedidos (pantalla)
{
  const ctx = await contexto();
  const page = await ctx.newPage();
  await entrar(page, "supervisor@vmanque.cl", "super1234");
  await page.goto(`${APP_URL}/pedidos?q=${encodeURIComponent("' OR 1=1 --")}`, { waitUntil: "networkidle" });
  const txt = await page.locator("main").innerText();
  const m = /(\d+) resultados?/.exec(txt);
  await page.screenshot({ path: path.join(IMG, "web07-buscador.png") });
  add("WEB-07", "Buscador de pedidos con ' OR 1=1 --", "Se busca como texto: 0 resultados, sin error", m ? `${m[1]} resultados; la página carga normal` : "sin contador", m && m[1] === "0");
  await ctx.close();
}

// WEB-08 XSS almacenado: un pedido con código HTML en el nombre del cliente
{
  const ref = `XSS-${Date.now()}`;
  const nombre = `<img src=x onerror="alert('XSS')"> Prueba XSS`;
  const r = await api("/api/v1/orders", { method: "POST", body: JSON.stringify({ externalRef: ref, customerName: nombre, address: "Calle 1", commune: "Santiago", lines: [{ sku: "VM-0001", qty: 1 }] }) });
  const { code } = await r.json();
  const ctx = await contexto();
  const page = await ctx.newPage();
  let alerta = false;
  page.on("dialog", async (d) => { alerta = true; await d.dismiss(); });
  await entrar(page, "supervisor@vmanque.cl", "super1234");
  await page.goto(`${APP_URL}/pedidos/${code}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const visible = await page.getByText("<img src=x", { exact: false }).count();
  await page.screenshot({ path: path.join(IMG, "web08-xss.png") });
  add("WEB-08", "Pedido por API con <img onerror=alert()> en el nombre del cliente", "Se muestra como texto y no ejecuta código", `${code}: ${visible ? "texto visible tal cual" : "texto no visible"}; alerta ejecutada: ${alerta ? "sí" : "no"}`, !alerta && visible > 0);
  await ctx.close();
}

// WEB-09 Acción del servidor enviada desde otro sitio (CSRF): se captura la petición real del formulario de login
// y se reenvía igual, cambiando sólo la cabecera Origin.
{
  const ctx = await contexto();
  const page = await ctx.newPage();
  let req = null;
  page.on("request", (q) => { if (q.method() === "POST" && q.headers()["next-action"] && !req) req = { headers: q.headers(), body: q.postDataBuffer() }; });
  await entrar(page, "supervisor@vmanque.cl", "super1234");
  await ctx.close();
  const enviar = (origen) => fetch(`${APP_URL}/login`, { method: "POST", headers: { "Next-Action": req.headers["next-action"], "Content-Type": req.headers["content-type"], Accept: "text/x-component", Origin: origen }, body: req.body, redirect: "manual" });
  const r = await enviar("https://sitio-malicioso.example");
  const setCookie = r.headers.get("set-cookie") ?? "";
  // Control: la misma petición desde el origen de la web sí inicia sesión, así que el rechazo se debe sólo al origen.
  const control = await enviar(new URL(APP_URL).origin);
  const controlOk = /vm_session=/.test(control.headers.get("set-cookie") ?? "");
  add("WEB-09", "Formulario de login reenviado desde otro sitio (sólo cambia Origin)", "Rechazado: no entrega cookie de sesión", `Otro origen: HTTP ${r.status}, cookie: ${/vm_session=/.test(setCookie) ? "entregada" : "no"} · control desde la web: HTTP ${control.status}, cookie: ${controlOk ? "sí" : "no"}`, !/vm_session=/.test(setCookie) && r.status >= 400 && controlOk);
}

// WEB-10 Redirección abierta después del login
{
  const ctx = await contexto();
  const page = await ctx.newPage();
  await entrar(page, "supervisor@vmanque.cl", "super1234", "//sitio-malicioso.example/robar");
  const u = new URL(page.url());
  add("WEB-10", "Login con ?next=//sitio-malicioso.example", "Se queda en la web (no redirige afuera)", `Terminó en ${u.host}${u.pathname}`, u.origin === new URL(APP_URL).origin);
  await ctx.close();
}

// WEB-11 Documentos con datos personales sin sesión
{
  const r = await fetch(`${APP_URL}/print/etiqueta/PED-006343`, { redirect: "manual" });
  add("WEB-11", "Abrir la etiqueta de envío (datos del cliente) sin sesión", "Redirige al login", `${r.status} → ${r.headers.get("location") ?? "-"}`, r.status >= 300 && r.status < 400 && /\/login/.test(r.headers.get("location") ?? ""));
}

// WEB-12 Método HTTP no permitido en la API
{
  const r = await api("/api/v1/orders", { method: "DELETE" });
  add("WEB-12", "DELETE /api/v1/orders (método no previsto)", "405, no borra nada", `${r.status}`, r.status === 405);
}

await browser.close();
informe("web", "Pruebas de seguridad de la web", casos);
