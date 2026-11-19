// IOT-06: dos olas en picking al mismo tiempo, tomadas por dos usuarios desde el modo bodega de la web.
// El localizador (modo picking) debe encender la próxima casilla de cada ola con su propio color.
//   node pruebas/iot06.mjs   (web en APP_URL, broker y simulador corriendo)
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";
import { APP_URL } from "../config.mjs";
import { informe } from "./util.mjs";

const LAB = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMG = path.join(LAB, "..", "informe", "img");
fs.mkdirSync(IMG, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Localizador en modo picking, en segundo plano.
const loc = spawn(process.execPath, ["localizador.mjs", "picking"], { cwd: LAB });
let salida = "";
loc.stdout.on("data", (d) => ((salida += d), process.stdout.write(d)));
await sleep(2500);

const browser = await chromium.launch({ channel: "msedge" });
async function sesion(email, pass, movil = false) {
  const ctx = await browser.newContext(movil ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${APP_URL}/login`);
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="password"]', pass);
  await p.click('button[type="submit"]');
  await p.waitForLoadState("networkidle");
  return p;
}

// 1) La supervisora crea una ola con dos pedidos pendientes, sin asignar.
const sup = await sesion("supervisor@vmanque.cl", "super1234");
await sup.goto(`${APP_URL}/olas/nueva`);
const filas = sup.locator("tbody tr");
await filas.nth(0).click();
await filas.nth(1).click();
await sup.getByRole("button", { name: "Crear ola" }).click();
await sup.waitForURL(/\/olas\/OLA-/);
const nueva = sup.url().split("/").pop();
console.log("Ola creada:", nueva);

// 2) Cada usuario toma una ola desde el teléfono.
async function tomar(email, pass, ola, foto) {
  const p = await sesion(email, pass, true);
  await p.goto(`${APP_URL}/m/picking/${ola}`);
  const btn = p.getByRole("button", { name: "Tomar ola y empezar" });
  if (await btn.isVisible().catch(() => false)) await btn.click();
  await sleep(2500);
  await p.screenshot({ path: path.join(IMG, foto) });
  return p;
}
await tomar("operador@vmanque.cl", "opera1234", "OLA-0001", "iot06-operador-OLA-0001.png");
await tomar("supervisor@vmanque.cl", "super1234", nueva, `iot06-supervisora-${nueva}.png`);

// 3) Esperar a que el localizador encienda y el ESP32 confirme ambas.
for (let i = 0; i < 30 && (salida.match(/\[ESP32\] <- ack/g) ?? []).length < 2; i++) await sleep(500);
await sleep(1000);
await browser.close();

const lineas = salida.split("\n");
const paradas = lineas.filter((l) => /OLA-\d+: próxima parada/.test(l)).map((l) => l.replace(/^\[[^\]]+\]\s*/, ""));
const acks = lineas.filter((l) => l.includes("[ESP32] <- ack") && l.includes("color")).map((l) => l.replace(/^\[[^\]]+\]\s*\[ESP32\] <- /, ""));
const colores = new Set(acks.map((a) => /color (\w+)/.exec(a)?.[1]));
const ok = paradas.length >= 2 && acks.length >= 2 && colores.size >= 2;

loc.kill();
await new Promise((r) => spawn(process.execPath, ["localizador.mjs", "apagar"], { cwd: LAB }).on("close", r));

const archivo = path.join(LAB, "evidencia", "iot.json");
const prev = fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, "utf8")).casos.filter((c) => c.id !== "IOT-06") : [];
const caso = {
  id: "IOT-06",
  prueba: `Modo picking: OLA-0001 (operador) y ${nueva} (supervisora) en curso a la vez, tomadas desde el teléfono`,
  esperado: "Cada ola enciende su próxima casilla con su color; el ESP32 confirma ambas",
  obtenido: `${paradas.join(" | ")} || ${acks.join(" | ")}`,
  resultado: ok ? "OK" : "FALLA",
};
const casos = [...prev, caso].sort((a, b) => a.id.localeCompare(b.id));
informe("iot", "Pruebas IOT del pick-to-light (ESP32 emulado, firmware real)", casos);
