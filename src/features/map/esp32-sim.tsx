"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { MQTT, PIXELS_PER_STRIP, pixelsFor } from "./led-mapping";

type Line = { t: string; text: string; tone?: "in" | "led" | "sys" | "off" };

const stamp = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
};

/**
 * Simulated pick-to-light hardware: an ESP32 on the IoT VLAN, subscribed over MQTT, driving one
 * WS2812B strip per aisle. It shows what the real firmware (firmware/esp32-pick-to-light) does:
 * the same topics, payloads and pixel mapping, printed on a serial monitor like the Arduino IDE's.
 */
export function Esp32Sim({ rows, lit, enabled, onToggle, product }: { rows: string[]; lit: string[]; enabled: boolean; onToggle: () => void; product?: string }) {
  const boot = useRef(Date.now());
  const [lines, setLines] = useState<Line[]>([]);
  const [online, setOnline] = useState(false);
  const [rx, setRx] = useState(0);
  const [blink, setBlink] = useState(0);
  const prev = useRef<string[]>([]);
  const ready = useRef(false);
  const queue = useRef<string[] | null>(null);

  const log = (text: string, tone?: Line["tone"]) => setLines((l) => [...l, { t: stamp(Date.now() - boot.current), text, tone }].slice(-14));

  // Boot sequence: Wi-Fi association, DHCP, MQTT connect and subscribe.
  useEffect(() => {
    const steps: [number, string, Line["tone"]][] = [
      [0, "rst:0x1 (POWERON_RESET) · ESP32-D0WD · 240 MHz", "sys"],
      [250, `[WiFi] Conectando a SSID "VManque-IoT" (WPA2)…`, "sys"],
      [900, "[WiFi] Conectado · IP 192.168.30.40 · GW 192.168.30.1 · RSSI -58 dBm", "sys"],
      [1300, `[MQTT] Conectando a ${MQTT.broker}:${MQTT.port} como ${MQTT.clientId}…`, "sys"],
      [1700, `[MQTT] Conectado · suscrito a ${MQTT.topic}/# (QoS 1)`, "sys"],
      [1800, `[LED]  ${rows.length} tiras WS2812B · ${PIXELS_PER_STRIP} píxeles c/u · GPIO 5, 18, 19`, "sys"],
    ];
    const timers = steps.map(([ms, text, tone]) => setTimeout(() => log(text, tone), ms));
    timers.push(
      setTimeout(() => {
        setOnline(true);
        ready.current = true;
        if (queue.current) apply(queue.current);
      }, 1850),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once
  }, []);

  function apply(now: string[]) {
    const before = prev.current;
    const off = before.filter((c) => !now.includes(c));
    const on = now.filter((c) => !before.includes(c));
    prev.current = now;
    for (const c of off) {
      log(`[MQTT] ← ${MQTT.topic}/${c} {"on":0}`, "in");
      const px = pixelsFor(c);
      if (px) log(`[LED]  Tira ${px.strip} · píxeles ${px.first}–${px.first + px.count - 1} → apagado`, "off");
    }
    for (const c of on) {
      log(`[MQTT] ← ${MQTT.topic}/${c} {"on":1,"color":"green","blink":1}`, "in");
      const px = pixelsFor(c);
      if (px) log(`[LED]  Tira ${px.strip} · píxeles ${px.first}–${px.first + px.count - 1} → verde, parpadeo`, "led");
    }
    if (off.length || on.length) {
      setRx((n) => n + off.length + on.length);
      setBlink((n) => n + 1);
    }
  }

  const key = (enabled ? lit : []).join(",");
  useEffect(() => {
    const now = enabled ? lit : [];
    if (!ready.current) queue.current = now;
    else apply(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the list
  }, [key]);

  // Which pixels are on, per strip.
  const litPx = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const c of enabled ? lit : []) {
      const px = pixelsFor(c);
      if (!px) continue;
      const s = m.get(px.strip) ?? new Set<number>();
      for (let i = 0; i < px.count; i++) s.add(px.first + i);
      m.set(px.strip, s);
    }
    return m;
  }, [lit, enabled]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-10 items-center justify-center rounded-2xl", online ? "bg-brand text-brand-ink" : "bg-panel-2 text-muted")}>
            <Cpu className="size-5" aria-hidden />
          </span>
          <div>
            <div className="font-semibold">
              Pick-to-light · ESP32 <span className="ml-1 rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-semibold text-warn">simulado</span>
            </div>
            <div className="text-sm text-muted">
              {!enabled ? "LEDs apagados" : lit.length ? `Encendido en ${lit.length === 1 ? lit[0] : `${lit.length} ubicaciones`}${product ? ` · ${product}` : ""}` : "Busca un producto o toca una casilla"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", online ? "bg-success-bg text-success" : "bg-panel-2 text-muted")}>
            <Wifi className="size-3.5" aria-hidden /> {online ? "192.168.30.40 · MQTT conectado" : "Conectando…"}
          </span>
          <button type="button" onClick={onToggle} aria-pressed={enabled} className={cn("h-9 rounded-full px-4 text-xs font-semibold", enabled ? "bg-accent text-accent-ink" : "bg-panel-2 ring-1 ring-inset ring-border")}>
            {enabled ? "Apagar LEDs" : "Encender LEDs"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Board activity={blink} online={online} rx={rx} />
        <div className="min-w-0 space-y-3">
          <div className="space-y-2 rounded-2xl bg-[#0d1117] p-3">
            {rows.map((r) => {
              const on = litPx.get(r);
              return (
                <div key={r} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 font-mono text-[11px] text-[#8b949e]">{r}</span>
                  <div className="flex h-3 min-w-0 flex-1 gap-px rounded-sm bg-[#161b22] p-px" aria-label={`Tira ${r}`}>
                    {Array.from({ length: PIXELS_PER_STRIP }, (_, i) => (
                      <span key={i} className={cn("min-w-0 flex-1 rounded-[1px]", on?.has(i) ? "led-px bg-[#22ff88]" : "bg-[#2a2f36]")} />
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between pl-14 font-mono text-[10px] text-[#6e7681]">
              <span>píxel 0</span>
              <span>WS2812B · 5 V · 60 LED/m</span>
              <span>{PIXELS_PER_STRIP - 1}</span>
            </div>
          </div>
          <div className="h-48 overflow-hidden rounded-2xl bg-[#0d1117] p-3 font-mono text-[11px] leading-relaxed text-[#c9d1d9]" aria-live="polite">
            <div className="mb-1 flex justify-between text-[#8b949e]">
              <span>Monitor serie · 115200 baud</span>
              <span>{rx} mensajes</span>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="truncate">
                <span className="text-[#6e7681]">{l.t} </span>
                <span className={l.tone === "in" ? "text-[#d2a8ff]" : l.tone === "led" ? "text-[#3fb950]" : l.tone === "off" ? "text-[#f85149]" : "text-[#8b949e]"}>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** A drawn ESP32 DevKit: the blue LED on GPIO 2 flashes on every MQTT message. */
function Board({ activity, online, rx }: { activity: number; online: boolean; rx: number }) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!activity) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 350);
    return () => clearTimeout(t);
  }, [activity]);
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 120 220" className="h-56 w-auto" role="img" aria-label="Placa ESP32 DevKit">
        <rect x="10" y="6" width="100" height="208" rx="6" fill="#1f3b73" />
        {Array.from({ length: 15 }, (_, i) => (
          <g key={i}>
            <rect x="12" y={30 + i * 11.5} width="7" height="7" rx="1" fill="#d7b46a" />
            <rect x="101" y={30 + i * 11.5} width="7" height="7" rx="1" fill="#d7b46a" />
          </g>
        ))}
        <rect x="28" y="14" width="64" height="92" rx="3" fill="#c9ced6" />
        <rect x="32" y="40" width="56" height="62" rx="2" fill="#aab1bb" />
        <path d="M34 18 h8 v14 h6 v-14 h6 v14 h6 v-14 h6 v14 h6 v-14 h8" stroke="#8a919b" strokeWidth="2" fill="none" />
        <text x="60" y="66" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#3b4350">ESP-WROOM-32</text>
        <text x="60" y="78" textAnchor="middle" fontSize="6" fill="#4b5563">Wi-Fi · BT</text>
        <rect x="40" y="128" width="40" height="24" rx="2" fill="#111" />
        <text x="60" y="143" textAnchor="middle" fontSize="6" fill="#bbb">CP2102</text>
        <rect x="26" y="170" width="16" height="10" rx="2" fill="#e5e7eb" />
        <rect x="78" y="170" width="16" height="10" rx="2" fill="#e5e7eb" />
        <text x="34" y="190" textAnchor="middle" fontSize="5.5" fill="#cbd5e1">EN</text>
        <text x="86" y="190" textAnchor="middle" fontSize="5.5" fill="#cbd5e1">BOOT</text>
        <circle cx="38" cy="116" r="3.5" fill={online ? "#ff4d4d" : "#5a2020"} />
        <circle cx="82" cy="116" r="3.5" fill={flash ? "#4da3ff" : "#1c2e4a"} style={{ filter: flash ? "drop-shadow(0 0 4px #4da3ff)" : undefined }} />
        <rect x="48" y="200" width="24" height="12" rx="2" fill="#b8bec7" />
      </svg>
      <figcaption className="text-center text-xs text-muted">
        ESP32 DevKit V1 · VLAN 30 IoT
        <br />
        <span className="font-mono">{rx} msg recibidos</span>
      </figcaption>
    </figure>
  );
}
