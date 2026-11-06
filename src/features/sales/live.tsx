"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Radio, Zap } from "lucide-react";
import type { SalesChannel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";
import { CHANNEL_ORDER, CHANNELS, channelVar } from "@/lib/channels";
import { simulateIncomingOrderAction } from "./actions";

/** Re-fetches the page data every few seconds so new marketplace orders show up on their own. */
export function LiveRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      En vivo · cada {seconds} s
    </span>
  );
}

/** Pretends a store sent us an order through its webhook. */
export function SimulateOrder() {
  const router = useRouter();
  const [pending, run] = useAction();
  const [open, setOpen] = useState(false);
  const go = (channel?: SalesChannel) => {
    setOpen(false);
    run(() => simulateIncomingOrderAction({ channel }), { success: (d) => `Nuevo pedido de ${d.store} · ${d.ref} → ${d.code}`, onOk: () => router.refresh() });
  };
  return (
    <div className="relative">
      <div className="flex">
        <Button variant="primary" pending={pending} onClick={() => go()} className="rounded-r-none pr-3">
          <Zap className="size-4" /> Simular pedido entrante
        </Button>
        <Button variant="primary" onClick={() => setOpen((v) => !v)} aria-label="Elegir tienda" aria-expanded={open} className="rounded-l-none border-l border-white/20 px-2.5">
          <ChevronDown className="size-4" />
        </Button>
      </div>
      {open && (
        <ul className="absolute right-0 z-20 mt-2 w-56 rounded-2xl bg-panel p-1.5 shadow-lift ring-1 ring-border">
          {CHANNEL_ORDER.map((c) => (
            <li key={c}>
              <button type="button" onClick={() => go(c)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-panel-2">
                <span className="size-2.5 rounded-sm" style={{ background: channelVar(c) }} aria-hidden />
                Desde {CHANNELS[c].label}
              </button>
            </li>
          ))}
          <li className="mt-1 border-t border-border px-3 pb-1 pt-2 text-xs text-muted">
            <Radio className="mr-1 inline size-3" aria-hidden /> Usa el mismo flujo que el webhook real
          </li>
        </ul>
      )}
    </div>
  );
}
