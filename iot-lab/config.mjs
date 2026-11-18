// Configuración compartida del laboratorio. Todo se puede cambiar con variables de entorno.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

// Lee DATABASE_URL del .env de la web (sin modificarlo) si no viene en el entorno.
function fromDotEnv(name) {
  try {
    const txt = fs.readFileSync(path.join(here, "..", ".env"), "utf8");
    const m = new RegExp(`^${name}=["']?([^"'\\r\\n]*)`, "m").exec(txt);
    return m?.[1];
  } catch {
    return undefined;
  }
}

export const DATABASE_URL = process.env.DATABASE_URL ?? fromDotEnv("DATABASE_URL");
export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// Broker MQTT. En el laboratorio, el ESP32 simulado en Wokwi sólo llega a Internet, por eso se usa
// un broker público. En la bodega real es Mosquitto en 192.168.10.10 con usuario y clave.
export const MQTT_URL = process.env.MQTT_URL ?? "mqtt://broker.hivemq.com:1883";
export const MQTT_USER = process.env.MQTT_USER;
export const MQTT_PASS = process.env.MQTT_PASS;

// Prefijo de los temas. Debe ser igual al LAB_PREFIX del sketch de Wokwi (node wokwi/sincronizar.mjs).
// En la bodega real el prefijo es "vmanque".
export const PREFIX = process.env.LAB_PREFIX ?? "vmanque-g5-lab";
export const LED_TOPIC = `${PREFIX}/bc/led`;

// Mismo mapeo que firmware/esp32-pick-to-light y src/features/map/led-mapping.ts.
export const LEDS_PER_SLOT = 6;
export const LEVELS_PER_RACK = 4;
export const RACKS_PER_ROW = 6;
export const STRIPS = ["A-01", "A-02", "B-01"];

/** "A-02-06-03" → { strip: "A-02", first: 132, last: 137 } o null si no tiene LED (andén, etc.). */
export function pixelsFor(code) {
  const m = /^([A-Z]+)-(\d+)-(\d+)-(\d+)$/.exec(code);
  if (!m) return null;
  const strip = `${m[1]}-${m[2]}`;
  const rack = Number(m[3]);
  const level = Number(m[4]);
  if (!STRIPS.includes(strip) || rack < 1 || rack > RACKS_PER_ROW || level < 1 || level > LEVELS_PER_RACK) return null;
  const first = ((rack - 1) * LEVELS_PER_RACK + (level - 1)) * LEDS_PER_SLOT;
  return { strip, first, last: first + LEDS_PER_SLOT - 1 };
}

export const hora = () => new Date().toLocaleTimeString("es-CL", { hour12: false });
