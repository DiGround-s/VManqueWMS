import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { assertRole } from "@/server/auth/current";
import { authorizeUrl, mlConfigured } from "@/features/integrations/mercadolibre/client";

/** Step 1 of OAuth: sends the admin to Mercado Libre to authorize the app. `state` guards against CSRF. */
export async function GET(req: Request) {
  try {
    await assertRole("ADMIN");
  } catch {
    return NextResponse.redirect(new URL("/ajustes?ml=permiso", req.url));
  }
  if (!mlConfigured()) return NextResponse.redirect(new URL("/ajustes?ml=sin-config", req.url));
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("ml_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600, secure: process.env.NODE_ENV === "production" && req.url.startsWith("https") });
  return res;
}
