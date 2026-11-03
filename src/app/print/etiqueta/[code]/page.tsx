import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { qrSvg } from "@/server/qr";
import { getCompanyName } from "@/features/settings/service";
import { PrintBar } from "@/components/print-bar";
import { fmtDate } from "@/lib/format";
import s from "../../print.module.css";

export const metadata = { title: "Etiqueta de envío" };

/** 100 × 150 mm shipping label. The QR holds the order code, which Despacho scans. */
export default async function ShippingLabel({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ auto?: string }> }) {
  const [{ code }, { auto }] = await Promise.all([params, searchParams]);
  const [order, company] = await Promise.all([
    db.order.findUnique({ where: { code: decodeURIComponent(code).toUpperCase() }, include: { lines: { select: { qty: true } } } }),
    getCompanyName(),
  ]);
  if (!order) notFound();
  const qr = await qrSvg(order.code);
  const units = order.lines.reduce((n, l) => n + l.qty, 0);

  return (
    <>
      <style>{`@page { size: 100mm 150mm; margin: 0; }`}</style>
      <PrintBar title={`Etiqueta ${order.code}`} auto={auto === "1"} />
      <div className={s.sheet} style={{ width: "100mm", height: "150mm", padding: "4mm", display: "flex", flexDirection: "column", gap: "2.5mm" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "0.6mm solid #000", paddingBottom: "1.5mm" }}>
          <b style={{ fontSize: "4mm", textTransform: "uppercase", letterSpacing: "0.05em" }}>{company}</b>
          <span className={s.mono} style={{ fontSize: "3mm" }}>{fmtDate(order.packedAt ?? new Date())}</span>
        </div>
        <div style={{ display: "flex", gap: "3mm", alignItems: "center" }}>
          <div className={s.qr} style={{ width: "34mm", height: "34mm", flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qr }} />
          <div>
            <div style={{ fontSize: "2.6mm", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pedido</div>
            <div className={s.mono} style={{ fontSize: "7.5mm", fontWeight: 700, lineHeight: 1 }}>{order.code}</div>
            {order.externalRef && <div className={s.mono} style={{ fontSize: "3mm", marginTop: "1mm" }}>Ref. {order.externalRef}</div>}
            <div className={s.mono} style={{ fontSize: "3.2mm", marginTop: "1.5mm" }}>{order.lines.length} líneas · {units} u.</div>
          </div>
        </div>
        <div style={{ borderTop: "0.3mm solid #000", paddingTop: "2mm", flex: 1 }}>
          <div style={{ fontSize: "2.6mm", textTransform: "uppercase", letterSpacing: "0.1em" }}>Destinatario</div>
          <div style={{ fontSize: "5.2mm", fontWeight: 700, lineHeight: 1.15 }}>{order.customerName}</div>
          <div style={{ fontSize: "4.2mm", lineHeight: 1.25, marginTop: "1mm" }}>{order.address}</div>
          <div style={{ fontSize: "7mm", fontWeight: 700, textTransform: "uppercase", marginTop: "1.5mm" }}>{order.commune}</div>
          {order.phone && <div className={s.mono} style={{ fontSize: "3.6mm", marginTop: "1mm" }}>Tel. {order.phone}</div>}
          {order.notes && <div style={{ fontSize: "3mm", marginTop: "1.5mm", maxHeight: "12mm", overflow: "hidden" }}>{order.notes}</div>}
        </div>
        <div style={{ background: "#000", color: "#fff", padding: "2mm 3mm", fontSize: "6.5mm", fontWeight: 700, textTransform: "uppercase", textAlign: "center" }}>
          {order.carrier ?? "Sin transporte"}
        </div>
      </div>
    </>
  );
}
