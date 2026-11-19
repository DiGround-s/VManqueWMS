// Convierte los diagramas HTML en PNG para el informe: node informe/diagramas/render.mjs (desde iot-lab tiene playwright-core)
import { chromium } from "playwright-core";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
for (const n of ["flujo", "red"]) {
  await p.goto(pathToFileURL(path.join(here, `${n}.html`)).href);
  await p.locator(".wrap").screenshot({ path: path.join(here, "..", "img", `diagrama-${n}.png`) });
}
await b.close();
