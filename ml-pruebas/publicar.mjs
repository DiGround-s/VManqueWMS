// Crea las publicaciones del vendedor en el entorno de pruebas de Mercado Libre a partir del catálogo del WMS.
// En Mercado Libre real, cada publicación lleva el SKU del vendedor (seller_sku): así el conector sabe qué producto es.
//   node ml-pruebas/publicar.mjs
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const aqui = path.dirname(fileURLToPath(import.meta.url));
const { Client } = createRequire(path.join(aqui, "..", "iot-lab", "package.json"))("pg");
const env = fs.readFileSync(path.join(aqui, "..", ".env"), "utf8");
const url = env.match(/^DATABASE_URL="?([^"\n]+)"?/m)[1].replace(/\?schema=.*/, "");
const db = new Client({ connectionString: url });
await db.connect();
const { rows } = await db.query(`
  SELECT p.sku, p.name, p.price, p."imageUrl", COALESCE(SUM(s.qty),0)::int AS stock
  FROM "Product" p LEFT JOIN "StockLevel" s ON s."productId" = p.id
  WHERE p.active GROUP BY p.id HAVING COALESCE(SUM(s.qty),0) > 0 ORDER BY p.sku LIMIT 12`);
await db.end();
const pubs = rows.map((r, i) => ({ id: `MLC${1500000000 + i * 37}`, title: r.name, price: r.price, available_quantity: r.stock, seller_sku: r.sku, thumbnail: r.imageUrl ? `http://localhost:3000${r.imageUrl}` : null }));
// Publicación de prueba con un SKU que no existe en el WMS (prueba ML-12: el conector debe rechazarla sin crear nada).
pubs.push({ id: "MLC1599999999", title: "Publicación de prueba con SKU inexistente", price: 1000, available_quantity: 5, seller_sku: "SKU-NO-EXISTE", thumbnail: null });
fs.writeFileSync(path.join(aqui, "publicaciones.json"), JSON.stringify(pubs, null, 1));
console.log(pubs.length, "publicaciones:", pubs.map((p) => p.seller_sku).join(", "));
