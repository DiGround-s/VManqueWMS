import "server-only";
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { db } from "./db";

export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

export const apiError = (status: number, error: string, details?: unknown) => NextResponse.json({ error, ...(details ? { details } : {}) }, { status });

/** Checks `Authorization: Bearer <key>` against the stored sha256. Returns the key id or null. */
export async function authenticateApiKey(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(header);
  if (!m) return null;
  const key = await db.apiKey.findUnique({ where: { keyHash: hashApiKey(m[1]) }, select: { id: true, revokedAt: true, lastUsedAt: true } });
  if (!key || key.revokedAt) return null;
  // Throttled bookkeeping: at most one write per key per minute.
  if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000) {
    await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  }
  return key.id;
}
