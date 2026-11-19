// Utilidades de las pruebas: imprime la tabla y guarda los resultados en iot-lab/evidencia/<nombre>.json.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "evidencia");

export function informe(nombre, titulo, casos) {
  console.log(`\n${titulo} · ${new Date().toLocaleString("es-CL")}`);
  console.table(casos.map(({ id, prueba, esperado, obtenido, resultado }) => ({ id, prueba, esperado, obtenido: String(obtenido).slice(0, 70), resultado })));
  const ok = casos.filter((c) => c.resultado === "OK").length;
  console.log(`${ok}/${casos.length} pruebas OK`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${nombre}.json`), JSON.stringify({ titulo, fecha: new Date().toISOString(), casos }, null, 2));
  if (ok !== casos.length) process.exitCode = 1;
}
