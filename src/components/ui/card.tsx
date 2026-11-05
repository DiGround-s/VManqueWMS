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
export function Stat({ label, value, tone, href, share }: { label: string; value: ReactNode; tone?: "danger" | "accent"; href?: string; share?: number }) {
  const body = (
    <div className={cn("flex h-full flex-col gap-2 p-4", href && "transition-colors hover:bg-panel-2")}>
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

/** A row of pigeonholes sharing one frame. */
export function Rack({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid divide-accent/25 overflow-hidden rounded-lg border-2 border-accent bg-panel max-md:divide-y-2 md:divide-x-2", className)}>
      {children}
    </div>
  );
}
