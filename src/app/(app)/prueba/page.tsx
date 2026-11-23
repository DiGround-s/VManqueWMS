import { headers } from "next/headers";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { qrSvg } from "@/server/qr";
import { db } from "@/server/db";
import { demoState } from "@/features/demo/service";
import { DEMO, DEMO_CODES, type DemoCode } from "@/features/demo/steps";
import type { ShelfSlot } from "@/features/demo/demo-shelf";
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

/** The demo slot's rack and its neighbours, every level, with what each slot holds. */
async function shelfSlots(): Promise<ShelfSlot[]> {
  const m = /^([A-Z]+-\d+)-(\d+)-(\d+)$/.exec(DEMO.location);
  if (!m) return [];
  const rack = Number(m[2]);
  const racks = [rack - 1, rack, rack + 1].filter((r) => r >= 1 && r <= 6);
  const codes = racks.flatMap((r) => [1, 2, 3, 4].map((lv) => ({ code: `${m[1]}-${String(r).padStart(2, "0")}-${String(lv).padStart(2, "0")}`, rack: r, level: lv })));
  const locations = await db.location.findMany({
    where: { code: { in: codes.map((c) => c.code) } },
    select: { code: true, stock: { where: { qty: { gt: 0 } }, orderBy: { qty: "desc" }, take: 1, select: { qty: true, product: { select: { name: true, imageUrl: true } } } } },
  });
  return codes
    .filter((c) => locations.some((l) => l.code === c.code))
    .map((c) => {
      const s = locations.find((l) => l.code === c.code)?.stock[0];
      return { ...c, product: s?.product.name ?? null, imageUrl: s?.product.imageUrl ?? null, qty: s?.qty ?? 0 };
    });
}

export default async function DemoPage() {
  const user = await requirePageRole();
  const [initial, qrs, phone, shelf] = await Promise.all([
    demoState(),
    Promise.all(ORDER.map(async (key) => ({ key, svg: await qrSvg(DEMO_CODES[key].value) }))),
    phoneLink(),
    shelfSlots(),
  ]);
  return (
    <>
      <PageHeader
        title="Prueba guiada de despacho"
        description="Un pedido de prueba recorre todo el flujo, de la venta al despacho. La guía avanza sola a medida que haces cada paso en el PC o en el teléfono."
      />
      <DemoGuide initial={initial} qrs={qrs} canRun={hasRole(user, "SUPERVISOR")} phone={phone} shelf={shelf} />
    </>
  );
}
