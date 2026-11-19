/**
 * Starts the store polling loop when the Node server boots: every STORE_POLL_SECONDS (default 60)
 * it calls the protected /api/v1/integraciones/consultar endpoint on itself. Disabled with STORE_POLL_SECONDS=0.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const every = Number(process.env.STORE_POLL_SECONDS ?? 60);
  if (!every) return;
  const { startStorePolling } = await import("./instrumentation-node");
  startStorePolling(every);
}
