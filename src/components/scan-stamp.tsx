"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { SCAN_EVENT, type ScanFeedback } from "@/lib/beep";
import { cn } from "@/lib/cn";

const time = () => new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

/** The postmark: every scan presses a round stamp in the corner — green when it matched, red when it did not. */
export function ScanStamp() {
  const [stamp, setStamp] = useState<(ScanFeedback & { key: number; at: string }) | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onScan(e: Event) {
      const detail = (e as CustomEvent<ScanFeedback>).detail;
      setStamp({ ...detail, key: Date.now(), at: time() });
      clearTimeout(timer);
      timer = setTimeout(() => setStamp(null), detail.ok ? 1100 : 1800);
    }
    window.addEventListener(SCAN_EVENT, onScan);
    return () => {
      window.removeEventListener(SCAN_EVENT, onScan);
      clearTimeout(timer);
    };
  }, []);

  if (!stamp) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 no-print" role="status" aria-live="polite">
      <div
        key={stamp.key}
        className={cn(
          "postmark stamp-in size-24 flex-col gap-1 bg-panel/90 text-[11px] uppercase backdrop-blur-sm",
          stamp.ok ? "text-success" : "text-danger",
        )}
      >
        {stamp.ok ? <Check className="size-7" strokeWidth={3} aria-hidden /> : <X className="size-7" strokeWidth={3} aria-hidden />}
        <span>{stamp.ok ? "Escaneado" : "Rechazado"}</span>
        <span className="text-[10px] opacity-80">{stamp.at}</span>
        <span className="sr-only">{stamp.message}</span>
      </div>
    </div>
  );
}
