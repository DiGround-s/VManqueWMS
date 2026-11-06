import type { SalesChannel } from "@prisma/client";
import { CHANNELS, channelVar } from "@/lib/channels";
import { cn } from "@/lib/cn";

// Light hues (aqua, yellow) carry dark ink; blue and orange carry white.
const DARK_INK: SalesChannel[] = ["FALABELLA", "MERCADOLIBRE"];

// Store logos (public/stores, see CREDITS.md). The own store keeps its initials tile.
const LOGO: Partial<Record<SalesChannel, string>> = { PARIS: "/stores/paris.png", FALABELLA: "/stores/falabella.png", MERCADOLIBRE: "/stores/mercadolibre.png" };
const BOX = { sm: "size-7 rounded-lg", md: "size-10 rounded-xl", lg: "size-12 rounded-2xl" } as const;

/** Store logo tile; the own store shows its initials in its chart color. */
export function ChannelLogo({ channel, size = "md", className }: { channel: SalesChannel; size?: "sm" | "md" | "lg"; className?: string }) {
  const c = CHANNELS[channel];
  const src = LOGO[channel];
  if (src)
    // eslint-disable-next-line @next/next/no-img-element -- tiny static logo
    return <img src={src} alt={c.label} title={c.label} className={cn("shrink-0 bg-white object-cover outline outline-1 -outline-offset-1 outline-black/10", BOX[size], className)} />;
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
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <ChannelLogo channel={channel} size="sm" className="size-6 rounded-md text-[9px]" />
      {CHANNELS[channel].label}
    </span>
  );
}
