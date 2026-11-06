import { z } from "zod";

export const productInput = z.object({
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9._-]{1,40}$/, "SKU: letras, números, punto, guion (máx. 40)"),
  name: z.string().trim().min(1, "Falta el nombre").max(200),
  barcode: z.string().trim().max(40).regex(/^[0-9A-Za-z-]*$/, "Código de barras inválido").optional().transform((v) => v || null),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^\/[\w\-./]+$/.test(v) || z.string().url().safeParse(v).success, "URL de imagen inválida")
    .optional()
    .transform((v) => v || null),
  description: z.string().trim().max(1000).optional().transform((v) => v || null),
  active: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productInput>;
