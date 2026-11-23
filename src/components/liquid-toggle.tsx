"use client";

import { useEffect, useState } from "react";
import { Droplets } from "lucide-react";
import { cn } from "@/lib/cn";

const KEY = "liquid-glass";

/** Inline script for <head>: applies the saved mode before the first paint (no flash). */
export const LIQUID_BOOT = `try{if(localStorage.getItem("${KEY}")==="1")document.documentElement.classList.add("liquid")}catch(e){}`;

/** Turns Apple's Liquid Glass look on and off; the choice stays in this browser. */
export function LiquidToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(document.documentElement.classList.contains("liquid")), []);
  function toggle() {
    const next = !on;
    setOn(next);
    document.documentElement.classList.toggle("liquid", next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
  }
  const label = on ? "Desactivar Liquid Glass" : "Activar Liquid Glass";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-10 items-center justify-center rounded-full ring-1 ring-inset transition-[background-color,transform] duration-150 active:scale-95",
        on ? "bg-accent-soft text-accent ring-accent/40" : "bg-panel ring-border hover:bg-panel-2",
        className,
      )}
    >
      <Droplets className="size-4" />
    </button>
  );
}
