"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Box, ExternalLink, MapPin, MinusCircle, MousePointerClick, Printer, Smartphone, Waves, X } from "lucide-react";
import { Card, CapacityMeter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ProductThumb } from "@/components/product-thumb";
import { StockPill } from "@/components/stock-pill";
import { useAction } from "@/lib/use-action";
import { LOCATION_ROLE } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { adjustAction, transferAction } from "@/features/inventory/actions";
import type { MapLocation, MapProduct, MapSlot } from "./warehouse-map";

type Props = {
  location: MapLocation | null;
  productById: Map<string, MapProduct>;
  locations: MapLocation[];
  canAdjust: boolean;
  onClose: () => void;
  onPickProduct: (id: string) => void;
};

export function LocationPanel({ location, productById, locations, canAdjust, onClose, onPickProduct }: Props) {
  if (!location) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center xl:sticky xl:top-24 xl:self-start">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-success">
          <MousePointerClick className="size-6" aria-hidden />
        </span>
        <p className="font-semibold">Toca una casilla del mapa</p>
        <p className="max-w-[34ch] text-sm text-muted">Verás los productos que guarda, con foto, descripción y stock, y podrás retirar o mover unidades desde aquí.</p>
      </Card>
    );
  }

  const total = location.slots.reduce((n, s) => n + s.qty, 0);
  return (
    <Card className="overflow-hidden xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:self-start xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-3 bg-accent px-5 py-4 text-accent-ink">
        <div>
          <div className="flex items-center gap-1.5 text-xs opacity-70">
            <MapPin className="size-3.5" aria-hidden /> Zona {location.zone}
            {location.aisle != null && ` · pasillo ${location.aisle} · rack ${location.rack} · nivel ${location.level}`}
          </div>
          <div className="mt-1 font-mono text-3xl font-semibold tracking-tight">{location.code}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={LOCATION_ROLE[location.role].tone}>{LOCATION_ROLE[location.role].label}</Badge>
            <span className="rounded-full bg-accent-ink/15 px-2.5 py-0.5 text-xs font-semibold">{total} unidades</span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-accent-ink/15 hover:bg-accent-ink/25" aria-label="Cerrar">
          <X className="size-4" />
        </button>
      </div>

      {location.pendingPick > 0 && (
        <div className="flex items-center gap-2 bg-info-bg px-5 py-2.5 text-sm font-medium text-info">
          <Waves className="size-4" aria-hidden /> {location.pendingPick} unidades por recoger en olas abiertas
        </div>
      )}

      <div className="space-y-4 p-5">
        {location.slots.length === 0 ? (
          <div className="rounded-3xl bg-panel-2 p-6 text-center text-sm text-muted">
            <Box className="mx-auto mb-2 size-6" aria-hidden />
            Casilla vacía. Lista para recibir mercadería.
          </div>
        ) : (
          location.slots.map((slot) => {
            const p = productById.get(slot.productId);
            return p ? <ProductCard key={slot.productId} slot={slot} product={p} location={location} locations={locations} canAdjust={canAdjust} onPickProduct={onPickProduct} /> : null;
          })
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Link href={`/print/ubicaciones?ids=${location.id}`} target="_blank" className={buttonClass("secondary", "sm")}>
            <Printer className="size-4" aria-hidden /> Etiqueta
          </Link>
          <Link href={`/ubicaciones/${location.id}`} className={buttonClass("secondary", "sm")}>
            <ExternalLink className="size-4" aria-hidden /> Detalle
          </Link>
          <Link href={`/m/consultar?c=${encodeURIComponent(location.code)}`} className={buttonClass("secondary", "sm")}>
            <Smartphone className="size-4" aria-hidden /> En el teléfono
          </Link>
        </div>
      </div>
    </Card>
  );
}

function ProductCard({ slot, product: p, location, locations, canAdjust, onPickProduct }: { slot: MapSlot; product: MapProduct; location: MapLocation; locations: MapLocation[]; canAdjust: boolean; onPickProduct: (id: string) => void }) {
  const [mode, setMode] = useState<"none" | "take" | "move">("none");
  const elsewhere = locations.filter((l) => l.id !== location.id && l.slots.some((s) => s.productId === p.id));
  return (
    <div className="overflow-hidden rounded-3xl ring-1 ring-border">
      <div className="relative aspect-[16/9] bg-panel-2">
        <ProductThumb src={p.imageUrl} size="lg" className="size-full rounded-none" />
        <span className="absolute left-3 top-3"><StockPill available={p.available} /></span>
        <span className="absolute bottom-3 right-3 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-ink shadow-lift">{slot.qty} aquí</span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="font-semibold leading-snug">{p.name}</div>
          <div className="font-mono text-xs text-muted">{p.sku}{p.barcode && ` · ${p.barcode}`}</div>
        </div>
        {p.description && <p className="text-sm leading-relaxed text-muted">{p.description}</p>}

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-brand-soft p-2"><dt className="text-[11px] text-success">Disponible</dt><dd className="text-lg font-semibold text-success">{p.available}</dd></div>
          <div className="rounded-2xl bg-panel-2 p-2"><dt className="text-[11px] text-muted">Comprometido</dt><dd className="text-lg font-semibold">{p.committed}</dd></div>
          <div className="rounded-2xl bg-panel-2 p-2"><dt className="text-[11px] text-muted">En proceso</dt><dd className="text-lg font-semibold">{p.inProcess}</dd></div>
        </dl>

        {(slot.minQty != null || slot.maxQty != null) && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Capacidad de la casilla</span>
            <CapacityMeter qty={slot.qty} min={slot.minQty} max={slot.maxQty} />
          </div>
        )}

        {elsewhere.length > 0 && (
          <div className="text-sm">
            <div className="mb-1.5 text-muted">También está en</div>
            <div className="flex flex-wrap gap-1.5">
              {elsewhere.map((l) => (
                <span key={l.id} className="rounded-full bg-panel-2 px-2.5 py-1 font-mono text-xs">
                  {l.code} · {l.slots.find((s) => s.productId === p.id)?.qty}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canAdjust && (
            <Button size="sm" variant={mode === "take" ? "primary" : "secondary"} onClick={() => setMode(mode === "take" ? "none" : "take")}>
              <MinusCircle className="size-4" aria-hidden /> Retirar
            </Button>
          )}
          <Button size="sm" variant={mode === "move" ? "primary" : "secondary"} onClick={() => setMode(mode === "move" ? "none" : "move")}>
            <ArrowRightLeft className="size-4" aria-hidden /> Mover
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onPickProduct(p.id)}>
            <MapPin className="size-4" aria-hidden /> Ver todas sus ubicaciones
          </Button>
          <Link href={`/productos/${p.id}`} className={buttonClass("ghost", "sm")}>
            <ExternalLink className="size-4" aria-hidden /> Ficha
          </Link>
        </div>

        {mode === "take" && <TakeForm slot={slot} location={location} onDone={() => setMode("none")} />}
        {mode === "move" && <MoveForm slot={slot} location={location} locations={locations} onDone={() => setMode("none")} />}
      </div>
    </div>
  );
}

const REASONS = ["Retiro para tienda", "Muestra / degustación", "Producto dañado", "Producto vencido", "Uso interno", "Corrección de conteo"];

function TakeForm({ slot, location, onDone }: { slot: MapSlot; location: MapLocation; onDone: () => void }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState(REASONS[0]);
  return (
    <form
      className="space-y-3 rounded-3xl bg-panel-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => adjustAction({ locationId: location.id, entries: [{ productId: slot.productId, expected: slot.qty, counted: slot.qty - qty }], note: `${reason} (mapa)` }), {
          success: `Retiradas ${qty} u. de ${location.code}`,
          onOk: () => (onDone(), router.refresh()),
        });
      }}
    >
      <div className="grid grid-cols-[96px_1fr] gap-2">
        <Field label="Cantidad"><Input type="number" inputMode="numeric" min={1} max={slot.qty} value={qty} onChange={(e) => setQty(Math.min(slot.qty, Math.max(1, Number(e.target.value) || 1)))} /></Field>
        <Field label="Motivo">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
      </div>
      <p className="text-xs text-muted">Queda registrado como ajuste manual con el motivo. Quedarán {slot.qty - qty} u. en {location.code}.</p>
      <Button type="submit" variant="primary" size="md" pending={pending} className="w-full">Retirar {qty} {qty === 1 ? "unidad" : "unidades"}</Button>
    </form>
  );
}

function MoveForm({ slot, location, locations, onDone }: { slot: MapSlot; location: MapLocation; locations: MapLocation[]; onDone: () => void }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [qty, setQty] = useState(slot.qty);
  const targets = locations.filter((l) => l.id !== location.id);
  const suggested = targets.find((l) => l.slots.some((s) => s.productId === slot.productId)) ?? targets.find((l) => l.slots.length === 0 && l.role !== "DOCK");
  const [to, setTo] = useState(suggested?.id ?? targets[0]?.id ?? "");
  return (
    <form
      className="space-y-3 rounded-3xl bg-panel-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => transferAction({ productId: slot.productId, fromLocationId: location.id, toLocationId: to, qty, note: "Traspaso desde el mapa" }), {
          success: `Movidas ${qty} u. a ${targets.find((l) => l.id === to)?.code}`,
          onOk: () => (onDone(), router.refresh()),
        });
      }}
    >
      <div className="grid grid-cols-[96px_1fr] gap-2">
        <Field label="Cantidad"><Input type="number" inputMode="numeric" min={1} max={slot.qty} value={qty} onChange={(e) => setQty(Math.min(slot.qty, Math.max(1, Number(e.target.value) || 1)))} /></Field>
        <Field label="Destino">
          <Select value={to} onChange={(e) => setTo(e.target.value)} className={cn("font-mono")}>
            {targets.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} {l.slots.length === 0 ? "· vacía" : l.slots.some((s) => s.productId === slot.productId) ? "· mismo producto" : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button type="submit" variant="primary" size="md" pending={pending} className="w-full" disabled={!to}>Mover {qty} u.</Button>
    </form>
  );
}
