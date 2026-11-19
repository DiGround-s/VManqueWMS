// Pruebas de integridad de PostgreSQL: intenta guardar datos inválidos y comprueba que la base los rechaza.
// Cada intento corre dentro de una transacción que se deshace (ROLLBACK), así que no cambia los datos.
//   node pruebas/integridad.mjs
import pg from "pg";
import { DATABASE_URL } from "../config.mjs";
import { informe } from "./util.mjs";

const url = DATABASE_URL.replace(/\?schema=\w+/, "");
const db = new pg.Client({ connectionString: url });
await db.connect();
const one = async (sql, p) => (await db.query(sql, p)).rows[0];

const loc = await one(`SELECT l.id, l.code, l."warehouseId", s.id AS sid, s.qty, s."productId" FROM "StockLevel" s JOIN "Location" l ON l.id = s."locationId" WHERE l.code = 'A-02-06-03' LIMIT 1`);
const prod = await one(`SELECT id, sku, barcode FROM "Product" WHERE sku = 'VM-0021'`);
const line = await one(`SELECT id, qty FROM "OrderLine" LIMIT 1`);

const casos = [];
async function intento(id, prueba, sql, params, esperado, debeFallar = true) {
  let obtenido;
  let fallo = false;
  await db.query("BEGIN");
  try {
    const r = await db.query(sql, params);
    obtenido = `Aceptado (${r.rowCount} filas)`;
  } catch (e) {
    fallo = true;
    obtenido = `Rechazado: ${e.code} ${e.constraint ?? ""} ${e.message}`.trim();
  }
  await db.query("ROLLBACK");
  casos.push({ id, prueba, sql: sql.replace(/\s+/g, " ").trim(), esperado, obtenido, resultado: fallo === debeFallar ? "OK" : "FALLA" });
}

await intento("INT-01", "Dejar stock negativo", `UPDATE "StockLevel" SET qty = -1 WHERE id = $1`, [loc.sid], "Rechazado por CHECK StockLevel_qty_nonnegative");
await intento("INT-02", "Descontar más de lo que hay", `UPDATE "StockLevel" SET qty = qty - $2 WHERE id = $1`, [loc.sid, loc.qty + 1], "Rechazado por CHECK (no queda negativo)");
await intento("INT-03", "Producto con SKU duplicado", `INSERT INTO "Product" (id, sku, name, "updatedAt") VALUES ('prueba-dup', $1, 'Duplicado', now())`, [prod.sku], "Rechazado por UNIQUE (sku)");
await intento("INT-04", "Producto con código de barras duplicado", `INSERT INTO "Product" (id, sku, name, barcode, "updatedAt") VALUES ('prueba-dup2', 'PRUEBA-UNICA', 'Duplicado', $1, now())`, [prod.barcode], "Rechazado por UNIQUE (barcode)");
await intento("INT-05", "Ubicación con código duplicado en la misma bodega", `INSERT INTO "Location" (id, "warehouseId", code, zone) VALUES ('prueba-loc', $1, $2, 'A')`, [loc.warehouseId, loc.code], "Rechazado por UNIQUE (warehouseId, code)");
await intento("INT-06", "Stock en una ubicación que no existe", `INSERT INTO "StockLevel" (id, "locationId", "productId", qty, "updatedAt") VALUES ('prueba-sl', 'no-existe', $1, 5, now())`, [prod.id], "Rechazado por FOREIGN KEY");
await intento("INT-07", "Borrar una ubicación que tiene stock", `DELETE FROM "Location" WHERE id = $1`, [loc.id], "Rechazado por FOREIGN KEY (ON DELETE RESTRICT)");
await intento("INT-08", "Línea de pedido con recogido mayor que pedido", `UPDATE "OrderLine" SET "pickedQty" = qty + 1 WHERE id = $1`, [line.id], "Rechazado por CHECK OrderLine_qty_valid");
await intento("INT-09", "Movimiento de stock con cantidad 0", `INSERT INTO "StockMovement" (id, "productId", qty, type) VALUES ('prueba-mov', $1, 0, 'ADJUSTMENT')`, [prod.id], "Rechazado por CHECK StockMovement_qty_positive");
await intento("INT-10", "Cambio válido (control)", `UPDATE "StockLevel" SET qty = qty WHERE id = $1`, [loc.sid], "Aceptado", false);

// INT-11: atomicidad. Se descuenta stock y luego falla el registro del movimiento: no debe quedar nada guardado.
{
  const antes = (await one(`SELECT qty FROM "StockLevel" WHERE id = $1`, [loc.sid])).qty;
  let obtenido;
  await db.query("BEGIN");
  try {
    await db.query(`UPDATE "StockLevel" SET qty = qty - 1 WHERE id = $1 AND qty >= 1`, [loc.sid]);
    await db.query(`INSERT INTO "StockMovement" (id, "productId", qty, type) VALUES ('prueba-mov2', $1, 0, 'PICK')`, [prod.id]);
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK");
    obtenido = `Falló el movimiento (${e.constraint}); `;
  }
  const despues = (await one(`SELECT qty FROM "StockLevel" WHERE id = $1`, [loc.sid])).qty;
  obtenido += `stock antes ${antes}, después ${despues}`;
  casos.push({ id: "INT-11", prueba: "Atomicidad: descuento + movimiento inválido en una transacción", sql: "BEGIN; UPDATE StockLevel ...; INSERT StockMovement qty 0; → ROLLBACK", esperado: "No se guarda nada: el stock queda igual", obtenido, resultado: antes === despues ? "OK" : "FALLA" });
}

// INT-12: concurrencia. Dos operadores intentan sacar la última unidad al mismo tiempo con el
// descuento condicional que usa la app (qty >= n). Sólo uno puede lograrlo. Al final se restaura el valor.
{
  const a = new pg.Client({ connectionString: url });
  const b = new pg.Client({ connectionString: url });
  await a.connect();
  await b.connect();
  const original = (await one(`SELECT qty FROM "StockLevel" WHERE id = $1`, [loc.sid])).qty;
  await db.query(`UPDATE "StockLevel" SET qty = 1 WHERE id = $1`, [loc.sid]);
  await a.query("BEGIN");
  await b.query("BEGIN");
  const ra = await a.query(`UPDATE "StockLevel" SET qty = qty - 1 WHERE id = $1 AND qty >= 1`, [loc.sid]);
  const pb = b.query(`UPDATE "StockLevel" SET qty = qty - 1 WHERE id = $1 AND qty >= 1`, [loc.sid]); // espera el bloqueo de A
  await a.query("COMMIT");
  const rb = await pb;
  await b.query("COMMIT");
  const final = (await one(`SELECT qty FROM "StockLevel" WHERE id = $1`, [loc.sid])).qty;
  await db.query(`UPDATE "StockLevel" SET qty = $2 WHERE id = $1`, [loc.sid, original]);
  await a.end();
  await b.end();
  casos.push({ id: "INT-12", prueba: "Concurrencia: dos retiros simultáneos de la última unidad", sql: "UPDATE ... SET qty = qty - 1 WHERE qty >= 1 (en dos conexiones)", esperado: "Uno descuenta (1 fila), el otro no (0 filas); stock final 0", obtenido: `A: ${ra.rowCount} fila, B: ${rb.rowCount} filas, stock final ${final} (restaurado a ${original})`, resultado: ra.rowCount + rb.rowCount === 1 && final === 0 ? "OK" : "FALLA" });
}

await db.end();
informe("integridad", "Pruebas de integridad de la base de datos", casos);
