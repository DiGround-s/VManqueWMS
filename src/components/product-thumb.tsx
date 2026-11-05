import { Package } from "lucide-react";
import { cn } from "@/lib/cn";

const SIZES = { sm: "size-11 rounded-md", md: "size-16 rounded-lg", lg: "size-28 rounded-xl" } as const;

/** Product picture, or an empty tile with a box icon when the product has none. */
export function ProductThumb({ src, size = "sm", className }: { src: string | null | undefined; size?: keyof typeof SIZES; className?: string }) {
  if (!src)
    return (
      <div className={cn("flex shrink-0 items-center justify-center border-2 border-dashed border-border text-muted", SIZES[size], className)} aria-hidden>
        <Package className={size === "lg" ? "size-9" : "size-5"} />
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element -- product URLs can be arbitrary external images
  return <img src={src} alt="" loading="lazy" className={cn("shrink-0 bg-panel-2 object-contain", SIZES[size], className)} />;
}
