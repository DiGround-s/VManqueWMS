// Monitor MQTT: muestra todo lo que pasa por los temas del pick-to-light (como mosquitto_sub -v).
//   node monitor.mjs
import mqtt from "mqtt";
import { MQTT_URL, MQTT_USER, MQTT_PASS, PREFIX, hora } from "./config.mjs";

const c = mqtt.connect(MQTT_URL, { clientId: `monitor-${Math.random().toString(16).slice(2, 8)}`, username: MQTT_USER, password: MQTT_PASS });
c.on("connect", () => {
  console.log(`[${hora()}] Conectado a ${MQTT_URL}. Escuchando ${PREFIX}/bc/# (Ctrl+C para salir)`);
  c.subscribe(`${PREFIX}/bc/#`, { qos: 1 });
});
c.on("message", (topic, buf) => {
  const quien = topic.includes("/ack/") ? "ESP32 -> servidor" : "servidor -> ESP32";
  console.log(`[${hora()}] ${quien.padEnd(18)} ${topic}  ${buf.toString()}`);
});
c.on("error", (e) => console.error(`Error MQTT: ${e.message}`));
