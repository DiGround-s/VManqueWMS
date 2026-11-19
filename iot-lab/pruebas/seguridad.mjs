// Pruebas de seguridad de la web: sesión, CORS, almacenamiento de contraseñas y keys, modo producción.
//   node pruebas/seguridad.mjs      (con la web corriendo en APP_URL)
// Las pruebas de login y roles con el navegador están en pruebas/roles.mjs.
import pg from "pg";
import { APP_URL, DATABASE_URL } from "../config.mjs";
import { informe } from "./util.mjs";

const casos = [];
const add = (id, prueba, esperado, obtenido, ok) => casos.push({ id, prueba, esperado, obtenido, resultado: ok ? "OK" : "FALLA" });
const get = (url, opts = {}) => fetch(APP_URL + url, { redirect: "manual", ...opts });

let r = await get("/pedidos");
add("SEG-01", "Abrir /pedidos sin sesión", "Redirige a /login", `${r.status} → ${r.headers.get("location")}`, [302, 307].includes(r.status) && r.headers.get("location")?.includes("/login"));

// Token con firma inventada y token sin firma (alg none): el middleware debe rechazarlos.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const falso = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "admin", role: "ADMIN", exp: 4102444800 })}.firmaInventada`;
r = await get("/usuarios", { headers: { Cookie: `vm_session=${falso}` } });
add("SEG-02", "Cookie de sesión con firma falsificada", "Redirige a /login", `${r.status} → ${r.headers.get("location")}`, r.headers.get("location")?.includes("/login"));
const none = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "admin", role: "ADMIN", exp: 4102444800 })}.`;
r = await get("/usuarios", { headers: { Cookie: `vm_session=${none}` } });
add("SEG-03", 'Token sin firma (alg "none")', "Redirige a /login", `${r.status} → ${r.headers.get("location")}`, r.headers.get("location")?.includes("/login"));

// CORS: la API no habilita orígenes externos. Un navegador en otro sitio no puede leer las respuestas.
r = await get("/api/v1/stock?sku=VM-0021", { method: "OPTIONS", headers: { Origin: "https://sitio-malicioso.example", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" } });
const acao1 = r.headers.get("access-control-allow-origin");
add("CORS-01", "Preflight OPTIONS desde un origen externo", "Sin Access-Control-Allow-Origin", `${r.status}, Access-Control-Allow-Origin: ${acao1 ?? "(ausente)"}`, !acao1);
r = await get("/api/v1/stock?sku=VM-0021", { headers: { Origin: "https://sitio-malicioso.example" } });
const acao2 = r.headers.get("access-control-allow-origin");
add("CORS-02", "GET desde un origen externo", "Sin Access-Control-Allow-Origin (el navegador bloquea la lectura)", `${r.status}, Access-Control-Allow-Origin: ${acao2 ?? "(ausente)"}`, !acao2);

// Modo producción: errores sin detalles internos.
r = await get("/api/v1/orders", { method: "POST", headers: { Authorization: "Bearer x", "Content-Type": "application/json" }, body: "{" });
const txt = await r.text();
add("PROD-01", "Error en la API en modo producción", "Mensaje genérico, sin stack trace", `${r.status} ${txt.slice(0, 80)}`, !/at\s+\w+\s+\(|node_modules|\.ts:\d+/.test(txt));
r = await get("/ruta-que-no-existe");
const html = await r.text();
add("PROD-02", "Página inexistente en modo producción", "404 sin rutas de archivos ni stack", `${r.status}, contiene stack: ${/node_modules|webpack-internal|\.tsx?:\d+/.test(html) ? "sí" : "no"}`, r.status !== 500 && !/node_modules|webpack-internal|\.tsx?:\d+/.test(html));

// Almacenamiento: contraseñas con bcrypt y API keys sólo como huella SHA-256.
const db = new pg.Client({ connectionString: DATABASE_URL.replace(/\?schema=\w+/, "") });
await db.connect();
const users = (await db.query(`SELECT email, left("passwordHash", 7) AS inicio, length("passwordHash") AS largo FROM "User"`)).rows;
add("SEG-04", "Contraseñas guardadas", "Hash bcrypt ($2a/$2b, 60 caracteres), nunca texto plano", users.map((u) => `${u.email}: ${u.inicio}… (${u.largo})`).join("; "), users.every((u) => /^\$2[aby]\$/.test(u.inicio) && u.largo === 60));
const keys = (await db.query(`SELECT prefix, length("keyHash") AS largo, "keyHash" ~ '^[0-9a-f]{64}$' AS hex FROM "ApiKey"`)).rows;
add("SEG-05", "API keys guardadas", "Sólo prefijo + huella SHA-256 (64 hex)", keys.map((k) => `${k.prefix}… huella ${k.largo} hex=${k.hex}`).join("; ") || "(sin keys)", keys.length > 0 && keys.every((k) => k.hex));
await db.end();

informe("seguridad", "Pruebas de seguridad de la web", casos);
