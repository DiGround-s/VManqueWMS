import { Boxes } from "lucide-react";
import { cn } from "@/lib/cn";

/** VManque wordmark: a green rounded tile with the boxes glyph, then the name. */
export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold leading-none tracking-tight", compact ? "text-base" : "text-lg", className)}>
      <span className={cn("flex items-center justify-center rounded-xl bg-brand text-brand-ink", compact ? "size-8" : "size-9")} aria-hidden>
        <Boxes className={compact ? "size-[18px]" : "size-5"} />
      </span>
      <span>
        VManque<span className="font-normal text-muted"> WMS</span>
      </span>
    </span>
  );
}
