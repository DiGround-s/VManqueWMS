import { cronKey } from "./server/cron";

/** Node-only part of instrumentation: the store polling loop (see instrumentation.ts). */
export function startStorePolling(every: number) {
  const port = process.env.PORT ?? "3000";
  const tick = () =>
    fetch(`http://127.0.0.1:${port}/api/v1/integraciones/consultar`, { method: "POST", headers: { "x-cron-key": cronKey() } }).catch(() => {
      /* the server may still be starting */
    });
  setTimeout(() => {
    tick();
    setInterval(tick, every * 1000);
  }, 15_000);
}
