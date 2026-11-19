// Genera wokwi/sketch/sketch.ino a partir del firmware real, agregando sólo `#define WOKWI_LAB` arriba.
// Así el código que corre en el simulador es exactamente el de firmware/esp32-pick-to-light.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "../../firmware/esp32-pick-to-light/esp32-pick-to-light.ino");
const head = "#define WOKWI_LAB\n// Copia generada de firmware/esp32-pick-to-light/esp32-pick-to-light.ino (node wokwi/sincronizar.mjs). No editar: editar el original.\n";
fs.mkdirSync(path.join(here, "sketch"), { recursive: true });
fs.writeFileSync(path.join(here, "sketch", "sketch.ino"), head + fs.readFileSync(src, "utf8").replace(/\r\n/g, "\n"));
console.log("wokwi/sketch/sketch.ino generado desde el firmware real");
