import Link from "next/link";
import { AlarmClock, Inbox, MessagesSquare, PackageOpen, Search } from "lucide-react";
import type { CaseKind, CaseStatus } from "@prisma/client";
import { requirePageRole, hasRole } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductThumb } from "@/components/product-thumb";
import { CASE_KIND, CASE_STATUS, ORDER_STATUS, RETURN_STATUS } from "@/lib/labels";
import { CHANNEL_ORDER, CHANNELS, channelVar, clp, isChannel } from "@/lib/channels";
import { cn } from "@/lib/cn";
import { fmtDateTime, fmtTime } from "@/lib/format";
import { getConversation, inboxCounts, listConversations } from "@/features/inbox/service";
import { ChannelLogo } from "@/features/sales/channel-logo";
import { LiveRefresh } from "@/features/sales/live";
import { CaseStatusButton, MarkRead, ReplyBox, ReturnSteps, SimulateMessage } from "@/features/inbox/controls";

export const metadata = { title: "Atención al cliente" };
export const dynamic = "force-dynamic";

type SP = { c?: string; canal?: string; estado?: string; tipo?: string; q?: string };
const STATUS_TABS: [CaseStatus | "ALL", string][] = [["OPEN", "Por responder"], ["WAITING", "Esperando"], ["RESOLVED", "Resueltos"], ["ALL", "Todos"]];

function ago(d: Date) {
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "ahora";
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} d`;
}

function Due({ at }: { at: Date | null }) {
  if (!at) return null;
  const h = (new Date(at).getTime() - Date.now()) / 3_600_000;
  if (h < 0) return <span className="text-xs font-semibold text-danger">Fuera de plazo</span>;
  return <span className={cn("text-xs", h < 6 ? "font-semibold text-warn" : "text-muted")}>Responder en {h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${Math.round(h)} h`}</span>;
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePageRole();
  const sp = await searchParams;
  const channel = isChannel(sp.canal?.toUpperCase()) ? (sp.canal!.toUpperCase() as keyof typeof CHANNELS) : undefined;
  const status = (STATUS_TABS.find(([k]) => k.toLowerCase() === sp.estado)?.[0] ?? "OPEN") as CaseStatus | "ALL";
  const kind = sp.tipo && sp.tipo.toUpperCase() in CASE_KIND ? (sp.tipo.toUpperCase() as CaseKind) : undefined;
  const q = sp.q?.trim() || undefined;
  const [list, counts] = await Promise.all([listConversations({ channel, status, kind, q }), inboxCounts()]);
  const selectedId = sp.c ?? list[0]?.id;
  const conv = selectedId ? await getConversation(selectedId) : null;

  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const next = { canal: sp.canal, estado: sp.estado, tipo: sp.tipo, q: sp.q, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return `/atencion${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Atención al cliente"
        description="Preguntas, reclamos, cambios y devoluciones de Mercado Libre, Falabella, Paris y la tienda propia, en una sola bandeja."
        actions={
          <>
            <LiveRefresh seconds={8} />
            {hasRole(user, "SUPERVISOR") && <SimulateMessage />}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Por responder", value: counts.open, icon: <Inbox className="size-4" />, to: href({ estado: "open", c: undefined }) },
          { label: "Mensajes sin leer", value: counts.unread, icon: <MessagesSquare className="size-4" />, to: href({ estado: "open", c: undefined }) },
          { label: "Devoluciones en curso", value: counts.returns, icon: <PackageOpen className="size-4" />, to: href({ estado: "all", tipo: "return", c: undefined }) },
          { label: "Fuera de plazo", value: counts.overdue, icon: <AlarmClock className="size-4" />, to: href({ estado: "open", c: undefined }), danger: counts.overdue > 0 },
        ].map((k) => (
          <Link key={k.label} href={k.to} className="block rounded-2xl">
            <Card className="flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-lift">
              <div className="flex items-center justify-between gap-2">
                <span className="label">{k.label}</span>
                <span className={cn("flex size-8 items-center justify-center rounded-full", k.danger ? "bg-danger-bg text-danger" : "bg-brand-soft text-success")}>{k.icon}</span>
              </div>
              <span className={cn("text-3xl font-semibold leading-none tracking-tight tabular-nums", k.danger && "text-danger")}>{k.value}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)_300px]">
        {/* list */}
        <Card className="flex min-h-0 flex-col xl:h-[calc(100dvh-140px)] xl:sticky xl:top-20">
          <div className="space-y-3 p-4 pb-3">
            <form action="/atencion" className="relative">
              {sp.canal && <input type="hidden" name="canal" value={sp.canal} />}
              {sp.estado && <input type="hidden" name="estado" value={sp.estado} />}
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input name="q" defaultValue={sp.q} placeholder="Comprador, asunto o pedido" aria-label="Buscar conversaciones" className="h-10 w-full rounded-xl bg-panel-2 pl-9 pr-3 text-sm placeholder:text-muted/80 focus:bg-panel focus:outline-none focus:ring-2 focus:ring-brand" />
            </form>
            <div className="flex gap-1 rounded-full bg-panel-2 p-1 text-xs font-semibold">
              {STATUS_TABS.map(([k, label]) => (
                <Link key={k} href={href({ estado: k.toLowerCase(), c: undefined })} className={cn("flex-1 rounded-full px-2 py-1.5 text-center", status === k ? "bg-panel shadow-card" : "text-muted hover:text-text")}>
                  {label}
                  {k === "OPEN" && counts.open > 0 && <span className="ml-1 tabular-nums text-danger">{counts.open}</span>}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link href={href({ canal: undefined, c: undefined })} className={cn("h-7 rounded-full px-3 text-xs font-semibold leading-7", !channel ? "bg-accent text-accent-ink" : "bg-panel-2")}>Todas</Link>
              {counts.perChannel.map(({ channel: c, open }) => (
                <Link key={c} href={href({ canal: c.toLowerCase(), c: undefined })} className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold", channel === c ? "bg-accent text-accent-ink" : "bg-panel-2")}>
                  <span className="size-2 rounded-sm" style={{ background: channelVar(c) }} aria-hidden />
                  {CHANNELS[c].short}
                  {open > 0 && <span className="tabular-nums opacity-70">{open}</span>}
                </Link>
              ))}
            </div>
            {kind && (
              <Link href={href({ tipo: undefined, c: undefined })} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text">
                Tipo: <strong>{CASE_KIND[kind].label}</strong> · quitar filtro
              </Link>
            )}
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto border-t border-border/70">
            {list.length === 0 && <EmptyState title="Bandeja al día">No hay conversaciones con estos filtros.</EmptyState>}
            {list.map((c) => {
              const last = c.messages[0];
              return (
                <li key={c.id}>
                  <Link href={href({ c: c.id })} scroll={false} className={cn("flex gap-3 px-4 py-3 hover:bg-panel-2/60", c.id === selectedId && "bg-panel-2")}>
                    <ChannelLogo channel={c.channel} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{c.customerName}</span>
                        <span className="shrink-0 text-xs text-muted tabular-nums">{ago(c.lastMessageAt)}</span>
                      </div>
                      <div className="truncate text-[13px]">{c.subject}</div>
                      <div className="truncate text-xs text-muted">
                        {last?.author === "AGENT" ? "Tú: " : ""}
                        {last?.body}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge map={CASE_KIND} value={c.kind} />
                        {c.returnStatus && <span className="text-xs text-muted">{RETURN_STATUS[c.returnStatus].label}</span>}
                        {c.status === "OPEN" && <Due at={c.dueAt} />}
                      </div>
                    </div>
                    {c.unread > 0 && <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-ink">{c.unread}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* thread */}
        {conv ? (
          <>
            <Card className="flex min-h-[520px] flex-col xl:h-[calc(100dvh-140px)] xl:sticky xl:top-20">
              <MarkRead id={conv.id} unread={conv.unread} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-5 py-3.5">
                <ChannelLogo channel={conv.channel} size="md" />
                <div className="min-w-48 flex-1">
                  <div className="font-semibold leading-snug">{conv.subject}</div>
                  <div className="text-xs text-muted">
                    {conv.customerName} · {CHANNELS[conv.channel].label} · <span className="font-mono">{conv.externalRef}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge map={CASE_STATUS} value={conv.status} />
                  <CaseStatusButton id={conv.id} status={conv.status} />
                </div>
              </div>
              <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-label="Mensajes">
                {conv.messages.map((m) =>
                  m.author === "SYSTEM" ? (
                    <li key={m.id} className="flex justify-center">
                      <span className="rounded-full bg-panel-2 px-3 py-1 text-xs text-muted">
                        {m.body} · {fmtTime(m.createdAt)}
                      </span>
                    </li>
                  ) : (
                    <li key={m.id} className={cn("flex", m.author === "AGENT" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[78%] rounded-2xl px-4 py-2.5 text-sm", m.author === "AGENT" ? "rounded-br-md bg-accent text-accent-ink" : "rounded-bl-md bg-panel-2")}>
                        <p className="whitespace-pre-line">{m.body}</p>
                        <p className={cn("mt-1 text-[11px]", m.author === "AGENT" ? "opacity-70" : "text-muted")}>
                          {m.author === "AGENT" ? m.authorName ?? "Equipo" : conv.customerName.split(" ")[0]} · {fmtTime(m.createdAt)}
                        </p>
                      </div>
                    </li>
                  ),
                )}
              </ol>
              <ReplyBox id={conv.id} buyer={conv.customerName} />
            </Card>

            {/* context */}
            <div className="space-y-5">
              <Card className="p-4">
                <div className="label mb-3">Caso</div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-muted">Tipo</dt><dd><StatusBadge map={CASE_KIND} value={conv.kind} /></dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted">Abierto</dt><dd>{fmtDateTime(conv.createdAt)}</dd></div>
                  {conv.status !== "RESOLVED" && conv.dueAt && <div className="flex justify-between gap-2"><dt className="text-muted">Plazo de la tienda</dt><dd><Due at={conv.dueAt} /></dd></div>}
                </dl>
                {conv.returnStatus && (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="label mb-3">{conv.kind === "EXCHANGE" ? "Cambio" : "Devolución"}</div>
                    <ReturnSteps id={conv.id} value={conv.returnStatus} canEdit={hasRole(user, "SUPERVISOR")} />
                  </div>
                )}
              </Card>
              {conv.order ? (
                <Card className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="label">Pedido</span>
                    <StatusBadge map={ORDER_STATUS} value={conv.order.status} />
                  </div>
                  <Link href={`/pedidos/${conv.order.code}`} className="font-mono text-sm font-semibold hover:underline">{conv.order.code}</Link>
                  <div className="font-mono text-xs text-muted">{conv.order.externalRef}</div>
                  <ul className="my-3 space-y-2">
                    {conv.order.lines.map((l) => (
                      <li key={l.product.id} className="flex items-center gap-2.5">
                        <ProductThumb src={l.product.imageUrl} />
                        <span className="min-w-0 flex-1 truncate text-sm">{l.product.name}</span>
                        <span className="text-xs text-muted tabular-nums">×{l.qty}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between gap-2"><dt className="text-muted">Total</dt><dd className="font-semibold tabular-nums">{clp(conv.order.total)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted">Transporte</dt><dd>{conv.order.carrier ?? "—"}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted">Comuna</dt><dd>{conv.order.commune}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted">{conv.order.shippedAt ? "Despachado" : "Recibido"}</dt><dd>{fmtDateTime(conv.order.shippedAt ?? conv.order.createdAt)}</dd></div>
                  </dl>
                </Card>
              ) : (
                <Card className="p-4 text-sm text-muted">
                  <div className="label mb-2">Pedido</div>
                  Consulta previa a la compra: no hay un pedido asociado.
                </Card>
              )}
              <Card className="p-4">
                <div className="label mb-3">Abiertos por tienda</div>
                <ul className="space-y-2">
                  {CHANNEL_ORDER.map((c) => {
                    const open = counts.perChannel.find((x) => x.channel === c)?.open ?? 0;
                    return (
                      <li key={c} className="flex items-center gap-2.5 text-sm">
                        <ChannelLogo channel={c} size="sm" />
                        <span className="flex-1">{CHANNELS[c].label}</span>
                        <Badge tone={open ? "danger" : "neutral"}>{open}</Badge>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          </>
        ) : (
          <Card className="xl:col-span-2">
            <EmptyState title="Elige una conversación">Aquí verás el hilo con el comprador, el pedido asociado y el estado de la devolución.</EmptyState>
          </Card>
        )}
      </div>
    </>
  );
}
