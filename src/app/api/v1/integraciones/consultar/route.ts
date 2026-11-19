import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { cronKey } from "@/server/cron";
import { pollAllStores } from "@/features/integrations/stores/poll-all";

/**
 * Scheduled polling of the stores (called every minute by src/instrumentation.ts, or by an external cron).
 * Protected by a shared key in the `x-cron-key` header.
 */
export async function POST(req: Request) {
  const given = Buffer.from(req.headers.get("x-cron-key") ?? "");
  const want = Buffer.from(cronKey());
  if (given.length !== want.length || !timingSafeEqual(given, want)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await pollAllStores());
}
