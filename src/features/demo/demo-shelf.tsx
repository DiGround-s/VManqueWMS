"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Cpu, Radio, Server } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProductThumb } from "@/components/product-thumb";
import { cn } from "@/lib/cn";
import { LEDS_PER_SLOT, MQTT, pixelsFor } from "@/features/map/led-mapping";
import { DEMO } from "./steps";

export type ShelfSlot = { code: string; rack: number; level: number; product: string | null; imageUrl: string | null; qty: number };

type Line = { id: number; text: string; tone: "in" | "led" | "off" };

const PICKING = 2;
const ON = `{"on":1,"color":"green","blink":1}`;
const OFF = `{"on":0}`;

/**
 * Front view of the demo shelf with its pick-to-light strip. While the picking step is open the
 * LEDs under the demo slot blink; once the unit is picked they go off. Same topic, payload and
 * pixel mapping as the ESP32 firmware (firmware/esp32-pick-to-light).
 */
export function DemoShelf({ slots, step }: { slots: ShelfSlot[]; step: number }) {
  const lit = step === PICKING;
  const picked = step > PICKING;
  const px = pixelsFor(DEMO.location);
  const [lines, setLines] = useState<Line[]>([]);
  const [flash, setFlash] = useState(false);
  const prev = useRef<boolean | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (prev.current === lit) return;
    const first = prev.current === null;
    prev.current = lit;
    if (first && !lit) return;
    const add = (text: string, tone: Line["tone"]) => setLines((l) => [...l, { id: ++seq.current, text, tone }].slice(-6));
    const range = px ? `píxeles ${px.first}–${px.first + px.count - 1}` : "";
    if (lit) {
      add(`[MQTT] ← ${MQTT.topic}/${DEMO.location} ${ON}`, "in");
      add(`[LED]  Tira ${px?.strip} · ${range} → verde, parpadeo`, "led");
    } else {
      add(`[MQTT] ← ${MQTT.topic}/${DEMO.location} ${OFF}`, "in");
      add(`[LED]  Tira ${px?.strip} · ${range} → apagado`, "off");
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1600);
      return () => clearTimeout(t);
    }
  }, [lit, px]);

  const racks = [...new Set(slots.map((s) => s.rack))].sort((a, b) => a - b);
  const levels = [...new Set(slots.map((s) => s.level))].sort((a, b) => b - a);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div>
          <div className="label">Pick-to-light</div>
          <div className="text-lg font-semibold">
            {lit ? `La luz marca ${DEMO.location}` : picked ? "Unidad recogida: luz apagada" : "Estantería del pasillo A-02"}
          </div>
          <p className="text-sm text-muted">
            {lit
              ? "Cuando se crea la ola, el WMS publica la ubicación por MQTT y el ESP32 enciende los LED bajo la casilla."
              : picked
                ? "Al confirmar el picking, el WMS envía la orden de apagado."
                : "Los LED se encienden en el paso de picking."}
          </p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", lit ? "bg-success-bg text-success" : "bg-panel-2 text-muted")}>
          <span className={cn("size-2 rounded-full", lit ? "led-px bg-[#22ff88]" : "bg-border-strong")} aria-hidden />
          {lit ? "LED encendido" : "LED apagado"}
        </span>
      </div>

      {/* message path: WMS → broker → ESP32 */}
      <div className="mx-5 mt-4 flex items-center gap-2 text-xs font-semibold">
        <Node icon={<Server className="size-4" aria-hidden />} label="Servidor WMS" active={lit} />
        <Wire active={lit} />
        <Node icon={<Radio className="size-4" aria-hidden />} label={`Broker MQTT ${MQTT.broker}`} active={lit} />
        <Wire active={lit} delay />
        <Node icon={<Cpu className="size-4" aria-hidden />} label="ESP32 · VLAN 30" active={lit} />
      </div>

      <div className="m-5 rounded-2xl bg-[#2b2118] p-3 shadow-inner" role="img" aria-label={`Estantería A-02, racks ${racks.join(", ")}. ${lit ? `LED encendidos en ${DEMO.location}` : "LED apagados"}`}>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${racks.length}, minmax(0, 1fr))` }}>
          {racks.map((r) => (
            <div key={r} className="pb-1 text-center font-mono text-[11px] font-semibold text-[#d9c2a5]">
              Rack {String(r).padStart(2, "0")}
            </div>
          ))}
          {levels.map((lv) =>
            racks.map((r) => {
              const s = slots.find((x) => x.rack === r && x.level === lv);
              const target = s?.code === DEMO.location;
              const on = target && lit;
              return (
                <div key={`${r}-${lv}`} className="flex flex-col">
                  <div
                    className={cn(
                      "relative flex min-h-[74px] items-center gap-2 rounded-t-lg bg-[#3a2d22] px-2 py-1.5 transition-shadow duration-500",
                      on && "slot-glow",
                      target && flash && "ring-2 ring-[#22ff88]",
                    )}
                  >
                    {s?.product ? (
                      <>
                        <ProductThumb src={s.imageUrl} className="size-10 shrink-0 rounded-md" />
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-[11px] font-semibold leading-tight text-[#f3e7d7]">{s.product}</div>
                          <div className="font-mono text-[10px] text-[#b8a58c]">{s.code}</div>
                        </div>
                      </>
                    ) : (
                      <div className="font-mono text-[10px] text-[#8c7a63]">{s?.code ?? "—"}</div>
                    )}
                    {target && picked && (
                      <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-bold text-white">
                        <CheckCircle2 className="size-3" aria-hidden /> Recogido
                      </span>
                    )}
                  </div>
                  {/* the slot's share of the WS2812B strip on the shelf front */}
                  <div className="flex h-2.5 gap-0.5 rounded-b-lg bg-[#111] px-1 py-0.5" aria-hidden>
                    {Array.from({ length: LEDS_PER_SLOT }, (_, i) => (
                      <span key={i} className={cn("flex-1 rounded-[2px]", on ? "led-px bg-[#22ff88]" : "bg-[#2a2f36]")} style={on ? { animationDelay: `${i * 60}ms` } : undefined} />
                    ))}
                  </div>
                </div>
              );
            }),
          )}
        </div>
      </div>

      <div className="mx-5 mb-5 rounded-2xl bg-[#0d1117] p-3 font-mono text-[11px] leading-relaxed text-[#c9d1d9]" aria-live="polite">
        <div className="mb-1 flex justify-between text-[#8b949e]">
          <span>Monitor serie del ESP32</span>
          <span>{px ? `Tira ${px.strip} · píxeles ${px.first}–${px.first + px.count - 1}` : ""}</span>
        </div>
        {lines.length === 0 ? (
          <div className="text-[#6e7681]">[MQTT] Suscrito a {MQTT.topic}/# · esperando órdenes…</div>
        ) : (
          lines.map((l) => (
            <div key={l.id} className="truncate">
              <span className={l.tone === "in" ? "text-[#d2a8ff]" : l.tone === "led" ? "text-[#3fb950]" : "text-[#f85149]"}>{l.text}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function Node({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <span className={cn("inline-flex min-w-0 shrink items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors", active ? "bg-success-bg text-success" : "bg-panel-2 text-muted")}>
      {icon}
      <span className="truncate">{label}</span>
    </span>
  );
}

function Wire({ active, delay }: { active: boolean; delay?: boolean }) {
  return (
    <span className="relative h-0.5 min-w-6 flex-1 rounded-full bg-border" aria-hidden>
      {active && <span className="mqtt-dot absolute -top-[3px] size-2 rounded-full bg-[#22ff88]" style={delay ? { animationDelay: "0.8s" } : undefined} />}
    </span>
  );
}
