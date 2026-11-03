import "server-only";
import type { MovementType } from "@prisma/client";
import type { Tx } from "@/server/db";
import { UserError } from "@/server/errors";

export type MovementInput = {
  type: MovementType;
  productId: string;
  qty: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  reference?: string | null;
  userId?: string | null;
  note?: string | null;
};

/**
 * THE only way stock changes. Must run inside a transaction:
 * - source: guarded atomic decrement (`qty >= n`), fails if the shelf does not have it;
 * - target: atomic upsert-increment;
 * - writes the ledger row.
 * A movement with neither location (SHIP) only records history.
 */
export async function applyMovement(tx: Tx, m: MovementInput) {
  if (!Number.isInteger(m.qty) || m.qty <= 0) throw new UserError("La cantidad debe ser un entero mayor a 0");
  if (m.fromLocationId && m.fromLocationId === m.toLocationId) throw new UserError("Origen y destino son la misma ubicación");

  if (m.fromLocationId) {
    const res = await tx.stockLevel.updateMany({
      where: { locationId: m.fromLocationId, productId: m.productId, qty: { gte: m.qty } },
      data: { qty: { decrement: m.qty } },
    });
    if (res.count === 0) {
      const loc = await tx.location.findUnique({ where: { id: m.fromLocationId }, select: { code: true } });
      throw new UserError(`No hay ${m.qty} unidades de ese producto en ${loc?.code ?? "la ubicación"}`);
    }
  }
  if (m.toLocationId) {
    await tx.stockLevel.upsert({
      where: { locationId_productId: { locationId: m.toLocationId, productId: m.productId } },
      create: { locationId: m.toLocationId, productId: m.productId, qty: m.qty },
      update: { qty: { increment: m.qty } },
    });
  }
  return tx.stockMovement.create({
    data: {
      type: m.type,
      productId: m.productId,
      qty: m.qty,
      fromLocationId: m.fromLocationId ?? null,
      toLocationId: m.toLocationId ?? null,
      reference: m.reference ?? null,
      userId: m.userId ?? null,
      note: m.note ?? null,
    },
    select: { id: true },
  });
}
