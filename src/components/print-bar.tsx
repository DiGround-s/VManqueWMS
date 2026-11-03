"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/** Screen-only toolbar for print pages. `auto` opens the print dialog once fonts are ready. */
export function PrintBar({ title, auto }: { title: string; auto?: boolean }) {
  useEffect(() => {
    if (auto) void document.fonts.ready.then(() => window.print());
  }, [auto]);
  return (
    <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-panel px-4 py-2">
      <span className="font-semibold">{title}</span>
      <button type="button" onClick={() => window.print()} className="ml-auto inline-flex h-10 items-center gap-2 rounded-md border border-accent-strong bg-accent px-4 font-semibold uppercase tracking-wide text-accent-ink">
        <Printer className="size-4" /> Imprimir
      </button>
    </div>
  );
}
