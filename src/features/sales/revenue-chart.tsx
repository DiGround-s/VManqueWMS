"use client";

import { useState } from "react";
import { CHANNEL_ORDER, CHANNELS, channelVar, clp, clpShort } from "@/lib/channels";
import type { Bucket } from "./service";

const H = 220; // plot height in px

/** Nice round step for 3–4 gridlines. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}

/**
 * Stacked bars of revenue per store. Hover (or focus) a column for the breakdown.
 * The last bucket is the current, still-running period and is drawn hatched-light.
 */
export function RevenueChart({ buckets, labelEvery = 1, title }: { buckets: Bucket[]; labelEvery?: number; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = buckets.map((b) => CHANNEL_ORDER.reduce((n, c) => n + b.values[c], 0));
  const max = niceMax(Math.max(...totals) * 1.05);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const active = hover ?? null;

  return (
    <figure className="relative" aria-label={title}>
      <div className="flex" style={{ height: H + 24 }}>
        {/* y axis */}
        <div className="relative w-14 shrink-0 text-[11px] tabular-nums text-muted" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2" style={{ top: H - (t / max) * H }}>
              {clpShort(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-border/70" style={{ top: H - (t / max) * H }} aria-hidden />
          ))}
          <div className="absolute inset-x-0 top-0 flex items-end gap-[2px]" style={{ height: H }} onMouseLeave={() => setHover(null)}>
            {buckets.map((b, i) => {
              const segs = CHANNEL_ORDER.filter((c) => b.values[c] > 0);
              const current = i === buckets.length - 1;
              return (
                <button
                  key={b.key}
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${b.long}: ${clp(totals[i])}`}
                  className="group relative flex h-full min-w-0 flex-1 flex-col justify-end focus:outline-none"
                >
                  <span className={`absolute inset-0 rounded-md transition-colors ${active === i ? "bg-panel-2" : ""}`} aria-hidden />
                  <span className="relative mx-auto flex w-full max-w-7 flex-col-reverse gap-[2px]" style={{ height: `${(totals[i] / max) * 100}%`, opacity: active != null && active !== i ? 0.45 : current ? 0.8 : 1 }}>
                    {segs.map((c, k) => (
                      <span
                        key={c}
                        className={k === segs.length - 1 ? "rounded-t-[4px]" : ""}
                        style={{ flexGrow: b.values[c], flexBasis: 0, minHeight: 1, background: channelVar(c) }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          {/* x labels */}
          <div className="absolute inset-x-0 flex gap-[2px] text-[11px] text-muted" style={{ top: H + 6 }} aria-hidden>
            {buckets.map((b, i) => (
              <span key={b.key} className="min-w-0 flex-1 text-center">
                {i % labelEvery === 0 || i === buckets.length - 1 ? b.label : ""}
              </span>
            ))}
          </div>
          {active != null && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-56 rounded-2xl bg-panel p-3 text-sm shadow-lift ring-1 ring-border"
              style={active > buckets.length / 2 ? { right: `${((buckets.length - active) / buckets.length) * 100}%` } : { left: `${((active + 1) / buckets.length) * 100}%` }}
            >
              <div className="mb-1.5 font-semibold first-letter:uppercase">{buckets[active].long}</div>
              {CHANNEL_ORDER.map((c) => (
                <div key={c} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="size-2.5 rounded-sm" style={{ background: channelVar(c) }} />
                    {CHANNELS[c].label}
                  </span>
                  <span className="tabular-nums">{clp(buckets[active].values[c])}</span>
                </div>
              ))}
              <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-semibold">
                <span>Total · {buckets[active].orders} pedidos</span>
                <span className="tabular-nums">{clpShort(totals[active])}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}

export function ChannelLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {CHANNEL_ORDER.map((c) => (
        <li key={c} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: channelVar(c) }} aria-hidden />
          {CHANNELS[c].label}
        </li>
      ))}
    </ul>
  );
}
