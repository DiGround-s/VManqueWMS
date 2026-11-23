import type { SalesChannel } from "@prisma/client";

/**
 * What each store's API looks like and how the WMS talks to it, for the read-only
 * «APIs de tiendas» page. Mirrors the connectors in mercadolibre/ and stores/connectors.ts.
 */
export type ApiCall = { method: "GET" | "POST"; path: string; what: string };
export type StoreApi = {
  channel: SalesChannel;
  baseUrl: string;
  documented: boolean;
  auth: string;
  authDetail: string;
  arrival: "notificaciones" | "webhook" | "consulta" | "api-propia";
  arrivalText: string;
  receiver?: string;
  brings: string[];
  calls: ApiCall[];
  returns: ApiCall[];
};

export const STORE_APIS: StoreApi[] = [
  {
    channel: "MERCADOLIBRE",
    baseUrl: "https://api.mercadolibre.com",
    documented: true,
    auth: "OAuth 2.0",
    authDetail: "El vendedor autoriza la app una vez. El token dura 6 horas y se renueva solo.",
    arrival: "notificaciones",
    arrivalText: "Mercado Libre avisa con una notificación y el WMS consulta el detalle. Además revisa los pedidos recientes como respaldo.",
    receiver: "POST /api/v1/integraciones/mercadolibre/notificaciones",
    brings: ["Pedidos", "Preguntas", "Mensajes", "Reclamos"],
    calls: [
      { method: "GET", path: "/orders/{id}", what: "Pedido" },
      { method: "GET", path: "/shipments/{id}", what: "Envío" },
      { method: "GET", path: "/questions/{id}", what: "Pregunta" },
      { method: "GET", path: "/messages/packs/{pack}/sellers/{seller}", what: "Mensajes posventa" },
      { method: "GET", path: "/post-purchase/v1/claims/{id}", what: "Reclamo" },
    ],
    returns: [
      { method: "POST", path: "/answers", what: "Respuesta a una pregunta" },
      { method: "POST", path: "/messages/packs/{pack}/sellers/{seller}", what: "Mensaje al comprador" },
      { method: "POST", path: "/post-purchase/v1/claims/{id}/actions/send-message", what: "Mensaje en el reclamo" },
    ],
  },
  {
    channel: "FALABELLA",
    baseUrl: "https://sellercenter-api.falabella.com",
    documented: true,
    auth: "Firma HMAC-SHA256",
    authDetail: "Cada llamada lleva el UserID y una firma hecha con la API key de Seller Center.",
    arrival: "webhook",
    arrivalText: "Falabella llama al webhook del WMS cuando entra un pedido. Además se consulta como respaldo.",
    receiver: "POST /api/v1/integraciones/falabella/webhook",
    brings: ["Pedidos"],
    calls: [
      { method: "GET", path: "?Action=GetOrders", what: "Pedidos recientes" },
      { method: "GET", path: "?Action=GetOrderItems", what: "Productos del pedido" },
    ],
    returns: [],
  },
  {
    channel: "WALMART",
    baseUrl: "https://marketplace.walmartapis.com",
    documented: true,
    auth: "OAuth 2.0 (client credentials)",
    authDetail: "Client ID y Client Secret entregan un token de unos 15 minutos que va en la cabecera WM_SEC.ACCESS_TOKEN.",
    arrival: "consulta",
    arrivalText: "El WMS consulta los pedidos nuevos cada minuto.",
    brings: ["Pedidos"],
    calls: [
      { method: "POST", path: "/v3/token", what: "Token de acceso" },
      { method: "GET", path: "/v3/orders", what: "Pedidos recientes" },
    ],
    returns: [{ method: "POST", path: "/v3/orders/{id}/acknowledge", what: "Confirma que el pedido se recibió" }],
  },
  {
    channel: "PARIS",
    baseUrl: "https://api-developers.ecomm.cencosud.com",
    documented: false,
    auth: "API key (Bearer)",
    authDetail: "El ID de vendedor y la API key los entrega el ejecutivo de Paris Marketplace.",
    arrival: "consulta",
    arrivalText: "El WMS consulta los pedidos nuevos cada minuto.",
    brings: ["Pedidos"],
    calls: [{ method: "GET", path: "/v1/orders", what: "Pedidos recientes" }],
    returns: [{ method: "POST", path: "/v1/orders/{id}/accept", what: "Acepta el pedido" }],
  },
  {
    channel: "HITES",
    baseUrl: "https://api.hites.com",
    documented: false,
    auth: "API key (Bearer)",
    authDetail: "El ID de vendedor y la API key los entrega el equipo de marketplace de Hites.",
    arrival: "consulta",
    arrivalText: "El WMS consulta los pedidos nuevos cada minuto.",
    brings: ["Pedidos"],
    calls: [{ method: "GET", path: "/v1/orders", what: "Pedidos recientes" }],
    returns: [{ method: "POST", path: "/v1/orders/{id}/accept", what: "Acepta el pedido" }],
  },
  {
    channel: "DIRECT",
    baseUrl: "/api/v1",
    documented: true,
    auth: "API key del WMS",
    authDetail: "La tienda propia usa una key creada en Administración → API keys, en la cabecera Authorization: Bearer.",
    arrival: "api-propia",
    arrivalText: "La tienda propia envía el pedido directo a la API del WMS y puede consultar su avance y el stock.",
    receiver: "POST /api/v1/webhooks/tienda",
    brings: ["Pedidos"],
    calls: [
      { method: "POST", path: "/orders", what: "Crea un pedido" },
      { method: "GET", path: "/orders/{código}", what: "Estado y avance" },
      { method: "GET", path: "/stock?sku=", what: "Disponible por SKU" },
    ],
    returns: [],
  },
];

export const ARRIVAL_LABEL: Record<StoreApi["arrival"], string> = {
  notificaciones: "Notificaciones + consulta de respaldo",
  webhook: "Webhook + consulta de respaldo",
  consulta: "Consulta cada minuto",
  "api-propia": "API del WMS",
};
