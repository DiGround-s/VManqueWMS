import { headers } from "next/headers";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { qrSvg } from "@/server/qr";
import { demoState } from "@/features/demo/service";
import { DEMO_CODES, type DemoCode } from "@/features/demo/steps";
import { DemoGuide } from "@/features/demo/demo-guide";

export const metadata = { title: "Prueba guiada de despacho" };
export const dynamic = "force-dynamic";

const ORDER: DemoCode[] = ["location", "product", "order"];

/** The phone can only open the app by its network address, never by localhost. */
async function phoneLink() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host || /^(localhost|127\.|\[::1\])/.test(host)) return undefined;
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/m`;
  return { url, svg: await qrSvg(url) };
}

export default async function DemoPage() {
  const user = await requirePageRole();
  const [initial, qrs, phone] = await Promise.all([
    demoState(),
    Promise.all(ORDER.map(async (key) => ({ key, svg: await qrSvg(DEMO_CODES[key].value) }))),
    phoneLink(),
  ]);
  return (
    <>
      <PageHeader
        title="Prueba guiada de despacho"
        description="Un pedido de prueba recorre todo el flujo, de la venta al despacho. La guía avanza sola a medida que haces cada paso en el PC o en el teléfono."
      />
      <DemoGuide initial={initial} qrs={qrs} canRun={hasRole(user, "SUPERVISOR")} phone={phone} />
    </>
  );
}
