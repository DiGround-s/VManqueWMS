import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { qrSvg } from "@/server/qr";
import { PrintBar } from "@/components/print-bar";
import { fmtDateTime } from "@/lib/format";
import s from "../../print.module.css";

export const metadata = { title: "Lista de picking" };

/** A4 pick list in route order, for picking on paper. */
export default async function PickList({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const wave = await db.wave.findUnique({
    where: { code: decodeURIComponent(code).toUpperCase() },
    include: {
      assignedUser: { select: { name: true } },
      tasks: { orderBy: { sequence: "asc" }, include: { product: { select: { sku: true, name: true } }, location: { select: { code: true } } } },
      _count: { select: { orders: true } },
    },
  });
  if (!wave) notFound();
  const qr = await qrSvg(wave.code);
  const cell = { border: "0.2mm solid #000", padding: "1.5mm 2mm" } as const;
  return (
    <>
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <PrintBar title={`Lista de picking ${wave.code}`} />
      <div className={s.sheet} style={{ width: "186mm", padding: "6mm", fontSize: "3.4mm" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4mm" }}>
          <div>
            <div style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "2.8mm" }}>Lista de picking</div>
            <div className={s.mono} style={{ fontSize: "9mm", fontWeight: 700 }}>{wave.code}</div>
            <div>{wave._count.orders} pedidos · {wave.tasks.length} paradas · {wave.assignedUser?.name ?? "sin operador"} · {fmtDateTime(new Date())}</div>
          </div>
          <div className={s.qr} style={{ width: "22mm", height: "22mm" }} dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#eee", textAlign: "left" }}>
              {["#", "Ubicación", "SKU", "Producto", "Cant.", "✓"].map((h) => <th key={h} style={cell}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {wave.tasks.map((t) => (
              <tr key={t.id} style={t.status === "SHORT" ? { background: "#f3f3f3" } : undefined}>
                <td style={cell} className={s.mono}>{t.sequence}</td>
                <td style={{ ...cell, fontWeight: 700, fontSize: "4mm" }} className={s.mono}>{t.location?.code ?? "SIN STOCK"}</td>
                <td style={cell} className={s.mono}>{t.product.sku}</td>
                <td style={cell}>{t.product.name}</td>
                <td style={{ ...cell, textAlign: "right", fontWeight: 700, fontSize: "4mm" }} className={s.mono}>{t.qtyRequired - t.qtyPicked}</td>
                <td style={{ ...cell, width: "10mm" }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
