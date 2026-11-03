import "server-only";
import { db, type Tx } from "@/server/db";
import { looksLikeOrderCode, parseScan } from "@/server/domain/scan";
import { UserError } from "@/server/errors";

const productSelect = { id: true, sku: true, name: true, barcode: true, imageUrl: true, active: true } as const;
const locationSelect = { id: true, code: true, zone: true, role: true, active: true, warehouseId: true } as const;

export type ResolvedProduct = { id: string; sku: string; name: string; barcode: string | null; imageUrl: string | null; active: boolean };
export type ResolvedLocation = { id: string; code: string; zone: string; role: "PICK" | "RESERVE" | "DOCK"; active: boolean; warehouseId: string };

export type Resolved =
  | { type: "location"; location: ResolvedLocation }
  | { type: "product"; product: ResolvedProduct }
  | { type: "order"; order: { id: string; code: string; status: string } }
  | { type: "none"; code: string };

function findProduct(client: Tx | typeof db, code: string) {
  return client.product.findFirst({
    where: { OR: [{ sku: code }, { sku: code.toUpperCase() }, { barcode: code }] },
    select: productSelect,
  });
}

function findLocation(client: Tx | typeof db, code: string) {
  return client.location.findFirst({ where: { code: code.toUpperCase() }, select: locationSelect, orderBy: { createdAt: "asc" } });
}

/**
 * THE scan resolver: `LOC:<code>` or a location code → location; sku or barcode → product;
 * order code → order. Every scan field in the app goes through here.
 */
export async function resolveCode(raw: string, client: Tx | typeof db = db): Promise<Resolved> {
  const parsed = parseScan(raw);
  if (!parsed) return { type: "none", code: raw };
  if (parsed.kind === "location") {
    const location = await findLocation(client, parsed.code);
    return location ? { type: "location", location } : { type: "none", code: raw };
  }
  const code = parsed.code;
  if (looksLikeOrderCode(code)) {
    const order = await client.order.findUnique({ where: { code: code.toUpperCase() }, select: { id: true, code: true, status: true } });
    if (order) return { type: "order", order };
  }
  const [location, product] = await Promise.all([findLocation(client, code), findProduct(client, code)]);
  if (location) return { type: "location", location };
  if (product) return { type: "product", product };
  return { type: "none", code };
}

export async function requireProduct(code: string, client: Tx | typeof db = db): Promise<ResolvedProduct> {
  const r = await resolveCode(code, client);
  if (r.type !== "product") throw new UserError(r.type === "none" ? `Código ${code} no encontrado` : `${code} no es un producto`);
  if (!r.product.active) throw new UserError(`El producto ${r.product.sku} está inactivo`);
  return r.product;
}

export async function requireLocation(code: string, client: Tx | typeof db = db): Promise<ResolvedLocation> {
  const r = await resolveCode(code, client);
  if (r.type !== "location") throw new UserError(r.type === "none" ? `Ubicación ${code} no encontrada` : `${code} no es una ubicación`);
  if (!r.location.active) throw new UserError(`La ubicación ${r.location.code} está inactiva`);
  return r.location;
}
