"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, MessageCircle, Package, Pause, Play } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductThumb } from "@/components/product-thumb";
import { CHANNEL_ORDER, CHANNELS, channelVar, clp, clpShort } from "@/lib/channels";
import { ORDER_STATUS } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { fmtNum, fmtTime } from "@/lib/format";
import { ChannelLogo } from "./channel-logo";
import { liveSnapshotAction, simulateIncomingOrderAction } from "./actions";
import { simulateIncomingMessageAction } from "@/features/inbox/actions";
import type { LiveSnapshot } from "./live-service";

const POLL_MS = 4000;
const FLOW: OrderStatus[] = ["PENDING", "IN_WAVE", "PICKED", "SORTED", "PACKED"];

function since(iso: string, now: string) {
  const s = Math.max(0, Math.round((+new Date(now) - +new Date(iso)) / 1000));
  if (s < 45) return "recién";
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

function Delta({ now, before }: { now: number; before: number }) {
  if (!before) return <span className="text-xs text-muted">sin datos de ayer</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold", up ? "bg-success-bg text-success" : "bg-danger-bg text-danger")}>
        <Icon className="size-3.5" aria-hidden />
        {up ? "+" : ""}
        {pct}%
      </span>
      vs ayer a esta hora
    </span>
  );
}

function Kpi({ label, value, children, href }: { label: string; value: string; children?: React.ReactNode; href?: string }) {
  const body = (
    <Card className={cn("flex h-full flex-col gap-2 p-4", href && "transition-shadow hover:shadow-lift")}>
      <span className="label">{label}</span>
      <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
      <div className="mt-auto">{children}</div>
    </Card>
  );
  return href ? <Link href={href} className="block h-full rounded-2xl">{body}</Link> : body;
}

/** Cumulative revenue by hour: today (solid, up to now) against yesterday (dashed). Hover for the hour. */
function HourChart({ today, yesterday, hourNow }: { today: number[]; yesterday: number[]; hourNow: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 200;
  const max = Math.max(1, ...today, ...yesterday) * 1.08;
  const x = (h: number) => (h / 23) * 100;
  const y = (v: number) => H - (v / max) * H;
  const line = (xs: number[]) => xs.map((v, h) => `${h ? "L" : "M"}${x(h)},${y(v)}`).join(" ");
  const area = today.length ? `${line(today)} L${x(today.length - 1)},${H} L0,${H} Z` : "";
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const at = hover ?? null;
  return (
    <figure className="relative" aria-label="Ventas acumuladas por hora, hoy y ayer">
      <div className="flex">
        <div className="relative w-14 shrink-0 text-[11px] tabular-nums text-muted" style={{ height: H }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 -translate-y-1/2" style={{ top: y(t) }}>{clpShort(t)}</span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height: H }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-border/70" style={{ top: y(t) }} aria-hidden />
          ))}
          <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="live-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--brand)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={line(yesterday)} fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
            {area && <path d={area} fill="url(#live-area)" />}
            {today.length > 0 && <path d={line(today)} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
            {at != null && <line x1={x(at)} x2={x(at)} y1="0" y2={H} stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
          </svg>
          {today.length > 0 && (
            <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-panel" style={{ left: `${x(today.length - 1)}%`, top: y(today.at(-1)!) }} aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-50" />
            </span>
          )}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 24 }, (_, h) => (
              <button key={h} type="button" className="h-full flex-1 focus:outline-none" onMouseEnter={() => setHover(h)} onFocus={() => setHover(h)} onBlur={() => setHover(null)} aria-label={`${h}:00 · hoy ${h <= hourNow ? clp(today[h] ?? 0) : "—"} · ayer ${clp(yesterday[h] ?? 0)}`} />
            ))}
          </div>
          {at != null && (
            <div className="pointer-events-none absolute top-1 z-10 w-48 rounded-2xl bg-panel p-3 text-sm shadow-lift ring-1 ring-border" style={at > 12 ? { right: `${100 - x(at) + 2}%` } : { left: `${x(at) + 2}%` }}>
              <div className="mb-1 font-semibold">Hasta las {String(at).padStart(2, "0")}:59</div>
              <div className="flex justify-between gap-2"><span className="flex items-center gap-1.5 text-muted"><span className="h-0.5 w-3 rounded bg-brand" />Hoy</span><span className="tabular-nums">{at <= hourNow ? clp(today[at] ?? 0) : "—"}</span></div>
              <div className="flex justify-between gap-2"><span className="flex items-center gap-1.5 text-muted"><span className="h-0.5 w-3 rounded bg-muted" />Ayer</span><span className="tabular-nums">{clp(yesterday[at] ?? 0)}</span></div>
            </div>
          )}
        </div>
      </div>
      <div className="ml-14 mt-1.5 flex justify-between text-[11px] text-muted tabular-nums" aria-hidden>
        {[0, 4, 8, 12, 16, 20, 23].map((h) => <span key={h}>{String(h).padStart(2, "0")}:00</span>)}
      </div>
    </figure>
  );
}

/** Orders per minute over the last hour, stacked by store. */
function MinuteBars({ data }: { data: LiveSnapshot["perMinute"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((m) => CHANNEL_ORDER.reduce((s, c) => s + m[c], 0));
  const max = Math.max(2, ...totals);
  const H = 96;
  return (
    <figure className="relative" aria-label="Pedidos por minuto, última hora">
      <div className="flex items-end gap-[2px]" style={{ height: H }} onMouseLeave={() => setHover(null)}>
        {data.map((m, i) => {
          const segs = CHANNEL_ORDER.filter((c) => m[c] > 0);
          return (
            <button key={i} type="button" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`hace ${59 - i} min: ${totals[i]} pedidos`} className="relative flex h-full min-w-0 flex-1 flex-col justify-end focus:outline-none">
              <span className={cn("absolute inset-0 rounded-sm", hover === i && "bg-panel-2")} aria-hidden />
              {totals[i] === 0 ? (
                <span className="relative h-[2px] w-full rounded-full bg-border" />
              ) : (
                <span className="relative flex w-full flex-col-reverse gap-[2px]" style={{ height: `${(totals[i] / max) * 100}%` }}>
                  {segs.map((c, k) => (
                    <span key={c} className={k === segs.length - 1 ? "rounded-t-[3px]" : ""} style={{ flexGrow: m[c], flexBasis: 0, minHeight: 2, background: channelVar(c) }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted" aria-hidden>
        <span>hace 60 min</span>
        <span>hace 30 min</span>
        <span>ahora</span>
      </div>
      {hover != null && totals[hover] > 0 && (
        <div className="pointer-events-none absolute bottom-full z-10 mb-1 w-44 rounded-2xl bg-panel p-3 text-sm shadow-lift ring-1 ring-border" style={hover > 30 ? { right: `${((59 - hover) / 60) * 100}%` } : { left: `${(hover / 60) * 100}%` }}>
          <div className="mb-1 font-semibold">{hover === 59 ? "Este minuto" : `Hace ${59 - hover} min`}</div>
          {CHANNEL_ORDER.filter((c) => data[hover][c]).map((c) => (
            <div key={c} className="flex justify-between gap-2"><span className="flex items-center gap-1.5 text-muted"><span className="size-2.5 rounded-sm" style={{ background: channelVar(c) }} />{CHANNELS[c].label}</span><span className="tabular-nums">{data[hover][c]}</span></div>
          ))}
        </div>
      )}
    </figure>
  );
}

export function LiveBoard({ initial, canSimulate }: { initial: LiveSnapshot; canSimulate: boolean }) {
  const [snap, setSnap] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [traffic, setTraffic] = useState(false);
  const [lastSync, setLastSync] = useState(initial.now);
  const seen = useRef(new Set([...initial.recent.map((o) => o.id), ...initial.activity.map((a) => a.id)]));

  const pull = useCallback(async () => {
    const r = await liveSnapshotAction({});
    if (!r.ok) return;
    const d = r.data;
    const ids = [...d.recent.map((o) => o.id), ...d.activity.map((a) => a.id)];
    const added = ids.filter((id) => !seen.current.has(id));
    added.forEach((id) => seen.current.add(id));
    if (added.length) setFresh(new Set(added));
    setSnap(d);
    setLastSync(d.now);
  }, []);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && pull(), POLL_MS);
    return () => clearInterval(t);
  }, [pull]);

  // Demo traffic: an order from a random store every 5–9 s, and now and then a buyer message.
  useEffect(() => {
    if (!traffic) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stop) return;
      if (Math.random() < 0.25) await simulateIncomingMessageAction({});
      else await simulateIncomingOrderAction({});
      await pull();
      timer = setTimeout(tick, 5000 + Math.random() * 4000);
    };
    timer = setTimeout(tick, 600);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [traffic, pull]);

  const totalToday = snap.channels.reduce((s, c) => s + c.total, 0) || 1;
  const inFlow = FLOW.reduce((s, k) => s + (snap.pipeline[k] ?? 0), 0);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          En vivo · sincronizado {fmtTime(lastSync)}
        </span>
        <span className="text-xs text-muted">Se actualiza cada {POLL_MS / 1000} s</span>
        {canSimulate && (
          <Button variant={traffic ? "secondary" : "primary"} size="sm" className="ml-auto" onClick={() => setTraffic((v) => !v)} aria-pressed={traffic}>
            {traffic ? <Pause className="size-4" /> : <Play className="size-4" />}
            {traffic ? "Detener tráfico simulado" : "Simular tráfico de tiendas"}
          </Button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
        <Kpi label="Ventas de hoy" value={clp(snap.today.total)}><Delta now={snap.today.total} before={snap.today.ySameTime} /></Kpi>
        <Kpi label="Pedidos de hoy" value={fmtNum(snap.today.orders)}><Delta now={snap.today.orders} before={snap.today.yOrdersSame} /></Kpi>
        <Kpi label="Última hora" value={`${fmtNum(snap.lastHour)} pedidos`}><span className="text-xs text-muted">Ticket promedio hoy {clp(snap.today.avg)}</span></Kpi>
        <Kpi label="En bodega ahora" value={fmtNum(inFlow)} href="/pedidos"><span className="text-xs text-muted">{snap.pipeline.PENDING ?? 0} esperan ola</span></Kpi>
        <Kpi label="Mensajes por responder" value={fmtNum(snap.unanswered)} href="/atencion"><span className="text-xs text-muted">Preguntas, reclamos y devoluciones</span></Kpi>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Ventas por hora · acumulado</h2>
            <ul className="flex gap-4 text-sm text-muted">
              <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-brand" aria-hidden />Hoy</li>
              <li className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-muted" aria-hidden />Ayer</li>
            </ul>
          </div>
          <HourChart today={snap.todayCum} yesterday={snap.yesterdayCum} hourNow={snap.hourNow} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold">Ventas por tienda · hoy</h2>
          <ul className="space-y-3.5">
            {[...snap.channels].sort((a, b) => b.total - a.total).map((c) => (
              <li key={c.channel} className="flex items-center gap-3">
                <ChannelLogo channel={c.channel} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{CHANNELS[c.channel].label}</span>
                    <span className="tabular-nums text-muted">{clpShort(c.total)} · {c.orders}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-panel-2" aria-hidden>
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(c.total / totalToday) * 100}%`, background: channelVar(c.channel) }} />
                  </div>
                </div>
                <span className="w-10 text-right text-sm font-semibold tabular-nums">{Math.round((c.total / totalToday) * 100)}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold">Pedidos por minuto</span>
              <span className="text-xs text-muted">última hora</span>
            </div>
            <MinuteBars data={snap.perMinute} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Pedidos entrando" action={<Link href="/ventas#entrantes" className="text-sm text-muted hover:text-text">Ver todos</Link>} />
          <ul className="divide-y divide-border/70 pb-1">
            {snap.recent.map((o) => (
              <li key={o.id} className={cn(fresh.has(o.id) && "row-new")}>
                <Link href={`/pedidos/${o.code}`} className="flex items-center gap-3 px-5 py-3 hover:bg-panel-2/60">
                  <ChannelLogo channel={o.channel} size="md" />
                  <ProductThumb src={o.lines[0]?.product.imageUrl ?? null} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {o.lines[0]?.product.name ?? "Pedido"}
                      {o._count.lines > 1 && <span className="text-muted"> +{o._count.lines - 1}</span>}
                    </div>
                    <div className="truncate text-xs text-muted">
                      <span className="font-mono">{o.code}</span> · {o.customerName} · {o.commune}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{clp(o.total)}</div>
                    <div className="text-xs text-muted">{since(o.createdAt, snap.now)}</div>
                  </div>
                  <StatusBadge map={ORDER_STATUS} value={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-base font-semibold">Flujo en bodega</h2>
            <ol className="grid grid-cols-5 gap-1.5">
              {FLOW.map((k) => (
                <li key={k} className="rounded-xl bg-panel-2 px-2 py-2.5 text-center">
                  <div className="text-xl font-semibold tabular-nums">{snap.pipeline[k] ?? 0}</div>
                  <div className="truncate text-[11px] text-muted">{ORDER_STATUS[k].label}</div>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader title="Actividad" />
            <ul className="space-y-0.5 px-2 pb-3">
              {snap.activity.map((a) => (
                <li key={a.id} className={cn("rounded-xl", fresh.has(a.id) && "row-new")}>
                  <Link href={a.href} className="flex gap-3 rounded-xl px-3 py-2 hover:bg-panel-2/60">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-panel-2 text-muted">
                      {a.kind === "message" ? <MessageCircle className="size-4" aria-hidden /> : <Package className="size-4" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {CHANNELS[a.channel].label} · {a.kind === "order" ? <span className="font-mono">{a.detail}</span> : a.detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{since(a.at, snap.now)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
