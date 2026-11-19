import "server-only";
import { db } from "@/server/db";
import { open, seal } from "@/server/secret-box";
import { UserError } from "@/server/errors";

/**
 * Mercado Libre API client: OAuth 2.0 (authorization code + refresh token) and authenticated calls.
 * The same code talks to the real API or to the lab test server; only the URLs in the environment change:
 *   ML_API_URL   https://api.mercadolibre.com            (lab: http://127.0.0.1:4100)
 *   ML_AUTH_URL  https://auth.mercadolibre.cl/authorization (lab: http://127.0.0.1:4100/authorization)
 *   ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI  → from the app registered in developers.mercadolibre.cl
 */
export const mlConfig = () => ({
  api: (process.env.ML_API_URL ?? "https://api.mercadolibre.com").replace(/\/$/, ""),
  auth: process.env.ML_AUTH_URL ?? "https://auth.mercadolibre.cl/authorization",
  clientId: process.env.ML_CLIENT_ID ?? "",
  clientSecret: process.env.ML_CLIENT_SECRET ?? "",
  redirectUri: process.env.ML_REDIRECT_URI ?? "",
});

export const mlConfigured = () => {
  const c = mlConfig();
  return Boolean(c.clientId && c.clientSecret && c.redirectUri);
};

export function authorizeUrl(state: string) {
  const c = mlConfig();
  const u = new URL(c.auth);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", c.clientId);
  u.searchParams.set("redirect_uri", c.redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number; user_id: number };

export class MlError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const c = mlConfig();
  const r = await fetch(`${c.api}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, ...params }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new MlError(r.status, body.message ?? `OAuth ${r.status}`);
  return body as TokenResponse;
}

async function saveTokens(t: TokenResponse, nickname?: string) {
  const data = { sellerId: String(t.user_id), accessToken: seal(t.access_token), refreshToken: seal(t.refresh_token), expiresAt: new Date(Date.now() + t.expires_in * 1000) };
  await db.marketplaceAccount.upsert({
    where: { channel: "MERCADOLIBRE" },
    create: { channel: "MERCADOLIBRE", nickname: nickname ?? String(t.user_id), ...data },
    update: { ...data, ...(nickname ? { nickname, connectedAt: new Date() } : {}) },
  });
}

/** Step 2 of OAuth: the code that came back to our redirect URI becomes an access + refresh token. */
export async function connectWithCode(code: string) {
  const c = mlConfig();
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: c.redirectUri });
  const me = await fetch(`${c.api}/users/me`, { headers: { authorization: `Bearer ${t.access_token}` } }).then((r) => r.json());
  await saveTokens(t, me.nickname);
  return { nickname: me.nickname as string, sellerId: String(t.user_id) };
}

export const getAccount = () => db.marketplaceAccount.findUnique({ where: { channel: "MERCADOLIBRE" } });

let refreshing: Promise<string> | null = null;

/** Exchanges the stored refresh token for a new pair (Mercado Libre's access token lasts 6 hours). */
async function refresh(): Promise<string> {
  refreshing ??= (async () => {
    const acc = await getAccount();
    if (!acc) throw new UserError("Mercado Libre no está conectado.");
    const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: open(acc.refreshToken) });
    await saveTokens(t);
    return t.access_token;
  })().finally(() => (refreshing = null));
  return refreshing;
}

async function accessToken() {
  const acc = await getAccount();
  if (!acc) throw new UserError("Mercado Libre no está conectado. Conéctalo en Ajustes › Integraciones.");
  // Renews 5 minutes before it expires so no call goes out with a dead token.
  if (acc.expiresAt.getTime() - Date.now() < 5 * 60_000) return refresh();
  return open(acc.accessToken);
}

/** Authenticated call. A 401 (token revoked or expired early) triggers one refresh and a retry. */
export async function ml<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const c = mlConfig();
  const call = async (token: string) =>
    fetch(`${c.api}${path}`, {
      method: init.method ?? "GET",
      headers: { authorization: `Bearer ${token}`, accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  let r = await call(await accessToken());
  if (r.status === 401) r = await call(await refresh());
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new MlError(r.status, `Mercado Libre ${r.status}: ${body.message ?? r.statusText}`);
  return body as T;
}
