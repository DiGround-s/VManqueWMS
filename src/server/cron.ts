/**
 * Key for scheduled calls to /api/v1/integraciones/consultar: CRON_SECRET when an external cron is used,
 * otherwise a random key created once per server process (shared by instrumentation and the route handler).
 * Uses Web Crypto only, so it also compiles for the edge bundle of instrumentation.
 */
const g = globalThis as unknown as { __vmCronKey?: string };
export const cronKey = () => process.env.CRON_SECRET ?? (g.__vmCronKey ??= globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID());
