// Pruebas IOT del pick-to-light contra el ESP32 (emulado en Wokwi para VS Code, o físico).
// Cada prueba publica la orden y compara la confirmación (ack) que envía el ESP32 con lo esperado.
//   node pruebas/iot.mjs            (con node broker.mjs corriendo y el simulador iniciado)
//   node pruebas/iot.mjs reconexion (IOT-07: después de reiniciar el broker, el ESP32 vuelve solo)
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mqtt from "mqtt";
import { MQTT_URL, MQTT_USER, MQTT_PASS, LED_TOPIC, PREFIX, pixelsFor } from "../config.mjs";
import { informe } from "./util.mjs";

const LAB = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const previo = path.join(LAB, "evidencia", "iot.json");
const casos = [];
const add = (id, prueba, esperado, obtenido, ok) => casos.push({ id, prueba, esperado, obtenido, resultado: ok ? "OK" : "FALLA" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const c = await new Promise((res, rej) => {
  const cl = mqtt.connect(MQTT_URL, { username: MQTT_USER, password: MQTT_PASS, clientId: `prueba-iot-${Date.now() % 100000}` });
  cl.once("connect", () => cl.subscribe(`${PREFIX}/bc/ack/#`, { qos: 1 }, () => res(cl)));
  cl.once("error", rej);
});
const acks = [];
c.on("message", (t, b) => acks.push({ code: t.split("/").pop(), msg: JSON.parse(b.toString()), t: Date.now() }));

async function orden(code, payload, ms = 6000) {
  const desde = Date.now();
  c.publish(`${LED_TOPIC}/${code}`, JSON.stringify(payload), { qos: 1 });
  for (let i = 0; i < ms / 50; i++) {
    const a = acks.find((x) => x.code === code && x.t >= desde && x.msg.on === payload.on);
    if (a) return { ...a.msg, ms: a.t - desde };
    await sleep(50);
  }
  return null;
}
const fmt = (a) => (a ? `ack ${a.on ? "encendido" : "apagado"}: tira ${a.strip}, píxeles ${a.first}–${a.last}, color ${a.color} (${a.ms} ms)` : "Sin confirmación");
const coincide = (a, code, color) => {
  const px = pixelsFor(code);
  return a && px && a.strip === px.strip && a.first === px.first && a.last === px.last && a.color === color;
};

function localizador(args) {
  return new Promise((res) => {
    const p = spawn(process.execPath, ["localizador.mjs", ...args], { cwd: LAB });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => res(out));
  });
}

if (process.argv[2] === "reconexion") {
  // IOT-07: se reinició el broker (corte de la conexión). El ESP32 debe reconectarse solo y seguir respondiendo.
  const a = await orden("A-01-01-01", { on: 1, color: "red", blink: 0 }, 15000);
  add("IOT-07", "Corte de la conexión (reinicio del broker) y orden posterior", "El ESP32 se reconecta solo y confirma A-01-01-01", fmt(a), coincide(a, "A-01-01-01", "red"));
  await orden("A-01-01-01", { on: 0 });
  const prev = fs.existsSync(previo) ? JSON.parse(fs.readFileSync(previo, "utf8")).casos.filter((x) => x.id !== "IOT-07") : [];
  casos.unshift(...prev);
  c.end();
  informe("iot", "Pruebas IOT del pick-to-light (ESP32 emulado, firmware real)", casos);
  process.exit();
}

// IOT-01: si responde, está conectado y suscrito.
let a = await orden("A-02-06-03", { on: 0 });
add("IOT-01", "ESP32 conectado al broker y suscrito a vmanque/bc/led/#", "Responde a una orden (ack)", a ? `Conectado como esp32-bc-01; ${fmt(a)}` : "No responde", !!a);

a = await orden("A-02-06-03", { on: 1, color: "green", blink: 0 });
add("IOT-02", "Encender a mano A-02-06-03 (verde)", "Tira A-02, píxeles 132–137, verde", fmt(a), coincide(a, "A-02-06-03", "green"));
await sleep(1500);
await orden("A-02-06-03", { on: 0 });

// IOT-03 y IOT-04: búsquedas reales contra la base de datos de la web, mediante el localizador.
for (const [id, sku, color] of [["IOT-03", "VM-0021", "green"], ["IOT-04a", "VM-0001", "blue"], ["IOT-04b", "VM-0018", "yellow"]]) {
  const out = await localizador(["buscar", sku, "--seg", "0", "--color", color]);
  const oks = (out.match(/resultado: OK/g) ?? []).length;
  const fallas = (out.match(/resultado: FALLA/g) ?? []).length;
  const ubic = [...out.matchAll(/ack (\S+): tira (\S+), píxeles (\d+-\d+)/g)].map((m) => `${m[1]}→${m[2]} ${m[3]}`);
  add(id, `Buscar ${sku} (color ${color})`, "Cada casilla con stock confirma su tira y píxeles", `${oks} OK, ${fallas} fallas: ${ubic.join("; ")}`, oks > 0 && fallas === 0);
  await sleep(2500);
  await localizador(["apagar"]);
}

// IOT-05: apagar.
await orden("B-01-06-01", { on: 1, color: "green", blink: 1 });
a = await orden("B-01-06-01", { on: 0 });
add("IOT-05", "Apagar B-01-06-01", "Ack de apagado en B-01, píxeles 120–125", fmt(a), a && a.on === 0 && a.strip === "B-01" && a.first === 120);

// Orden inválida: ubicación sin LED (andén) no debe encender nada ni confirmar.
a = await orden("DOCK-01", { on: 1, color: "green" }, 2500);
add("IOT-08", "Orden para una ubicación sin LED (andén DOCK-01)", "El ESP32 la ignora: no confirma nada", a ? fmt(a) : "Ignorada, sin ack", !a);

c.end();
informe("iot", "Pruebas IOT del pick-to-light (ESP32 emulado, firmware real)", casos);
