"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

/**
 * Shrinks the office side menu to icons and back. The choice lives in a cookie so the server
 * renders the same width on the next visit (no jump on load).
 */
export function RailToggle({ initial }: { initial: boolean }) {
  const [min, setMin] = useState(initial);
  function toggle() {
    const next = !min;
    setMin(next);
    document.getElementById("app-shell")?.setAttribute("data-rail", next ? "min" : "full");
    document.cookie = `rail=${next ? "min" : "full"}; path=/; max-age=31536000; samesite=lax`;
  }
  const label = min ? "Expandir el menú" : "Minimizar el menú";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-expanded={!min}
      title={label}
      className="hidden size-9 shrink-0 items-center justify-center rounded-full text-rail-muted transition-colors hover:bg-rail-2 hover:text-rail-ink lg:flex"
    >
      {min ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
    </button>
  );
}
