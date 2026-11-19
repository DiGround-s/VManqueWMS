// Localizador pick-to-light: une la base de datos de la web con el ESP32 por MQTT.
// No modifica la web ni escribe en la base (la sesión de PostgreSQL es de sólo lectura).
//
//   node localizador.mjs buscar VM-0021 [--seg 20] [--color green]
//        Busca el producto (SKU o código de barras), muestra sus casillas con stock y las enciende.
//        Espera la confirmación (ack) del ESP32 y apaga después de --seg segundos.
//   node localizador.mjs encender A-02-06-03 [--color blue]    Enciende una casilla a mano.
//   node localizador.mjs apagar [A-02-06-03 ...]              Apaga esas casillas (sin argumentos: todas).
//   node localizador.mjs picking
//        Modo servicio: cada segundo revisa las olas en picking de la web y enciende la próxima
//        casilla de cada ola (un color por ola). Al recogerla en el teléfono, se apaga y pasa a la siguiente.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mqtt from "mqtt";
import pg from "pg";
import { DATABASE_URL, MQTT_URL, MQTT_USER, MQTT_PASS, PREFIX, LED_TOPIC, STRIPS, LEVELS_PER_RACK, RACKS_PER_ROW, pixelsFor, hora } from "./config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [cmd, ...rest] = process.argv.slice(2);
const flag = (name, def) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : def;
};
const args = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));
const COLORS = ["green", "blue", "yellow", "red"];

// ---------- MQTT ----------
function conectarMqtt() {
  return new Promise((resolve, reject) => {
    const c = mqtt.connect(MQTT_URL, {
      clientId: `localizador-${Math.random().toString(16).slice(2, 8)}`,
      username: MQTT_USER,
      password: MQTT_PASS,
      connectTimeout: 10_000,
    });
    c.once("connect", () => {
      console.log(`[${hora()}] [MQTT] Conectado a ${MQTT_URL} · temas ${PREFIX}/bc/...`);
      c.subscribe(`${PREFIX}/bc/ack/#`, { qos: 1 }, () => resolve(c));
    });
    c.once("error", reject);
  });
}

// Confirmaciones del ESP32: código de ubicación → { msg, t }
const acks = new Map();
const esperas = new Map();
function escucharAcks(c) {
  c.on("message", (topic, buf) => {
    const code = topic.split("/").pop();
    let msg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return;
    }
    acks.set(`${code}:${msg.on}`, { msg, t: Date.now() });
    esperas.get(`${code}:${msg.on}`)?.(msg);
  });
}
function esperarAck(code, on, ms = 8000) {
  return new Promise((resolve) => {
    const key = `${code}:${on}`;
    const timer = setTimeout(() => {
      esperas.delete(key);
      resolve(null);
    }, ms);
    esperas.set(key, (msg) => {
      clearTimeout(timer);
      esperas.delete(key);
      resolve(msg);
    });
  });
}

function publicar(c, code, payload) {
  return new Promise((resolve, reject) =>
    c.publish(`${LED_TOPIC}/${code}`, JSON.stringify(payload), { qos: 1 }, (err) => (err ? reject(err) : resolve())),
  );
}

async function encender(c, code, color = "green", blink = 1) {
  const t0 = Date.now();
  const espera = esperarAck(code, 1);
  await publicar(c, code, { on: 1, color, blink });
  const px = pixelsFor(code);
  console.log(`[${hora()}] [MQTT] -> ${LED_TOPIC}/${code} {"on":1,"color":"${color}","blink":${blink}}  (tira ${px?.strip ?? "-"}, píxeles ${px ? `${px.first}-${px.last}` : "-"})`);
  const ack = await espera;
  const ms = Date.now() - t0;
  if (ack) console.log(`[${hora()}] [ESP32] <- ack ${code}: tira ${ack.strip}, píxeles ${ack.first}-${ack.last}, color ${ack.color} (${ms} ms)`);
  else console.log(`[${hora()}] [ESP32] sin confirmación de ${code} en 8 s (¿está corriendo la simulación de Wokwi en VS Code?)`);
  return { ack, ms };
}

async function apagar(c, code) {
  const espera = esperarAck(code, 0, 5000);
  await publicar(c, code, { on: 0 });
  console.log(`[${hora()}] [MQTT] -> ${LED_TOPIC}/${code} {"on":0}`);
  const ack = await espera;
  if (ack) console.log(`[${hora()}] [ESP32] <- ack ${code}: apagado`);
  return ack;
}

// ---------- Base de datos (sólo lectura) ----------
async function conectarBd() {
  if (!DATABASE_URL) throw new Error("Falta DATABASE_URL (se lee del .env de la web)");
  const db = new pg.Client({ connectionString: DATABASE_URL.replace(/\?schema=\w+/, "") });
  await db.connect();
  await db.query("SET default_transaction_read_only = on");
  return db;
}

async function ubicacionesDe(db, termino) {
  const { rows } = await db.query(
    `SELECT p.sku, p.name, p.barcode, l.code AS ubicacion, l.role, s.qty
       FROM "Product" p
       JOIN "StockLevel" s ON s."productId" = p.id
       JOIN "Location" l ON l.id = s."locationId"
      WHERE (p.sku = $1 OR p.barcode = $1) AND s.qty > 0 AND l.active
      ORDER BY l."sortKey", l.code`,
    [termino],
  );
  return rows;
}

// Registro de evidencias (CSV): producto, código, ubicación, dispositivo, color, resultado.
function registrar(fila) {
  const dir = path.join(here, "evidencia");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "localizaciones.csv");
  if (!fs.existsSync(file)) fs.writeFileSync(file, "fecha,sku,producto,ubicacion,dispositivo,tira,pixeles_esperados,color_esperado,ack_pixeles,ack_color,ms,resultado\n");
  fs.appendFileSync(file, fila.map((v) => `"${String(v ?? "").replace(/"/g, "'")}"`).join(",") + "\n");
}

// ---------- Comandos ----------
async function buscar() {
  const termino = args[0];
  if (!termino) throw new Error("Uso: node localizador.mjs buscar <SKU o código de barras> [--seg 20]");
  const seg = Number(flag("seg", 20));
  const color = flag("color", "green");
  const db = await conectarBd();
  const filas = await ubicacionesDe(db, termino);
  await db.end();
  if (!filas.length) {
    console.log(`Producto "${termino}" no existe o no tiene stock en ninguna ubicación. No se enciende nada.`);
    return;
  }
  console.log(`\n${filas[0].sku} · ${filas[0].name} (código de barras ${filas[0].barcode ?? "-"})`);
  console.table(filas.map((f) => ({ ubicación: f.ubicacion, tipo: f.role, unidades: f.qty, LED: pixelsFor(f.ubicacion) ? `${pixelsFor(f.ubicacion).strip} px ${pixelsFor(f.ubicacion).first}-${pixelsFor(f.ubicacion).last}` : "sin LED" })));

  const c = await conectarMqtt();
  escucharAcks(c);
  const encendidas = [];
  for (const f of filas) {
    const px = pixelsFor(f.ubicacion);
    if (!px) continue;
    const { ack, ms } = await encender(c, f.ubicacion, color);
    const ok = ack && ack.strip === px.strip && ack.first === px.first && ack.last === px.last && ack.color === color;
    registrar([new Date().toISOString(), f.sku, f.name, f.ubicacion, "esp32-bc-01 (Wokwi VS Code)", px.strip, `${px.first}-${px.last}`, color, ack ? `${ack.first}-${ack.last}` : "", ack?.color, ms, ok ? "OK" : "FALLA"]);
    console.log(`           resultado: ${ok ? "OK, el ESP32 encendió la casilla esperada" : "FALLA, no coincide o no llegó"}`);
    encendidas.push(f.ubicacion);
  }
  if (seg > 0) {
    console.log(`\nApagando en ${seg} s...`);
    await new Promise((r) => setTimeout(r, seg * 1000));
    for (const code of encendidas) await apagar(c, code);
  }
  c.end();
}

async function encenderManual() {
  const c = await conectarMqtt();
  escucharAcks(c);
  for (const code of args) await encender(c, code, flag("color", "green"), Number(flag("blink", 1)));
  c.end();
}

async function apagarManual() {
  const c = await conectarMqtt();
  escucharAcks(c);
  const todas = [];
  for (const s of STRIPS) for (let r = 1; r <= RACKS_PER_ROW; r++) for (let n = 1; n <= LEVELS_PER_RACK; n++) todas.push(`${s}-${String(r).padStart(2, "0")}-${String(n).padStart(2, "0")}`);
  const lista = args.length ? args : todas;
  for (const code of lista) {
    await publicar(c, code, { on: 0 });
  }
  console.log(`[${hora()}] Apagadas ${lista.length} casillas`);
  c.end();
}

async function picking() {
  const db = await conectarBd();
  const c = await conectarMqtt();
  escucharAcks(c);
  console.log(`[${hora()}] Modo picking: siguiendo las olas en estado PICKING de la web (Ctrl+C para salir)`);
  let encendidas = new Map(); // ubicación → color
  const colorDeOla = new Map();
  let ocupado = false;

  async function ciclo() {
    if (ocupado) return;
    ocupado = true;
    try {
      // Próxima parada pendiente de cada ola en picking (la de menor secuencia).
      const { rows } = await db.query(
        `SELECT DISTINCT ON (t."waveId") w.code AS ola, l.code AS ubicacion, p.sku, p.name, t."qtyRequired" - t."qtyPicked" AS faltan
           FROM "PickTask" t
           JOIN "Wave" w ON w.id = t."waveId"
           JOIN "Location" l ON l.id = t."locationId"
           JOIN "Product" p ON p.id = t."productId"
          WHERE w.status = 'PICKING' AND t.status = 'PENDING'
          ORDER BY t."waveId", t.sequence`,
      );
      const ahora = new Map();
      for (const r of rows) {
        if (!colorDeOla.has(r.ola)) colorDeOla.set(r.ola, COLORS[colorDeOla.size % COLORS.length]);
        ahora.set(r.ubicacion, { color: colorDeOla.get(r.ola), ...r });
      }
      for (const [code] of encendidas) if (!ahora.has(code)) await apagar(c, code);
      for (const [code, r] of ahora) {
        if (encendidas.get(code)?.color === r.color) continue;
        console.log(`[${hora()}] ${r.ola}: próxima parada ${code} · ${r.sku} ${r.name} · faltan ${r.faltan} u.`);
        const { ack, ms } = await encender(c, code, r.color);
        const px = pixelsFor(code);
        registrar([new Date().toISOString(), r.sku, r.name, code, "esp32-bc-01 (Wokwi VS Code)", px?.strip, px ? `${px.first}-${px.last}` : "", r.color, ack ? `${ack.first}-${ack.last}` : "", ack?.color, ms, ack ? "OK" : "SIN ACK"]);
      }
      encendidas = ahora;
    } catch (e) {
      console.error(`[${hora()}] Error: ${e.message}`);
    } finally {
      ocupado = false;
    }
  }
  await ciclo();
  const timer = setInterval(ciclo, 1000);
  process.on("SIGINT", async () => {
    clearInterval(timer);
    for (const [code] of encendidas) await publicar(c, code, { on: 0 });
    console.log(`\n[${hora()}] Casillas apagadas. Hasta luego.`);
    c.end();
    await db.end();
    process.exit(0);
  });
}

const comandos = { buscar, encender: encenderManual, apagar: apagarManual, picking };
if (!comandos[cmd]) {
  console.log("Uso: node localizador.mjs <buscar SKU | encender UBICACIÓN | apagar [UBICACIÓN] | picking>");
  process.exit(1);
}
comandos[cmd]().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
