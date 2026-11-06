import { Package } from "lucide-react";
import { cn } from "@/lib/cn";

const SIZES = { sm: "size-11 rounded-xl", md: "size-16 rounded-2xl", lg: "size-28 rounded-3xl" } as const;

/** Product picture, or a soft tile with a box icon when the product has none. */
export function ProductThumb({ src, size = "sm", className }: { src: string | null | undefined; size?: keyof typeof SIZES; className?: string }) {
  if (!src)
    return (
      <div className={cn("flex shrink-0 items-center justify-center bg-panel-2 text-muted", SIZES[size], className)} aria-hidden>
        <Package className={size === "lg" ? "size-9" : "size-5"} />
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element -- product URLs can be arbitrary external images
  // Catalog-style: the whole product on white, like a store listing.
  return <img src={src} alt="" loading="lazy" className={cn("shrink-0 bg-white object-contain outline outline-1 -outline-offset-1 outline-black/5", SIZES[size], className)} />;
}
