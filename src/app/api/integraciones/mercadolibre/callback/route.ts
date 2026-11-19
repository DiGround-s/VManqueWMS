import { NextResponse, type NextRequest } from "next/server";
import { assertRole } from "@/server/auth/current";
import { connectWithCode } from "@/features/integrations/mercadolibre/client";

/** Step 2 of OAuth: Mercado Libre sends the admin back here with a one-time code. */
export async function GET(req: NextRequest) {
  const back = (estado: string) => {
    const res = NextResponse.redirect(new URL(`/ajustes?ml=${estado}`, req.url));
    res.cookies.delete("ml_oauth_state");
    return res;
  };
  try {
    await assertRole("ADMIN");
  } catch {
    return back("permiso");
  }
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || state !== req.cookies.get("ml_oauth_state")?.value) return back("estado-invalido");
  try {
    await connectWithCode(code);
    return back("conectado");
  } catch (e) {
    console.error("Mercado Libre OAuth", e);
    return back("error");
  }
}
