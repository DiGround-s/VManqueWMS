import { cn } from "@/lib/cn";

/** Availability at a glance: green with stock, amber when it is out, red when it is over-committed. */
export function StockPill({ available, className }: { available: number; className?: string }) {
  const tone = available < 0 ? "bg-danger text-white" : available === 0 ? "bg-yellow text-[#3d2a00]" : "bg-panel/95 text-text";
  const label = available < 0 ? `Faltan ${-available}` : available === 0 ? "Sin stock" : `${available} disp.`;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-card", tone, className)}>
      {available > 0 && <span className="size-1.5 rounded-full bg-brand" aria-hidden />}
      {label}
    </span>
  );
}
