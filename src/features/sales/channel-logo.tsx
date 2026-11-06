import type { SalesChannel } from "@prisma/client";
import { CHANNELS, channelVar } from "@/lib/channels";
import { cn } from "@/lib/cn";

// Light hues (aqua, yellow) carry dark ink; blue and orange carry white.
const DARK_INK: SalesChannel[] = ["FALABELLA", "MERCADOLIBRE"];

/** Store tile with its initials in the store's chart color (not the store's real logo). */
export function ChannelLogo({ channel, size = "md", className }: { channel: SalesChannel; size?: "sm" | "md" | "lg"; className?: string }) {
  const c = CHANNELS[channel];
  return (
    <span
      title={c.label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-bold tracking-tight",
        size === "sm" ? "size-7 rounded-lg text-[10px]" : size === "md" ? "size-10 rounded-xl text-xs" : "size-12 rounded-2xl text-sm",
        DARK_INK.includes(channel) ? "text-[#14181d]" : "text-white",
        className,
      )}
      style={{ background: channelVar(channel) }}
    >
      {c.initials}
    </span>
  );
}

export function ChannelTag({ channel }: { channel: SalesChannel }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span className="size-2.5 rounded-sm" style={{ background: channelVar(channel) }} aria-hidden />
      {CHANNELS[channel].label}
    </span>
  );
}
