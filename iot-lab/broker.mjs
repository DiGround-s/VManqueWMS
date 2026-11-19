// Broker MQTT local del laboratorio (cumple el papel de Mosquitto en el servidor Ubuntu).
// Exige usuario y clave, y cada usuario sólo puede usar sus temas (lista de control de acceso):
//   servidor     publica órdenes en vmanque/bc/led/#     y lee confirmaciones de vmanque/bc/ack/#
//   esp32-bc-01  lee órdenes de vmanque/bc/led/#          y publica confirmaciones en vmanque/bc/ack/#
//   monitor      sólo lee vmanque/#
//   node broker.mjs            (escucha en 127.0.0.1:1883; MQTT_BIND=0.0.0.0 para abrirlo a la red)
import net from "net";
import aedesPkg from "aedes";
import { hora } from "./config.mjs";

const USERS = {
  servidor: { pass: process.env.MQTT_PASS_SERVIDOR ?? "lab-servidor-clave", pub: ["vmanque/bc/led/"], sub: ["vmanque/bc/ack/"] },
  "esp32-bc-01": { pass: process.env.MQTT_PASS_ESP32 ?? "lab-esp32-clave", pub: ["vmanque/bc/ack/"], sub: ["vmanque/bc/led/"] },
  monitor: { pass: process.env.MQTT_PASS_MONITOR ?? "lab-monitor-clave", pub: [], sub: ["vmanque/"] },
};
// Un tema (o filtro con #) se permite sólo si queda dentro de uno de los prefijos del usuario.
const allowed = (prefixes, topic) => !topic.includes("+") && prefixes.some((p) => topic.startsWith(p));

const aedes = await aedesPkg.createBroker();
aedes.authenticate = (client, username, password, done) => {
  const u = USERS[username];
  const ok = u && password?.toString() === u.pass;
  console.log(`[${hora()}] ${ok ? "CONECTA " : "RECHAZA "} cliente=${client.id} usuario=${username ?? "(ninguno)"}`);
  if (!ok) {
    const err = new Error("Usuario o clave incorrectos");
    err.returnCode = 4;
    return done(err, false);
  }
  client.user = username;
  done(null, true);
};
aedes.authorizePublish = (client, packet, done) => {
  if (allowed(USERS[client.user].pub, packet.topic)) return done(null);
  console.log(`[${hora()}] DENEGADO publicar  ${client.user} -> ${packet.topic}`);
  done(new Error("Tema no permitido"));
};
aedes.authorizeSubscribe = (client, sub, done) => {
  if (allowed(USERS[client.user].sub, sub.topic)) return done(null, sub);
  console.log(`[${hora()}] DENEGADO suscribir ${client.user} -> ${sub.topic}`);
  done(null, null);
};
aedes.on("subscribe", (subs, client) => console.log(`[${hora()}] SUSCRIBE ${client.user} -> ${subs.map((s) => `${s.topic} (QoS ${s.qos})`).join(", ")}`));
aedes.on("publish", (packet, client) => {
  if (client) console.log(`[${hora()}] PUBLICA  ${client.user} -> ${packet.topic} ${packet.payload.toString()}`);
});
aedes.on("clientDisconnect", (client) => console.log(`[${hora()}] DESCONECTA ${client.user ?? client.id}`));

const host = process.env.MQTT_BIND ?? "127.0.0.1";
net.createServer(aedes.handle).listen(1883, host, () => console.log(`[${hora()}] Broker MQTT escuchando en ${host}:1883 (usuarios: ${Object.keys(USERS).join(", ")})`));
