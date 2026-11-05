import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/labels";

const TONES: Record<Tone, string> = {
  neutral: "bg-panel-2 text-muted border-border-strong/60",
  accent: "bg-accent-soft text-accent-strong border-accent/40",
  success: "bg-success-bg text-success border-success/40",
  danger: "bg-danger-bg text-danger border-danger/40",
  info: "bg-info-bg text-info border-info/40",
  warn: "bg-warn-bg text-warn border-warn/40",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-bold whitespace-nowrap", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge<K extends string>({ map, value }: { map: Record<K, { label: string; tone: Tone }>; value: K }) {
  const s = map[value];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
