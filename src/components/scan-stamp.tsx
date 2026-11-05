"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { SCAN_EVENT, type ScanFeedback } from "@/lib/beep";
import { cn } from "@/lib/cn";

/** Scan confirmation: a pill pops up near the bottom — green check when it matched, red cross when it did not. */
export function ScanStamp() {
  const [stamp, setStamp] = useState<(ScanFeedback & { key: number }) | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onScan(e: Event) {
      const detail = (e as CustomEvent<ScanFeedback>).detail;
      setStamp({ ...detail, key: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setStamp(null), detail.ok ? 1200 : 1800);
    }
    window.addEventListener(SCAN_EVENT, onScan);
    return () => {
      window.removeEventListener(SCAN_EVENT, onScan);
      clearTimeout(timer);
    };
  }, []);

  if (!stamp) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 no-print lg:bottom-8" role="status" aria-live="polite">
      <div key={stamp.key} className="pop-in flex items-center gap-2.5 rounded-full bg-accent py-2 pl-2 pr-4 text-sm font-semibold text-accent-ink shadow-lift">
        <span className={cn("flex size-7 items-center justify-center rounded-full", stamp.ok ? "bg-brand text-brand-ink" : "bg-danger text-white")}>
          {stamp.ok ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <X className="size-4" strokeWidth={3} aria-hidden />}
        </span>
        {stamp.ok ? "Escaneado" : (stamp.message ?? "Código rechazado")}
      </div>
    </div>
  );
}
