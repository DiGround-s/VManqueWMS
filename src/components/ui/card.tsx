import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border border-border bg-panel", className)} {...rest} />;
}

export function CardHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-border px-4 py-2.5", className)}>
      <h2 className="label !text-text">{title}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone, href }: { label: string; value: ReactNode; tone?: "danger" | "accent"; href?: string }) {
  const body = (
    <Card className={cn("p-4 h-full", href && "hover:border-border-strong")}>
      <div className="label">{label}</div>
      <div className={cn("mt-1 font-mono text-3xl font-semibold", tone === "danger" && "text-danger", tone === "accent" && "text-accent-strong")}>{value}</div>
    </Card>
  );
  return href ? <a href={href}>{body}</a> : body;
}
