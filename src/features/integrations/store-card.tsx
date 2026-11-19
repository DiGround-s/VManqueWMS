"use client";

import { RefreshCw, Link2, Unlink } from "lucide-react";
import type { SalesChannel } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Mono } from "@/components/ui/table";
import { ChannelLogo } from "@/features/sales/channel-logo";
import { CHANNELS } from "@/lib/channels";
import { useAction } from "@/lib/use-action";
import { EventsTable, eventTime, type IntegrationEvent } from "./events-table";
import { connectStoreAction, disconnectStoreAction, syncStoreAction } from "./stores/actions";

type Store = {
  channel: SalesChannel;
  apiUrl: string;
  mode: "webhook" | "polling";
  documented: boolean;
  fields: { name: "id" | "secret"; label: string }[];
  how: string;
  account: { sellerId: string; connectedAt: Date; expiresAt: Date } | null;
  notifications: IntegrationEvent[];
};

/** Falabella, Walmart, Paris or Hites: credentials form, connection state, sync and the last events. */
export function StoreCard({ s }: { s: Store }) {
  const [pending, run] = useAction();
  const label = CHANNELS[s.channel].label;
  return (
    <Card className="p-5" id={`integracion-${s.channel.toLowerCase()}`}>
      <div className="flex flex-wrap items-center gap-4">
        <ChannelLogo channel={s.channel} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{label}</h2>
            {s.account ? <Badge tone="success">Conectada</Badge> : <Badge tone="neutral">Sin conectar</Badge>}
            <Badge tone="info">{s.mode === "webhook" ? "Webhook + consulta de respaldo" : "Consulta cada minuto"}</Badge>
            {!s.documented && <Badge tone="warn">API no pública: formato supuesto</Badge>}
          </div>
          <p className="text-sm text-muted">
            {s.account ? (
              <>
                Conectada como <b className="text-text">{s.account.sellerId}</b> desde {eventTime(s.account.connectedAt)}
              </>
            ) : (
              <>Credenciales: {s.how}.</>
            )}
          </p>
          <p className="text-xs text-muted">
            API <Mono>{s.apiUrl}</Mono>
          </p>
        </div>
        {s.account && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" pending={pending} onClick={() => run(() => syncStoreAction({ channel: s.channel }), { success: (d) => `${label}: ${d.checked} pedidos revisados · ${d.created} nuevos` })}>
              <RefreshCw className="size-4" /> Sincronizar ahora
            </Button>
            <Button size="sm" variant="danger" pending={pending} onClick={() => run(() => disconnectStoreAction({ channel: s.channel }), { success: `${label} desconectada` })}>
              <Unlink className="size-4" /> Desconectar
            </Button>
          </div>
        )}
      </div>

      {!s.account && (
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          action={(f) => run(() => connectStoreAction({ channel: s.channel, id: String(f.get("id")), secret: String(f.get("secret")) }), { success: `${label} conectada` })}
        >
          {s.fields.map((f) => (
            <Field key={f.name} label={f.label}>
              <Input name={f.name} type={f.name === "secret" ? "password" : "text"} autoComplete="off" required />
            </Field>
          ))}
          <Button type="submit" variant="primary" pending={pending}>
            <Link2 className="size-4" /> Conectar
          </Button>
        </form>
      )}

      {s.account && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold">Últimos eventos</h3>
          <EventsTable events={s.notifications} empty={s.mode === "webhook" ? "Todavía no llegan avisos." : "La consulta automática aún no trae pedidos."} />
        </div>
      )}
    </Card>
  );
}
