"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronDown, MessageSquarePlus, RotateCcw, Send } from "lucide-react";
import type { CaseStatus, ReturnStatus, SalesChannel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { CHANNEL_ORDER, CHANNELS, channelVar } from "@/lib/channels";
import { RETURN_FLOW, RETURN_STATUS } from "@/lib/labels";
import { markReadAction, replyAction, setCaseStatusAction, setReturnStatusAction, simulateIncomingMessageAction } from "./actions";

const QUICK = [
  ["Saludo", "Hola {n}, gracias por escribirnos. Ya estamos revisando tu caso con bodega y te respondemos a la brevedad."],
  ["Seguimiento", "Hola {n}, tu pedido ya salió de bodega. Puedes ver el seguimiento en la plataforma; normalmente llega en 24 a 72 horas hábiles."],
  ["Aprobar devolución", "Hola {n}, aprobamos tu devolución. Te enviamos una etiqueta de despacho; tienes 10 días para dejar el producto en una sucursal. Al llegar a bodega emitimos el reembolso."],
  ["Pedir fotos", "Hola {n}, lamentamos lo ocurrido. ¿Nos puedes enviar fotos del producto y del embalaje por la plataforma para gestionar el reclamo?"],
] as const;

/** After acting on a thread, keep it open even if it no longer matches the list filter. */
function useStay(id: string) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return () => {
    const p = new URLSearchParams(params.toString());
    if (p.get("c") === id) return router.refresh();
    p.set("c", id);
    router.replace(`${path}?${p}`, { scroll: false });
  };
}

export function MarkRead({ id, unread }: { id: string; unread: number }) {
  const router = useRouter();
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (!unread || sent.current === id) return;
    sent.current = id;
    markReadAction({ id }).then((r) => r.ok && r.data.changed && router.refresh());
  }, [id, unread, router]);
  return null;
}

export function ReplyBox({ id, buyer }: { id: string; buyer: string }) {
  const stay = useStay(id);
  const [pending, run] = useAction();
  const [text, setText] = useState("");
  const first = buyer.split(" ")[0];
  const send = () => run(() => replyAction({ id, body: text }), { success: "Respuesta enviada a la tienda", onOk: () => { setText(""); stay(); } });
  return (
    <div className="border-t border-border p-4">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {QUICK.map(([label, body]) => (
          <button key={label} type="button" onClick={() => setText(body.replace("{n}", first))} className="h-7 rounded-full bg-panel-2 px-3 text-xs font-medium hover:bg-border/60">
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) send();
          }}
          placeholder={`Responder a ${first}…`}
          aria-label="Respuesta"
          className="max-h-40 flex-1"
          rows={2}
        />
        <Button variant="primary" pending={pending} disabled={!text.trim()} onClick={send} aria-label="Enviar respuesta">
          <Send className="size-4" /> Enviar
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted">Ctrl + Enter para enviar. La respuesta sale por la API de mensajería de la tienda.</p>
    </div>
  );
}

export function CaseStatusButton({ id, status }: { id: string; status: CaseStatus }) {
  const stay = useStay(id);
  const [pending, run] = useAction();
  const resolved = status === "RESOLVED";
  return (
    <Button
      variant={resolved ? "secondary" : "success"}
      size="sm"
      pending={pending}
      onClick={() => run(() => setCaseStatusAction({ id, status: resolved ? "OPEN" : "RESOLVED" }), { success: resolved ? "Caso reabierto" : "Caso resuelto", onOk: stay })}
    >
      {resolved ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
      {resolved ? "Reabrir" : "Marcar resuelto"}
    </Button>
  );
}

/** Return / exchange steps. Each click moves it forward and notifies the buyer through the store. */
export function ReturnSteps({ id, value, canEdit }: { id: string; value: ReturnStatus; canEdit: boolean }) {
  const stay = useStay(id);
  const [pending, run] = useAction();
  const rejected = value === "REJECTED";
  const at = RETURN_FLOW.indexOf(value);
  const next = !rejected && at < RETURN_FLOW.length - 1 ? RETURN_FLOW[at + 1] : null;
  const move = (step: Exclude<ReturnStatus, "REQUESTED">) => run(() => setReturnStatusAction({ id, step }), { success: `Devolución: ${RETURN_STATUS[step].label.toLowerCase()}`, onOk: stay });
  return (
    <div>
      <ol className="space-y-2.5">
        {RETURN_FLOW.map((s, i) => {
          const reached = !rejected && i <= at;
          return (
            <li key={s} className="flex items-center gap-2.5 text-sm">
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${reached ? "bg-brand text-brand-ink" : "bg-panel-2 text-muted"}`}>{i + 1}</span>
              <span className={reached ? "font-medium" : "text-muted"}>{RETURN_STATUS[s].label}</span>
            </li>
          );
        })}
        {rejected && <li className="text-sm font-semibold text-danger">Devolución rechazada</li>}
      </ol>
      {canEdit && next && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" pending={pending} onClick={() => move(next as Exclude<ReturnStatus, "REQUESTED">)}>
            {next === "APPROVED" ? "Aprobar devolución" : next === "IN_TRANSIT" ? "Marcar en camino" : next === "RECEIVED" ? "Recibida en bodega" : "Emitir reembolso"}
          </Button>
          {value === "REQUESTED" && (
            <Button size="sm" variant="danger" disabled={pending} onClick={() => move("REJECTED")}>
              Rechazar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Pretends a store's messaging webhook delivered a buyer message. */
export function SimulateMessage() {
  const router = useRouter();
  const [pending, run] = useAction();
  const [open, setOpen] = useState(false);
  const go = (channel?: SalesChannel) => {
    setOpen(false);
    run(() => simulateIncomingMessageAction({ channel }), {
      success: (d) => `${d.isNew ? "Nuevo caso" : "Nuevo mensaje"} de ${d.who} · ${CHANNELS[d.channel].label}`,
      onOk: (d) => router.push(`/atencion?c=${d.id}`),
    });
  };
  return (
    <div className="relative">
      <div className="flex">
        <Button variant="primary" pending={pending} onClick={() => go()} className="rounded-r-none pr-3">
          <MessageSquarePlus className="size-4" /> Simular mensaje entrante
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
        </ul>
      )}
    </div>
  );
}
