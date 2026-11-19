import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/** AES-256-GCM for secrets at rest (marketplace tokens). Key: INTEGRATIONS_KEY, or derived from SESSION_SECRET. */
const key = () => createHash("sha256").update(process.env.INTEGRATIONS_KEY ?? `integrations:${process.env.SESSION_SECRET ?? ""}`).digest();

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function open(sealed: string): string {
  const [v, iv, tag, data] = sealed.split(".");
  if (v !== "v1") throw new Error("Formato de secreto desconocido");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}
