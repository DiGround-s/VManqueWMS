import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/labels";

const TONES: Record<Tone, string> = {
  neutral: "bg-panel-2 text-muted",
  accent: "bg-brand-soft text-success",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  warn: "bg-warn-bg text-warn",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-muted",
  accent: "bg-brand",
  success: "bg-success",
  danger: "bg-danger",
  info: "bg-info",
  warn: "bg-yellow",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", TONES[tone], className)}>
      <span className={cn("size-1.5 rounded-full", DOTS[tone])} aria-hidden />
      {children}
    </span>
  );
}

export function StatusBadge<K extends string>({ map, value }: { map: Record<K, { label: string; tone: Tone }>; value: K }) {
  const s = map[value];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
