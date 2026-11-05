"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductThumb } from "@/components/product-thumb";
import { ScanInput } from "@/components/ui/scan-input";
import { Badge } from "@/components/ui/badge";
import { useAction } from "@/lib/use-action";
import { beep } from "@/lib/beep";
import { LOCATION_ROLE } from "@/lib/labels";
import { scanInfoAction, type ScanInfo } from "./actions";

/** Scan anything: a location shows its contents, a product where it is and what is available. */
export function ConsultView({ initialCode }: { initialCode?: string }) {
  const [info, setInfo] = useState<ScanInfo | null>(null);
  const [pending, run] = useAction();
  const lookup = (code: string) => run(() => scanInfoAction({ code }), { onOk: (r) => (beep(r.type !== "none"), setInfo(r)) });
  const started = useRef(false);

  useEffect(() => {
    if (initialCode && !started.current) {
      started.current = true;
      lookup(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the code handed over from the home screen
  }, [initialCode]);

  return (
    <div className="space-y-5">
      <ScanInput size="xl" pending={pending} placeholder="Escanea ubicación, producto o pedido" onScan={lookup} />
      {info?.type === "none" && <p className="rounded-3xl border border-danger bg-danger-bg p-4 text-lg font-bold text-danger">No se encontró «{info.code}»</p>}
      {info?.type === "location" && (
        <div className="space-y-3">
          <div className="rounded-3xl border border-accent bg-accent-soft px-4 py-4">
            <Badge tone={LOCATION_ROLE[info.role].tone}>{LOCATION_ROLE[info.role].label}</Badge>
            <div className="mt-1 font-mono text-[clamp(2.5rem,13vw,4rem)] font-bold leading-none tracking-tight">{info.code}</div>
          </div>
          {info.contents.length === 0 && <p className="text-lg text-muted">Ubicación vacía</p>}
          <ul className="space-y-2">
            {info.contents.map((c) => (
              <li key={c.productId} className="flex items-center gap-3 rounded-3xl border border-border bg-panel p-2.5">
                <ProductThumb src={c.imageUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono font-bold">{c.sku}</div>
                  <div className="truncate text-[15px]">{c.name}</div>
                </div>
                <div className="pr-2 font-mono text-3xl font-bold">{c.qty}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {info?.type === "product" && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <ProductThumb src={info.imageUrl} size="lg" />
            <div className="min-w-0">
              <div className="font-mono text-4xl font-bold leading-none tracking-tight">{info.sku}</div>
              <div className="mt-1.5 text-lg font-semibold leading-snug">{info.name}</div>
              {!info.active && <Badge tone="danger">Inactivo</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-3xl border border-success/50 bg-success-bg p-3">
              <div className="label">Disponible</div>
              <div className="font-mono text-4xl font-bold text-success">{info.available}</div>
            </div>
            <div className="rounded-3xl border border-border bg-panel p-3">
              <div className="label">Comprometido</div>
              <div className="font-mono text-4xl font-bold">{info.committed}</div>
            </div>
          </div>
          <h2 className="pt-1 text-sm font-semibold text-muted">Dónde está</h2>
          <ul className="space-y-2">
            {info.locations.map((l) => (
              <li key={l.locationId} className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-panel px-4 py-3">
                <span className="min-w-0">
                  <span className="block font-mono text-2xl font-bold leading-tight">{l.code}</span>
                  <Badge tone={LOCATION_ROLE[l.role].tone}>{LOCATION_ROLE[l.role].label}</Badge>
                </span>
                <span className="font-mono text-3xl font-bold">{l.qty}</span>
              </li>
            ))}
          </ul>
          {info.locations.length === 0 && <p className="text-lg text-muted">Sin stock en ninguna ubicación</p>}
        </div>
      )}
      {info?.type === "order" && (
        <Link href={`/pedidos/${info.code}`} className="flex items-center gap-3 rounded-3xl border border-accent bg-panel p-4">
          <span className="flex-1">
            <span className="block font-mono text-3xl font-bold">{info.code}</span>
            <span className="text-muted">Pedido · ver detalle</span>
          </span>
          <ChevronRight className="size-6 text-muted" aria-hidden />
        </Link>
      )}
    </div>
  );
}
