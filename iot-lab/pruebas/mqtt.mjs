// Pruebas de seguridad del broker MQTT: autenticación y control de acceso por tema.
//   node pruebas/mqtt.mjs   (con node broker.mjs corriendo)
import mqtt from "mqtt";
import { MQTT_URL } from "../config.mjs";
import { informe } from "./util.mjs";

const conectar = (username, password) =>
  new Promise((resolve) => {
    const c = mqtt.connect(MQTT_URL, { username, password, reconnectPeriod: 0, connectTimeout: 4000, clientId: `prueba-${Math.random().toString(16).slice(2, 8)}` });
    c.once("connect", () => resolve({ c, ok: true }));
    c.once("error", (e) => {
      c.end(true);
      resolve({ ok: false, err: e.message });
    });
  });

// Publica con un usuario y mira si el mensaje llega a un suscriptor con permiso de lectura.
async function llega(pubUser, pubPass, topic) {
  const mon = (await conectar("monitor", "lab-monitor-clave")).c;
  await new Promise((r) => mon.subscribe("vmanque/#", { qos: 1 }, r));
  const pub = (await conectar(pubUser, pubPass)).c;
  const got = new Promise((r) => {
    mon.on("message", (t) => t === topic && r(true));
    setTimeout(() => r(false), 2500);
  });
  pub.publish(topic, '{"on":1,"color":"red","blink":0}', { qos: 0 });
  const res = await got;
  pub.end(true);
  mon.end(true);
  return res;
}

async function suscribe(user, pass, filtro) {
  const { c } = await conectar(user, pass);
  const granted = await new Promise((r) => c.subscribe(filtro, { qos: 1 }, (err, g) => r(err ? 128 : g?.[0]?.qos)));
  c.end(true);
  return granted !== 128;
}

const casos = [];
const add = (id, prueba, esperado, obtenido, ok) => casos.push({ id, prueba, esperado, obtenido, resultado: ok ? "OK" : "FALLA" });

let r = await conectar(undefined, undefined);
add("MQTT-01", "Conectar sin usuario ni clave", "Rechazado", r.ok ? "Aceptado" : `Rechazado (${r.err})`, !r.ok);
r = await conectar("esp32-bc-01", "clave-incorrecta");
add("MQTT-02", "Conectar con clave incorrecta", "Rechazado", r.ok ? "Aceptado" : `Rechazado (${r.err})`, !r.ok);
r = await conectar("servidor", "lab-servidor-clave");
r.c?.end(true);
add("MQTT-03", "Conectar como servidor con su clave", "Aceptado", r.ok ? "Aceptado" : "Rechazado", r.ok);
let ok = await llega("servidor", "lab-servidor-clave", "vmanque/bc/led/A-02-06-03");
add("MQTT-04", "Servidor publica orden en vmanque/bc/led/A-02-06-03", "Llega al suscriptor", ok ? "Llega" : "No llega", ok);
ok = await llega("esp32-bc-01", "lab-esp32-clave", "vmanque/bc/led/A-01-01-01");
add("MQTT-05", "ESP32 intenta publicar una orden (tema led)", "Bloqueado: el dispositivo no puede encender otras casillas", ok ? "Llega" : "Bloqueado", !ok);
ok = await llega("esp32-bc-01", "lab-esp32-clave", "vmanque/bc/ack/A-02-06-03");
add("MQTT-06", "ESP32 publica confirmación en vmanque/bc/ack/...", "Llega", ok ? "Llega" : "No llega", ok);
ok = await suscribe("esp32-bc-01", "lab-esp32-clave", "vmanque/#");
add("MQTT-07", "ESP32 intenta suscribirse a todo (vmanque/#)", "Suscripción rechazada", ok ? "Aceptada" : "Rechazada", !ok);
ok = await suscribe("esp32-bc-01", "lab-esp32-clave", "vmanque/bc/led/#");
add("MQTT-08", "ESP32 se suscribe a sus órdenes (vmanque/bc/led/#)", "Suscripción aceptada", ok ? "Aceptada" : "Rechazada", ok);

informe("mqtt", "Pruebas de seguridad del broker MQTT", casos);
