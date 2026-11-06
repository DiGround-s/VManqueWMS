import { z } from "zod";

export const CHANNEL_VALUES = ["DIRECT", "MERCADOLIBRE", "FALABELLA", "PARIS"] as const;

export const orderLineInput = z.object({
  sku: z.string().trim().min(1, "Falta el SKU").max(80),
  qty: z.coerce.number().int("Cantidad entera").min(1, "Cantidad mínima 1").max(100000),
});

export const orderInput = z.object({
  externalRef: z.string().trim().max(80).optional().transform((v) => v || undefined),
  customerName: z.string().trim().min(1, "Falta el cliente").max(200),
  address: z.string().trim().min(1, "Falta la dirección").max(300),
  commune: z.string().trim().min(1, "Falta la comuna").max(100),
  phone: z.string().trim().max(40).optional().transform((v) => v || undefined),
  carrier: z.string().trim().max(80).optional().transform((v) => v || undefined),
  notes: z.string().trim().max(1000).optional().transform((v) => v || undefined),
  priority: z.coerce.number().int().min(0).max(9).default(0),
  channel: z.enum(CHANNEL_VALUES).default("DIRECT"),
  shippingFee: z.coerce.number().int().min(0).max(10_000_000).default(0),
  lines: z.array(orderLineInput).min(1, "Agrega al menos una línea").max(500),
});

export type OrderInput = z.infer<typeof orderInput>;
