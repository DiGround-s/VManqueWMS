import { cn } from "@/lib/cn";

/** VManque wordmark: the name with a small postmark ring as its dot. */
export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-black leading-none tracking-tight", compact ? "text-base" : "text-xl", className)}>
      <span className="postmark size-[1.35em] text-[0.45em] text-yellow" aria-hidden>VM</span>
      <span>
        VManque<span className="font-semibold opacity-70"> WMS</span>
      </span>
    </span>
  );
}
