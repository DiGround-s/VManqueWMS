"use client";

import { ProductThumb } from "@/components/product-thumb";
import { useState } from "react";
import Link from "next/link";
import { ScanInput } from "@/components/ui/scan-input";
import { Badge } from "@/components/ui/badge";
import { useAction } from "@/lib/use-action";
import { beep } from "@/lib/beep";
import { LOCATION_ROLE } from "@/lib/labels";
import { scanInfoAction, type ScanInfo } from "./actions";

/** Scan anything: a location shows its contents, a product where it is and what is available. */
export function ConsultView() {
  const [info, setInfo] = useState<ScanInfo | null>(null);
  const [pending, run] = useAction();
  return (
    <div className="space-y-4">
      <ScanInput size="xl" pending={pending} placeholder="Escanea ubicación, producto o pedido" onScan={(code) => run(() => scanInfoAction({ code }), { onOk: (r) => (beep(r.type !== "none"), setInfo(r)) })} />
      {info?.type === "none" && <p className="rounded-md border-2 border-danger bg-danger-bg p-4 text-lg font-semibold text-danger">No se encontró «{info.code}»</p>}
      {info?.type === "location" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2"><span className="font-mono text-3xl font-bold">{info.code}</span><Badge tone={LOCATION_ROLE[info.role].tone}>{LOCATION_ROLE[info.role].label}</Badge></div>
          {info.contents.length === 0 && <p className="text-lg text-muted">Vacía</p>}
          <ul className="space-y-2">
            {info.contents.map((c) => (
              <li key={c.productId} className="flex items-center justify-between gap-3 rounded-md border border-border bg-panel p-3">
                <div className="min-w-0"><div className="font-mono font-semibold">{c.sku}</div><div className="truncate">{c.name}</div></div>
                <div className="font-mono text-3xl font-bold">{c.qty}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {info?.type === "product" && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <ProductThumb src={info.imageUrl} size="lg" />
            <div className="min-w-0">
              <div className="font-mono text-xl font-bold">{info.sku}</div>
              <div className="text-lg">{info.name}</div>
              {!info.active && <Badge tone="danger">Inactivo</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border-2 border-accent bg-warn-bg p-3"><div className="label">Disponible</div><div className="font-mono text-3xl font-bold">{info.available}</div></div>
            <div className="rounded-md border border-border bg-panel p-3"><div className="label">Comprometido</div><div className="font-mono text-3xl">{info.committed}</div></div>
          </div>
          <ul className="space-y-2">
            {info.locations.map((l) => (
              <li key={l.locationId} className="flex items-center justify-between rounded-md border border-border bg-panel p-3">
                <span className="font-mono text-xl font-semibold">{l.code} <Badge tone={LOCATION_ROLE[l.role].tone}>{LOCATION_ROLE[l.role].label}</Badge></span>
                <span className="font-mono text-2xl font-bold">{l.qty}</span>
              </li>
            ))}
          </ul>
          {info.locations.length === 0 && <p className="text-lg text-muted">Sin stock en ninguna ubicación</p>}
        </div>
      )}
      {info?.type === "order" && (
        <Link href={`/pedidos/${info.code}`} className="block rounded-md border-2 border-border-strong bg-panel p-4">
          <div className="font-mono text-2xl font-bold">{info.code}</div>
          <div className="text-muted">Pedido · ver detalle</div>
        </Link>
      )}
    </div>
  );
}
