import type { CaseKind, ReturnStatus } from "@prisma/client";

/**
 * Demo conversations: what buyers write through each marketplace's messaging / post-sale API.
 * Shared by the seed and the "simulate incoming message" action. `{p}` = product, `{o}` = store order ref.
 */
export type Script = { kind: CaseKind; subject: string; buyer: string[]; agent?: string[]; returnStatus?: ReturnStatus; needsOrder: boolean };

export const SCRIPTS: Script[] = [
  {
    kind: "RETURN",
    subject: "Quiero devolver un producto",
    buyer: ["Hola, me llegó {p} pero no es lo que esperaba. ¿Cómo hago la devolución?", "Todavía está sellado, no lo abrí."],
    agent: ["¡Hola! Claro, aprobamos la devolución. Te llegará una etiqueta de envío al correo; llévalo a cualquier sucursal en los próximos 10 días."],
    returnStatus: "APPROVED",
    needsOrder: true,
  },
  {
    kind: "RETURN",
    subject: "Producto llegó dañado",
    buyer: ["Buenas, el paquete llegó con la caja rota y {p} venía abierto. Adjunto fotos en la plataforma.", "Necesito que me devuelvan el dinero por favor."],
    returnStatus: "REQUESTED",
    needsOrder: true,
  },
  {
    kind: "EXCHANGE",
    subject: "Cambio por otro producto",
    buyer: ["Hola, compré {p} y me equivoqué de variedad. ¿Se puede cambiar?"],
    agent: ["Hola, sí se puede. Envíanos el producto con la etiqueta que te mandamos y despachamos el cambio apenas llegue a bodega."],
    returnStatus: "IN_TRANSIT",
    needsOrder: true,
  },
  {
    kind: "SHIPPING",
    subject: "¿Cuándo llega mi pedido?",
    buyer: ["Hola, ¿me pueden decir cuándo llega el pedido {o}? El seguimiento no se actualiza."],
    needsOrder: true,
  },
  {
    kind: "SHIPPING",
    subject: "Cambio de dirección de despacho",
    buyer: ["Hola! Me cambié de departamento, ¿puedo cambiar la dirección del pedido {o}?", "Es el mismo edificio pero depto 1204."],
    needsOrder: true,
  },
  {
    kind: "CLAIM",
    subject: "No recibí el producto",
    buyer: ["El seguimiento dice entregado pero no recibí nada. Pedido {o}.", "Ya pregunté en conserjería y no hay nada."],
    needsOrder: true,
  },
  {
    kind: "CLAIM",
    subject: "Me llegó otro producto",
    buyer: ["Pedí {p} y me llegó otra cosa. ¿Qué hago?"],
    returnStatus: "REQUESTED",
    needsOrder: true,
  },
  {
    kind: "CANCEL",
    subject: "Cancelar compra",
    buyer: ["Hola, me arrepentí de la compra {o}, ¿la pueden cancelar antes de que la despachen?"],
    needsOrder: true,
  },
  {
    kind: "QUESTION",
    subject: "Pregunta antes de comprar",
    buyer: ["Hola, ¿{p} tiene stock para despacho a regiones? Estoy en Temuco."],
    needsOrder: false,
  },
  {
    kind: "QUESTION",
    subject: "¿Emiten factura?",
    buyer: ["Buenas tardes, necesito factura a nombre de mi empresa. ¿Se puede?"],
    agent: ["Hola, sí. Déjanos el RUT y la razón social y la emitimos con el despacho."],
    needsOrder: false,
  },
  {
    kind: "QUESTION",
    subject: "Fecha de vencimiento",
    buyer: ["Hola, ¿qué fecha de vencimiento tiene {p}? Quiero comprar varias unidades."],
    needsOrder: false,
  },
];

/** What each marketplace calls the thread (shown as the system line that opens it). */
export const SYSTEM_OPEN: Record<CaseKind, string> = {
  QUESTION: "Pregunta recibida desde la publicación",
  SHIPPING: "Mensaje post-venta sobre el despacho",
  RETURN: "El comprador inició una devolución",
  EXCHANGE: "El comprador solicitó un cambio",
  CLAIM: "Se abrió un reclamo en la plataforma",
  CANCEL: "El comprador pidió cancelar la compra",
};

/** Hours each store gives us to answer before it hurts the seller reputation (demo values). */
export const SLA_HOURS = { MERCADOLIBRE: 24, FALABELLA: 48, PARIS: 48, DIRECT: 24 } as const;

export function fill(text: string, product: string, orderRef: string) {
  return text.replaceAll("{p}", product).replaceAll("{o}", orderRef);
}
