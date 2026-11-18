// Genera wokwi/sketch.ino a partir del firmware real, agregando sólo `#define WOKWI_LAB` arriba.
// Uso: node wokwi/sincronizar.mjs [prefijo]   (el prefijo debe ser el mismo LAB_PREFIX del localizador)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "../../firmware/esp32-pick-to-light/esp32-pick-to-light.ino");
const prefix = process.argv[2] ?? process.env.LAB_PREFIX ?? "vmanque-g5-lab";
const head = `#define WOKWI_LAB\n#define LAB_PREFIX "${prefix}"\n// Copia generada de firmware/esp32-pick-to-light/esp32-pick-to-light.ino. No editar: editar el original.\n`;
fs.writeFileSync(path.join(here, "sketch.ino"), head + fs.readFileSync(src, "utf8").replace(/\r\n/g, "\n"));
console.log(`wokwi/sketch.ino generado (prefijo MQTT "${prefix}")`);
