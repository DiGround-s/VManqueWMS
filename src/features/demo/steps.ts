import type { OrderStatus, WaveStatus } from "@prisma/client";

/**
 * Guided dispatch test for presentations: always the same order, wave, product and location,
 * so the printed QR codes work on every run.
 */
export const DEMO = {
  orderCode: "PED-900001",
  waveCode: "OLA-9001",
  externalRef: "PRUEBA-0001",
  sku: "VM-0024",
  productName: "Tabla de picar de raulí",
  location: "A-02-05-03",
  qty: 1,
  customerName: "Cliente de prueba",
  address: "Av. Providencia 1234",
  commune: "Providencia",
  carrier: "Starken",
} as const;

export type DemoCode = "location" | "product" | "order";

/** What each QR holds: exactly what the scan fields expect. */
export const DEMO_CODES: Record<DemoCode, { label: string; value: string; caption: string }> = {
  location: { label: "Ubicación", value: `LOC:${DEMO.location}`, caption: DEMO.location },
  product: { label: "Producto", value: DEMO.sku, caption: `${DEMO.sku} · ${DEMO.productName}` },
  order: { label: "Pedido / etiqueta", value: DEMO.orderCode, caption: DEMO.orderCode },
};

export type DemoStep = {
  title: string;
  device: string;
  text: string;
  scans: DemoCode[];
  phone?: string;
  office?: string;
};

/** Index = step number. 0..5 are things to do, 6 is the finished state. */
export const DEMO_STEPS: DemoStep[] = [
  {
    title: "Crear el pedido",
    device: "PC",
    text: `Llega el pedido ${DEMO.orderCode}: ${DEMO.qty} ${DEMO.productName} para ${DEMO.customerName}, de la tienda propia.`,
    scans: [],
  },
  {
    title: "Crear la ola",
    device: "PC",
    text: `Se agrupa el pedido en la ola ${DEMO.waveCode} para que bodega lo recoja. Es lo mismo que Olas → Nueva ola.`,
    scans: [],
    office: `/pedidos/${DEMO.orderCode}`,
  },
  {
    title: "Recoger (picking)",
    device: "Teléfono",
    text: `En el teléfono abre Picking → ${DEMO.waveCode} y toca «Tomar ola y empezar». Escanea la ubicación ${DEMO.location} y después el producto.`,
    scans: ["location", "product"],
    phone: `/m/picking/${DEMO.waveCode}`,
  },
  {
    title: "Separar en la mesa",
    device: "Teléfono o PC",
    text: `Abre Separar con la ola ${DEMO.waveCode} y escanea el producto. La pantalla indica en qué casilla va: la 1.`,
    scans: ["product"],
    phone: `/m/separar?ola=${DEMO.waveCode}`,
    office: `/mesa?ola=${DEMO.waveCode}`,
  },
  {
    title: "Empacar y verificar",
    device: "Teléfono o PC",
    text: "Abre Empacar, escanea el código del pedido y luego el producto. Al completarlo se abre la etiqueta de envío.",
    scans: ["order", "product"],
    phone: "/m/empacar",
    office: "/preparacion",
  },
  {
    title: "Despachar",
    device: "Teléfono o PC",
    text: "Abre Despachar y escanea la etiqueta del pedido. El pedido queda despachado.",
    scans: ["order"],
    phone: "/m/despachar",
    office: "/despacho",
  },
  {
    title: "Pedido despachado",
    device: "Listo",
    text: `${DEMO.orderCode} recorrió todo el flujo: pedido, ola, picking, separación, empaque y despacho.`,
    scans: [],
    office: `/pedidos/${DEMO.orderCode}`,
  },
];

export const DEMO_LAST = DEMO_STEPS.length - 1;

/** Current step from the order and wave status. */
export function demoStep(order: OrderStatus | null | undefined, wave: WaveStatus | null | undefined): number {
  switch (order) {
    case "PENDING":
      return 1;
    case "IN_WAVE":
    case "PICKED":
      return wave === "SORTING" || wave === "DONE" ? 3 : 2;
    case "SORTED":
      return 4;
    case "PACKED":
      return 5;
    case "SHIPPED":
      return 6;
    default:
      return 0;
  }
}
