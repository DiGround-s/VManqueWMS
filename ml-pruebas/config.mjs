// Configuración del entorno de pruebas de Mercado Libre. Equivale a lo que se registra en developers.mercadolibre.cl
// («Mis aplicaciones»): id y secreto de la app, la URL de redirección de OAuth y la URL de notificaciones.
export const PORT = Number(process.env.ML_SIM_PORT ?? 4100);
export const BASE = `http://127.0.0.1:${PORT}`;

export const APP = {
  id: "5839201746281734", // client_id (APP_ID)
  secret: "lab-ml-secreto-0b7d6c2e9a", // client_secret (sólo laboratorio)
  redirectUri: process.env.ML_SIM_REDIRECT ?? "http://localhost:3000/api/integraciones/mercadolibre/callback",
  callbackUrl: process.env.ML_SIM_CALLBACK ?? "http://localhost:3000/api/v1/integraciones/mercadolibre/notificaciones",
  topics: ["orders_v2", "questions", "messages", "claims"],
};

// Vendedor (la tienda de VManque en Mercado Libre) y compradores de prueba.
export const SELLER = { id: 1888000001, nickname: "VMANQUE_TIENDA", first_name: "VManque", last_name: "Tienda" };
export const BUYERS = [
  { id: 1777000101, nickname: "VALEORTIZ.CL", first_name: "Valentina", last_name: "Ortiz" },
  { id: 1777000102, nickname: "GPENA_COMPRAS", first_name: "Gonzalo", last_name: "Peña" },
  { id: 1777000103, nickname: "TRINI.ARAYA", first_name: "Trinidad", last_name: "Araya" },
];

// Duración del access token en segundos (Mercado Libre usa 6 horas = 21600). Se puede acortar para probar la renovación.
export const TOKEN_TTL = Number(process.env.ML_SIM_TTL ?? 21600);
// Mercado Libre espera la respuesta 200 en 500 ms; si no llega, reintenta. Aquí: hasta 5 intentos cada 5 s.
export const NOTIF = { timeoutMs: 500, retries: 5, everyMs: 5000 };
