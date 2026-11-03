import type { LocationRole, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { qrSvg } from "@/server/qr";
import { PrintBar } from "@/components/print-bar";
import { LOCATION_ROLE } from "@/lib/labels";
import s from "../print.module.css";

export const metadata = { title: "Etiquetas de ubicación" };
const MAX = 500;

/** 100 × 50 mm location labels; the QR holds `LOC:<code>`. Filter by ids, zone, role or code. */
export default async function LocationLabels({ searchParams }: { searchParams: Promise<{ ids?: string; zona?: string; rol?: string; q?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.LocationWhereInput = {
    active: true,
    ...(sp.ids ? { id: { in: sp.ids.split(",").slice(0, MAX) } } : {}),
    ...(sp.zona ? { zone: sp.zona.toUpperCase() } : {}),
    ...(sp.rol && sp.rol in LOCATION_ROLE ? { role: sp.rol as LocationRole } : {}),
    ...(sp.q ? { code: { contains: sp.q.toUpperCase() } } : {}),
  };
  const locations = await db.location.findMany({ where, orderBy: { sortKey: "asc" }, take: MAX, select: { id: true, code: true, role: true } });
  const qrs = await Promise.all(locations.map((l) => qrSvg(`LOC:${l.code}`)));
  return (
    <>
      <style>{`@page { size: 100mm 50mm; margin: 0; }`}</style>
      <PrintBar title={`${locations.length} etiquetas de ubicación${locations.length === MAX ? ` (máximo ${MAX})` : ""}`} />
      {locations.map((l, i) => (
        <div key={l.id} className={s.sheet} style={{ width: "100mm", height: "50mm", padding: "3mm", display: "flex", gap: "3mm", alignItems: "center" }}>
          <div className={s.qr} style={{ width: "40mm", height: "40mm", flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qrs[i] }} />
          <div style={{ minWidth: 0 }}>
            <div className={s.mono} style={{ fontSize: l.code.length > 10 ? "8mm" : "10mm", fontWeight: 700, lineHeight: 1, wordBreak: "break-all" }}>{l.code}</div>
            <div style={{ fontSize: "3.5mm", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: "2mm", borderTop: "0.5mm solid #000", paddingTop: "1mm" }}>
              {LOCATION_ROLE[l.role].label}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
