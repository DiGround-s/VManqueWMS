import { qrSvg } from "@/server/qr";
import { requirePageRole } from "@/server/auth/current";
import { PrintBar } from "@/components/print-bar";
import { DEMO, DEMO_CODES, type DemoCode } from "@/features/demo/steps";
import s from "../print.module.css";

export const metadata = { title: "Códigos de la prueba guiada" };

const ORDER: DemoCode[] = ["location", "product", "order"];
const USE: Record<DemoCode, string> = {
  location: "Picking: escanéalo al llegar a la estantería.",
  product: "Picking, separar y empacar: escanéalo por cada unidad.",
  order: "Empacar y despachar: es el código de la etiqueta de envío.",
};

/** One letter-size sheet with the three fixed QR codes of the guided test. */
export default async function DemoCodes() {
  await requirePageRole();
  const qrs = await Promise.all(ORDER.map((k) => qrSvg(DEMO_CODES[k].value)));
  return (
    <>
      <style>{`@page { size: letter; margin: 0; }`}</style>
      <PrintBar title="Códigos de la prueba guiada" />
      <div className={s.sheet} style={{ width: "215.9mm", minHeight: "279.4mm", padding: "14mm", display: "flex", flexDirection: "column", gap: "8mm" }}>
        <div style={{ borderBottom: "0.6mm solid #000", paddingBottom: "3mm" }}>
          <div style={{ fontSize: "7mm", fontWeight: 700 }}>Prueba guiada de despacho</div>
          <div style={{ fontSize: "3.8mm", marginTop: "1mm" }}>
            Pedido {DEMO.orderCode} · Ola {DEMO.waveCode} · {DEMO.qty} × {DEMO.productName}. Los códigos son siempre los mismos.
          </div>
        </div>
        {ORDER.map((k, i) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: "8mm", border: "0.4mm solid #000", borderRadius: "3mm", padding: "5mm" }}>
            <div className={s.qr} style={{ width: "52mm", height: "52mm", flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qrs[i] }} />
            <div>
              <div style={{ fontSize: "3.6mm", textTransform: "uppercase", letterSpacing: "0.1em" }}>{DEMO_CODES[k].label}</div>
              <div className={s.mono} style={{ fontSize: "9mm", fontWeight: 700, lineHeight: 1.1 }}>{DEMO_CODES[k].caption.split(" · ")[0]}</div>
              {k === "product" && <div style={{ fontSize: "4.5mm", marginTop: "1mm" }}>{DEMO.productName}</div>}
              <div style={{ fontSize: "4mm", marginTop: "3mm" }}>{USE[k]}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
