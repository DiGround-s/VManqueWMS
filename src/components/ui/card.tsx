import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border-[1.5px] border-border bg-panel", className)} {...rest} />;
}

export function CardHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b-[1.5px] border-border px-4 py-3", className)}>
      <h2 className="text-[15px] font-extrabold">{title}</h2>
      {action}
    </div>
  );
}

/** One pigeonhole of a rack: a count, its label, and an exact-length bar of its share. */
export function Stat({ label, value, tone, href, share, stamp }: { label: string; value: ReactNode; tone?: "danger" | "accent"; href?: string; share?: number; stamp?: string }) {
  const body = (
    <div className={cn("relative flex h-full flex-col gap-2 p-4", href && "transition-colors hover:bg-panel-2")}>
      {stamp && (
        <span className="postmark absolute right-3 top-2.5 size-14 rotate-[-12deg] px-1 text-center text-[9px] uppercase leading-tight text-danger" aria-hidden>
          {stamp}
        </span>
      )}
      <div className="label">{label}</div>
      <div className={cn("text-4xl font-black leading-none tracking-tight", tone === "danger" && "text-danger", tone === "accent" && "text-accent-strong")}>{value}</div>
      {share != null && (
        <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-border/70" aria-hidden>
          <div className={cn("h-full rounded-full", tone === "danger" ? "bg-danger" : "bg-accent")} style={{ width: `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%` }} />
        </div>
      )}
    </div>
  );
  return href ? <a href={href} className="block h-full">{body}</a> : body;
}

/** Slot capacity: the stock as a bar with ticks at the slot's minimum and maximum. */
export function CapacityMeter({ qty, min, max }: { qty: number; min: number | null; max: number | null }) {
  if (min == null && max == null) return <span className="font-mono text-muted">—</span>;
  const scale = Math.max(qty, max ?? 0, min ?? 0, 1);
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const low = min != null && qty < min;
  return (
    <span className="inline-flex items-center gap-2" title={`Mínimo ${min ?? "—"} · Máximo ${max ?? "—"}`}>
      <span className="relative h-2.5 w-28 rounded-full bg-border/70" aria-hidden>
        <span className={cn("absolute inset-y-0 left-0 rounded-full", low ? "bg-danger" : "bg-accent")} style={{ width: pct(qty) }} />
        {min != null && <span className="absolute -inset-y-1 w-0.5 bg-text" style={{ left: pct(min) }} />}
        {max != null && <span className="absolute -inset-y-1 w-0.5 bg-text/50" style={{ left: `calc(${pct(max)} - 2px)` }} />}
      </span>
      <span className={cn("font-mono text-xs", low ? "font-bold text-danger" : "text-muted")}>{min ?? "—"}–{max ?? "—"}</span>
    </span>
  );
}

/** A row of pigeonholes sharing one frame. */
export function Rack({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid divide-accent/25 overflow-hidden rounded-lg border-2 border-accent bg-panel max-md:divide-y-2 md:divide-x-2", className)}>
      {children}
    </div>
  );
}
