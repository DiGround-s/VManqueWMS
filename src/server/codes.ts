import "server-only";
import type { Tx } from "./db";

const SEQS = { order: ["order_code_seq", "PED-", 6], wave: ["wave_code_seq", "OLA-", 4], reception: ["reception_code_seq", "REC-", 4] } as const;

/** Human-readable document number from a Postgres sequence (gap-tolerant, race-free). */
export async function nextCode(tx: Tx, kind: keyof typeof SEQS) {
  const [seq, prefix, width] = SEQS[kind];
  const rows = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT nextval('"${seq}"') AS n`);
  return prefix + String(rows[0].n).padStart(width, "0");
}
