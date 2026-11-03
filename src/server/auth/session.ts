// Edge-safe (used by middleware): only jose, no Prisma.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "vm_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionRole = "ADMIN" | "SUPERVISOR" | "OPERATOR";
export type SessionPayload = { sub: string; role: SessionRole; name: string };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (at least 32 characters)");
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role as SessionRole, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
