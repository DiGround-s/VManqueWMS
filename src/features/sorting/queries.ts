import "server-only";
import { db } from "@/server/db";

export async function sortingWaves(code?: string) {
  const waves = await db.wave.findMany({ where: { status: "SORTING" }, orderBy: { createdAt: "asc" }, take: 50, select: { id: true, code: true } });
  const selected = code ? waves.find((w) => w.code === code.toUpperCase()) : waves.length === 1 ? waves[0] : undefined;
  return { waves, selected };
}
