// Pruebas de login y autorización por rol con un navegador real (Playwright + Microsoft Edge).
// Además guarda capturas en informe/img para el informe.
//   npm i -D playwright-core   (una vez)   y luego:   node pruebas/roles.mjs
// Usa los usuarios de ejemplo del seed (prisma/seed.ts).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";
import { APP_URL } from "../config.mjs";
import { informe } from "./util.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const IMG = path.join(here, "..", "..", "informe", "img");
fs.mkdirSync(IMG, { recursive: true });
const USERS = {
  OPERATOR: ["operador@vmanque.cl", "opera1234"],
  SUPERVISOR: ["supervisor@vmanque.cl", "super1234"],
  ADMIN: ["admin@vmanque.cl", "admin1234"],
};

const browser = await chromium.launch({ channel: "msedge", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const casos = [];
const add = (id, prueba, esperado, obtenido, ok) => casos.push({ id, prueba, esperado, obtenido, resultado: ok ? "OK" : "FALLA" });

async function login(role, pass) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-CL", timezoneId: "America/Santiago" });
  const page = await ctx.newPage();
  await page.goto(`${APP_URL}/login`);
  await page.fill('input[name="email"]', USERS[role][0]);
  await page.fill('input[name="password"]', pass ?? USERS[role][1]);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}

// Login fallido
{
  const { ctx, page } = await login("ADMIN", "clave-incorrecta");
  await page.waitForTimeout(800);
  const msg = (await page.locator("form").innerText()).split("\n").find((l) => /incorrect|inválid|no coincide/i.test(l)) ?? "";
  await page.screenshot({ path: path.join(IMG, "web-02-login-error.png") });
  add("AUT-01", "Login con clave incorrecta", "Sigue en /login con mensaje genérico", `${new URL(page.url()).pathname} · "${msg}"`, page.url().includes("/login"));
  await ctx.close();
}
{
  const { ctx, page } = await login("ADMIN", "x"); // clave corta: la valida el servidor igual
  add("AUT-02", "Login con correo existente y clave vacía/corta", "No entra", new URL(page.url()).pathname, page.url().includes("/login"));
  await ctx.close();
}

// Login correcto y cookie de sesión
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${APP_URL}/login`);
  await page.screenshot({ path: path.join(IMG, "web-01-login.png") });
  await ctx.close();
}
const admin = await login("ADMIN");
const cookie = (await admin.ctx.cookies()).find((c) => c.name === "vm_session");
add("AUT-03", "Login correcto como administrador", "Entra al inicio", new URL(admin.page.url()).pathname, !admin.page.url().includes("/login"));
add("AUT-04", "Cookie de sesión", "httpOnly, SameSite=Lax, Secure (producción)", `httpOnly=${cookie?.httpOnly}, sameSite=${cookie?.sameSite}, secure=${cookie?.secure}`, cookie?.httpOnly && cookie?.sameSite === "Lax" && cookie?.secure);
const leida = await admin.page.evaluate(() => document.cookie.includes("vm_session"));
add("AUT-05", "JavaScript intenta leer la cookie (document.cookie)", "No puede leerla", leida ? "La lee" : "No la ve", !leida);
await admin.page.screenshot({ path: path.join(IMG, "web-03-inicio-admin.png") });

// Matriz de permisos: qué ve cada rol en cada sección.
const rutas = [
  ["/inventario", "OPERATOR"],
  ["/pedidos/nuevo", "SUPERVISOR"],
  ["/inventario/ajuste", "SUPERVISOR"],
  ["/usuarios", "ADMIN"],
  ["/api-keys", "ADMIN"],
];
const RANK = { OPERATOR: 0, SUPERVISOR: 1, ADMIN: 2 };
let n = 1;
for (const role of ["OPERATOR", "SUPERVISOR", "ADMIN"]) {
  const s = role === "ADMIN" ? admin : await login(role);
  for (const [ruta, min] of rutas) {
    await s.page.goto(APP_URL + ruta);
    await s.page.waitForLoadState("networkidle");
    const final = new URL(s.page.url());
    const debe = RANK[role] >= RANK[min];
    if (ruta === "/inventario/ajuste") {
      // La página tiene Traspaso (todos) y Ajuste manual (supervisor+); al operador se le oculta el ajuste.
      const oculto = await s.page.getByText("Sólo supervisores").isVisible();
      add(`ROL-${String(n++).padStart(2, "0")}`, `${role} abre ${ruta} (formulario de ajuste manual)`, debe ? "Ve el formulario de ajuste" : "Ajuste oculto: «Sólo supervisores»", oculto ? "Ajuste oculto: «Sólo supervisores»" : "Ve el formulario de ajuste", debe === !oculto);
      if (role === "OPERATOR") await s.page.screenshot({ path: path.join(IMG, "web-08-operador-ajuste-oculto.png") });
      continue;
    }
    const negado = final.searchParams.get("denied") === "1";
    add(`ROL-${String(n++).padStart(2, "0")}`, `${role} abre ${ruta}`, debe ? "Permitido" : "Denegado (vuelve al inicio con aviso)", negado ? `Denegado → ${final.pathname}${final.search}` : `Permitido (${final.pathname})`, debe === !negado);
    if (role === "OPERATOR" && ruta === "/usuarios") await s.page.screenshot({ path: path.join(IMG, "web-05-operador-denegado.png") });
  }
  if (role !== "ADMIN") await s.ctx.close();
}

// Capturas para el informe: API keys (la key se oculta), mapa 3D y modo bodega.
{
  const p = admin.page;
  await p.goto(`${APP_URL}/api-keys`);
  await p.getByRole("button", { name: "Nueva API key" }).click();
  await p.fill('input[name="name"]', `Pruebas informe ${new Date().toLocaleDateString("es-CL")}`);
  await p.getByRole("button", { name: "Crear" }).click();
  const input = p.locator("input[readonly]");
  await input.waitFor();
  const key = await input.inputValue();
  fs.writeFileSync(path.join(here, "..", "evidencia", "api-key.txt"), key); // carpeta ignorada por git
  await input.evaluate((el, k) => (el.value = k.slice(0, 8) + "•".repeat(24)), key);
  await p.screenshot({ path: path.join(IMG, "web-04-api-key.png") });
  await p.getByRole("button", { name: "Listo" }).click();
  await p.goto(`${APP_URL}/mapa?sku=VM-0021`);
  await p.waitForTimeout(6000);
  await p.screenshot({ path: path.join(IMG, "web-06-mapa-VM-0021.png") });
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addCookies([{ ...cookie }]);
  const p = await ctx.newPage();
  await p.goto(`${APP_URL}/m/consultar?c=VM-0021`);
  await p.waitForLoadState("networkidle");
  await p.screenshot({ path: path.join(IMG, "web-07-movil-consultar.png") });
  await ctx.close();
}
await browser.close();
informe("roles", "Pruebas de autenticación y autorización por rol", casos);
