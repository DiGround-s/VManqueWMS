"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Loader2, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProductThumb } from "@/components/product-thumb";
import { cn } from "@/lib/cn";
import { layoutWarehouse } from "./layout";
import type { SlotState, SlotView } from "./scene";
import { LocationPanel } from "./location-panel";
import { Esp32Sim } from "./esp32-sim";
import { pixelsFor } from "./led-mapping";

const WarehouseScene = dynamic(() => import("./scene").then((m) => m.WarehouseScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted">
      <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> Cargando el mapa 3D…
    </div>
  ),
});

export type MapProduct = { id: string; sku: string; name: string; imageUrl: string | null; description: string | null; barcode: string | null; available: number; committed: number; inProcess: number };
export type MapSlot = { productId: string; qty: number; minQty: number | null; maxQty: number | null };
export type MapLocation = { id: string; code: string; zone: string; aisle: number | null; rack: number | null; level: number | null; role: "PICK" | "RESERVE" | "DOCK"; pendingPick: number; slots: MapSlot[] };

type Filter = "all" | "stock" | "low" | "empty" | "picking";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "stock", label: "Con stock" },
  { id: "low", label: "Bajo mínimo" },
  { id: "empty", label: "Vacías" },
  { id: "picking", label: "Con picking" },
];

const LEGEND: { state: SlotState; label: string; cls: string }[] = [
  { state: "ok", label: "Picking con stock", cls: "bg-[#2fbf78]" },
  { state: "reserve", label: "Reserva", cls: "bg-[#5b8def]" },
  { state: "low", label: "Bajo mínimo", cls: "bg-[#ef5a4c]" },
  { state: "dock", label: "Andén", cls: "bg-[#f5b301]" },
  { state: "empty", label: "Vacía", cls: "bg-[#d9dde3]" },
];

export function stateOf(loc: MapLocation): SlotState {
  if (loc.slots.length === 0) return "empty";
  if (loc.role === "DOCK") return "dock";
  if (loc.slots.some((s) => s.minQty != null && s.qty < s.minQty)) return "low";
  return loc.role === "RESERVE" ? "reserve" : "ok";
}

export function WarehouseMap({ locations, products, canAdjust, focusSku, focusLocation }: { locations: MapLocation[]; products: MapProduct[]; canAdjust: boolean; focusSku?: string; focusLocation?: string }) {
  const { resolvedTheme } = useTheme();
  const layout = useMemo(() => layoutWarehouse(locations), [locations]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState<string | null>(() => products.find((p) => p.sku === focusSku)?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(() => locations.find((l) => l.code === focusLocation)?.id ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [ledOn, setLedOn] = useState(true);

  // A product picked from the search jumps to its first location.
  useEffect(() => {
    if (!productId) return;
    const first = locations.find((l) => l.slots.some((s) => s.productId === productId));
    if (first) setSelectedId(first.id);
  }, [productId, locations]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.barcode === query.trim()).slice(0, 8);
  }, [query, products]);

  const slots = useMemo(() => {
    const m = new Map<string, SlotView>();
    for (const loc of locations) {
      const state = stateOf(loc);
      const passes =
        filter === "all" ||
        (filter === "stock" && loc.slots.length > 0) ||
        (filter === "low" && state === "low") ||
        (filter === "empty" && state === "empty") ||
        (filter === "picking" && loc.pendingPick > 0);
      const hasProduct = productId ? loc.slots.some((s) => s.productId === productId) : false;
      const top = [...loc.slots].sort((a, b) => b.qty - a.qty)[0];
      m.set(loc.id, {
        id: loc.id,
        code: loc.code,
        state,
        image: top ? (productById.get(top.productId)?.imageUrl ?? null) : null,
        qty: loc.slots.reduce((n, s) => n + s.qty, 0),
        dim: productId ? !hasProduct : !passes,
        highlight: hasProduct,
        picking: loc.pendingPick > 0,
        led: ledOn && (productId ? hasProduct : loc.id === selectedId),
      });
    }
    return m;
  }, [locations, filter, productId, productById, ledOn, selectedId]);

  const ledRows = useMemo(() => [...new Set(locations.map((l) => pixelsFor(l.code)?.strip).filter((s): s is string => !!s))].sort(), [locations]);
  const litCodes = useMemo(() => [...slots.values()].filter((s) => s.led).map((s) => s.code), [slots]);

  const stats = useMemo(() => {
    const shelves = locations.filter((l) => l.role !== "DOCK");
    const used = shelves.filter((l) => l.slots.length > 0).length;
    return {
      occupancy: shelves.length ? Math.round((used / shelves.length) * 100) : 0,
      units: locations.reduce((n, l) => n + l.slots.reduce((m, s) => m + s.qty, 0), 0),
      low: locations.filter((l) => stateOf(l) === "low").length,
      empty: shelves.length - used,
    };
  }, [locations]);

  const selected = locations.find((l) => l.id === selectedId) ?? null;
  const focusProduct = productId ? productById.get(productId) : undefined;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Ocupación" value={`${stats.occupancy}%`} />
          <MiniStat label="Unidades en bodega" value={stats.units.toLocaleString("es-CL")} />
          <MiniStat label="Bajo mínimo" value={stats.low} tone={stats.low > 0 ? "danger" : undefined} />
          <MiniStat label="Casillas vacías" value={stats.empty} />
        </div>

        <Card className="relative overflow-hidden">
          <div className="z-10 flex flex-wrap items-start gap-2 p-3 sm:absolute sm:inset-x-3 sm:top-3 sm:p-0">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={focusProduct ? `${focusProduct.sku} · ${focusProduct.name}` : query}
                onChange={(e) => {
                  setProductId(null);
                  setQuery(e.target.value);
                }}
                placeholder="Busca un producto para ubicarlo…"
                aria-label="Buscar producto en el mapa"
                className="h-11 w-full rounded-full bg-panel/95 pl-10 pr-10 text-sm shadow-lift ring-1 ring-inset ring-border backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand"
              />
              {(query || productId) && (
                <button type="button" onClick={() => (setQuery(""), setProductId(null))} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full hover:bg-panel-2" aria-label="Limpiar búsqueda">
                  <X className="size-4" />
                </button>
              )}
              {matches.length > 0 && !productId && (
                <ul className="absolute inset-x-0 top-12 overflow-hidden rounded-3xl bg-panel p-1.5 shadow-lift ring-1 ring-border">
                  {matches.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => (setProductId(p.id), setQuery(""))} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-panel-2">
                        <ProductThumb src={p.imageUrl} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="font-mono text-xs text-muted">{p.sku}</span>
                        </span>
                        <span className="text-xs text-muted">{locations.filter((l) => l.slots.some((s) => s.productId === p.id)).length} ubic.</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => (setFilter(f.id), setProductId(null))}
                  aria-pressed={filter === f.id && !productId}
                  className={cn(
                    "h-9 rounded-full px-3.5 text-xs font-semibold shadow-card backdrop-blur transition-colors",
                    filter === f.id && !productId ? "bg-accent text-accent-ink" : "bg-panel/95 text-text ring-1 ring-inset ring-border hover:bg-panel",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[55vh] min-h-[360px] w-full sm:h-[62vh] sm:min-h-[420px]">
            <WarehouseScene {...layout} slots={slots} selectedId={selectedId} hoveredId={hoveredId} onHover={setHoveredId} onSelect={setSelectedId} dark={resolvedTheme === "dark"} />
          </div>

          <div className="pointer-events-none flex flex-wrap items-end justify-between gap-2 p-3 sm:absolute sm:inset-x-3 sm:bottom-3 sm:p-0">
            <ul className="pointer-events-auto flex flex-wrap gap-x-3 gap-y-1 rounded-2xl bg-panel/95 px-3 py-2 text-xs shadow-card ring-1 ring-border backdrop-blur">
              {LEGEND.map((l) => (
                <li key={l.state} className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-sm", l.cls)} aria-hidden />
                  {l.label}
                </li>
              ))}
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#1f5fd6]" aria-hidden />
                Picking pendiente
              </li>
            </ul>
            <span className="rounded-full bg-panel/95 px-3 py-1.5 text-xs text-muted shadow-card ring-1 ring-border backdrop-blur">Arrastra para girar · rueda o pellizco para acercar</span>
          </div>
        </Card>

        <Esp32Sim rows={ledRows} enabled={ledOn} onToggle={() => setLedOn((v) => !v)} lit={litCodes} product={focusProduct?.name} />
      </div>

      <LocationPanel location={selected} productById={productById} locations={locations} canAdjust={canAdjust} onClose={() => setSelectedId(null)} onPickProduct={(id) => setProductId(id)} />
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" }) {
  return (
    <Card className="p-4">
      <div className="label">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tracking-tight", tone === "danger" && "text-danger")}>{value}</div>
    </Card>
  );
}
