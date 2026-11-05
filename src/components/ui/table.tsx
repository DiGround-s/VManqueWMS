import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...rest} />
    </div>
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("label border-b-[1.5px] border-border bg-panel-2 px-4 py-2.5 text-left whitespace-nowrap", className)} {...rest} />;
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-border/70 px-4 py-2.5 align-middle", className)} {...rest} />;
}

export function Tr({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-panel-2", className)} {...rest} />;
}

/** Monospace cell content for codes, SKUs, locations and quantities. */
export function Mono({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("font-mono whitespace-nowrap", className)} {...rest} />;
}
