"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw, Link2, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mono } from "@/components/ui/table";
import { EventsTable, STATE_LABEL as STATE, eventTime as time } from "./events-table";
import { ChannelLogo } from "@/features/sales/channel-logo";
import { useAction } from "@/lib/use-action";
import { disconnectMlAction, syncMlAction } from "./actions";

type Status = {
  configured: boolean;
  apiUrl: string;
  clientId: string;
  account: { nickname: string; sellerId: string; expiresAt: Date; connectedAt: Date; updatedAt: Date } | null;
  notifications: { id: string; topic: string; resource: string; status: string; result: string | null; attempts: number; receivedAt: Date }[];
  counts: Record<string, number>;
};

const FLASH: Record<string, [string, "success" | "error"]> = {
  conectado: ["Mercado Libre conectado", "success"],
  "estado-invalido": ["La autorización no coincide con la solicitud (state). Inténtalo de nuevo.", "error"],
  error: ["Mercado Libre rechazó la autorización", "error"],
  "sin-config": ["Faltan ML_CLIENT_ID, ML_CLIENT_SECRET o ML_REDIRECT_URI en el servidor", "error"],
  permiso: ["Sólo un administrador puede conectar tiendas", "error"],
};

export function MercadoLibreCard({ s, flash }: { s: Status; flash?: string }) {
  const router = useRouter();
  const [pending, run] = useAction();
  useEffect(() => {
    const f = flash && FLASH[flash];
    if (f) toast[f[1]](f[0]);
    if (flash) router.replace("/ajustes");
  }, [flash, router]);
  // Live view while the page is open: new notifications appear without reloading.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <Card className="p-5" id="integracion-ml">
      <div className="flex flex-wrap items-center gap-4">
        <ChannelLogo channel="MERCADOLIBRE" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Mercado Libre</h2>
            {s.account ? <Badge tone="success">Conectado</Badge> : <Badge tone="neutral">Sin conectar</Badge>}
          </div>
          <p className="text-sm text-muted">
            {s.account ? (
              <>
                Cuenta <b className="text-text">{s.account.nickname}</b> (vendedor <Mono>{s.account.sellerId}</Mono>) · token renovado {time(s.account.updatedAt)}, vence {time(s.account.expiresAt)}
              </>
            ) : (
              "Recibe ventas, preguntas, mensajes post-venta y reclamos en tiempo real."
            )}
          </p>
          <p className="text-xs text-muted">
            API <Mono>{s.apiUrl}</Mono> · aplicación <Mono>{s.clientId || "—"}</Mono>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.account ? (
            <>
              <Button size="sm" pending={pending} onClick={() => run(() => syncMlAction({}), { success: (d) => `Revisadas ${d.checked} ventas · ${d.created} nuevas · ${d.retried} avisos reintentados` })}>
                <RefreshCw className="size-4" /> Sincronizar ahora
              </Button>
              <Button size="sm" variant="danger" pending={pending} onClick={() => run(() => disconnectMlAction({}), { success: "Mercado Libre desconectado" })}>
                <Unlink className="size-4" /> Desconectar
              </Button>
            </>
          ) : (
            <a href="/api/integraciones/mercadolibre/conectar" className={buttonClass("primary", "sm", !s.configured ? "pointer-events-none opacity-40" : "")} id="conectar-ml">
              <Link2 className="size-4" /> Conectar con Mercado Libre
            </a>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Últimos avisos recibidos</h3>
          <span className="text-xs text-muted">{Object.entries(STATE).map(([k, [l]]) => `${l}: ${s.counts[k] ?? 0}`).join(" · ")}</span>
        </div>
        <EventsTable events={s.notifications} empty="Todavía no llegan avisos de Mercado Libre." />
      </div>
    </Card>
  );
}
