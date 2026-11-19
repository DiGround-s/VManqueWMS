import { Badge } from "@/components/ui/badge";
import { Mono, Table, Td, Th, Tr } from "@/components/ui/table";
import type { Tone } from "@/lib/labels";

export type IntegrationEvent = { id: string; topic: string; resource: string; status: string; result: string | null; attempts: number; receivedAt: Date };

const TOPIC: Record<string, string> = {
  orders_v2: "Venta",
  questions: "Pregunta",
  messages: "Mensaje",
  claims: "Reclamo",
  onOrderCreated: "Venta (webhook)",
  onOrderItemsStatusChanged: "Cambio de estado",
  polling: "Venta (consulta)",
};
const STATE: Record<string, [string, Tone]> = { RECEIVED: ["En cola", "info"], PROCESSED: ["Procesado", "success"], IGNORED: ["Ignorado", "neutral"], ERROR: ["Error", "danger"] };
export const STATE_LABEL = STATE;
export const eventTime = (d: Date) => new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Log of what a store sent (webhooks) or what polling brought, with the connector's result. */
export function EventsTable({ events, empty }: { events: IntegrationEvent[]; empty: string }) {
  if (!events.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Recibido</Th>
          <Th>Tipo</Th>
          <Th>Recurso</Th>
          <Th>Intentos</Th>
          <Th>Estado</Th>
          <Th>Resultado</Th>
        </tr>
      </thead>
      <tbody>
        {events.map((n) => (
          <Tr key={n.id}>
            <Td className="whitespace-nowrap text-muted">{eventTime(n.receivedAt)}</Td>
            <Td>{TOPIC[n.topic] ?? n.topic}</Td>
            <Td>
              <Mono className="text-xs">{n.resource.length > 38 ? n.resource.slice(0, 38) + "…" : n.resource}</Mono>
            </Td>
            <Td>{n.attempts}</Td>
            <Td>
              <Badge tone={STATE[n.status]?.[1] ?? "neutral"}>{STATE[n.status]?.[0] ?? n.status}</Badge>
            </Td>
            <Td className="text-muted">{n.result}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
