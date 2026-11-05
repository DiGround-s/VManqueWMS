import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-panel shadow-card ring-1 ring-border/60", className)} {...rest} />;
}

export function CardHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 pb-2 pt-4", className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {action}
    </div>
  );
}

/** A KPI tile: label, big number, and a thin bar of its share when given. */
export function Stat({ label, value, tone, href, share, icon }: { label: string; value: ReactNode; tone?: "danger" | "accent"; href?: string; share?: number; icon?: ReactNode }) {
  const body = (
    <Card className={cn("flex h-full flex-col gap-3 p-4", href && "transition-shadow hover:shadow-lift")}>
      <div className="flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        {icon && <span className={cn("flex size-8 items-center justify-center rounded-full", tone === "danger" ? "bg-danger-bg text-danger" : "bg-brand-soft text-success")}>{icon}</span>}
      </div>
      <div className={cn("text-3xl font-semibold leading-none tracking-tight", tone === "danger" && "text-danger", tone === "accent" && "text-success")}>{value}</div>
      {share != null && (
        <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden>
          <div className={cn("h-full rounded-full", tone === "danger" ? "bg-danger" : "bg-brand")} style={{ width: `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%` }} />
        </div>
      )}
    </Card>
  );
  return href ? <a href={href} className="block h-full rounded-2xl">{body}</a> : body;
}

/** Slot capacity: the stock as a bar with ticks at the slot's minimum and maximum. */
export function CapacityMeter({ qty, min, max }: { qty: number; min: number | null; max: number | null }) {
  if (min == null && max == null) return <span className="text-muted">—</span>;
  const scale = Math.max(qty, max ?? 0, min ?? 0, 1);
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const low = min != null && qty < min;
  return (
    <span className="inline-flex items-center gap-2" title={`Mínimo ${min ?? "—"} · Máximo ${max ?? "—"}`}>
      <span className="relative h-2 w-28 rounded-full bg-panel-2" aria-hidden>
        <span className={cn("absolute inset-y-0 left-0 rounded-full", low ? "bg-danger" : "bg-brand")} style={{ width: pct(qty) }} />
        {min != null && <span className="absolute -inset-y-1 w-0.5 rounded-full bg-text/70" style={{ left: pct(min) }} />}
        {max != null && <span className="absolute -inset-y-1 w-0.5 rounded-full bg-text/30" style={{ left: `calc(${pct(max)} - 2px)` }} />}
      </span>
      <span className={cn("text-xs tabular-nums", low ? "font-semibold text-danger" : "text-muted")}>{min ?? "—"}–{max ?? "—"}</span>
    </span>
  );
}

/** A responsive grid of KPI tiles. */
export function Rack({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>{children}</div>;
}
