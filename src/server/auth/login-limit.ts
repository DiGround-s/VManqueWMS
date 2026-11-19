// Limits failed logins per email (5) and per IP (20, since a whole warehouse may share one public IP): after that many
// failures within WINDOW_MS, the key waits until the window ends. Kept in memory (one server process). It applies the
// same way to existing and unknown emails, so it reveals nothing.
const maxFails = (key: string) => (key.startsWith("ip:") ? 20 : 5);
const WINDOW_MS = 15 * 60 * 1000;

const fails = new Map<string, { count: number; first: number }>();

function entry(key: string, now: number) {
  const e = fails.get(key);
  if (!e || now - e.first > WINDOW_MS) return null;
  return e;
}

/** Minutes left if any of the keys is blocked, otherwise 0. */
export function blockedMinutes(keys: string[], now = Date.now()): number {
  let ms = 0;
  for (const k of keys) {
    const e = entry(k, now);
    if (e && e.count >= maxFails(k)) ms = Math.max(ms, e.first + WINDOW_MS - now);
  }
  return Math.ceil(ms / 60000);
}

export function recordFail(keys: string[], now = Date.now()) {
  for (const k of keys) {
    const e = entry(k, now);
    if (e) e.count++;
    else fails.set(k, { count: 1, first: now });
  }
  if (fails.size > 10000) for (const [k, e] of fails) if (now - e.first > WINDOW_MS) fails.delete(k);
}

export function clearFails(keys: string[]) {
  for (const k of keys) fails.delete(k);
}
