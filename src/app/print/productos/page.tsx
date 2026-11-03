import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { qrSvg } from "@/server/qr";
import { PrintBar } from "@/components/print-bar";
import s from "../print.module.css";

export const metadata = { title: "Etiquetas de producto" };
const MAX = 500;

/** 60 × 40 mm product labels; the QR holds the SKU. Filter by ids or search. */
export default async function ProductLabels({ searchParams }: { searchParams: Promise<{ ids?: string; q?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(sp.ids ? { id: { in: sp.ids.split(",").slice(0, MAX) } } : {}),
    ...(q ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const products = await db.product.findMany({ where, orderBy: { sku: "asc" }, take: MAX, select: { id: true, sku: true, name: true } });
  const qrs = await Promise.all(products.map((p) => qrSvg(p.sku)));
  return (
    <>
      <style>{`@page { size: 60mm 40mm; margin: 0; }`}</style>
      <PrintBar title={`${products.length} etiquetas de producto`} />
      {products.map((p, i) => (
        <div key={p.id} className={s.sheet} style={{ width: "60mm", height: "40mm", padding: "2.5mm", display: "flex", gap: "2mm", alignItems: "center" }}>
          <div className={s.qr} style={{ width: "26mm", height: "26mm", flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qrs[i] }} />
          <div style={{ minWidth: 0 }}>
            <div className={s.mono} style={{ fontSize: "4.2mm", fontWeight: 700, wordBreak: "break-all", lineHeight: 1.05 }}>{p.sku}</div>
            <div style={{ fontSize: "2.8mm", lineHeight: 1.2, marginTop: "1.5mm", maxHeight: "20mm", overflow: "hidden" }}>{p.name}</div>
          </div>
        </div>
      ))}
    </>
  );
}
