import type { SalesChannel } from "@prisma/client";

/**
 * Stores the WMS centralizes. Colors are the validated categorical slots (light / dark),
 * assigned in a fixed order so a store keeps its color on every chart.
 * Commission rates are demo estimates of each marketplace's fee, not official figures.
 */
export const CHANNELS: Record<SalesChannel, { label: string; short: string; color: string; dark: string; rate: number; refPrefix: string; initials: string }> = {
  PARIS: { label: "Paris", short: "Paris", color: "#2a78d6", dark: "#3987e5", rate: 0.12, refPrefix: "PAR", initials: "P" },
  DIRECT: { label: "Tienda propia", short: "Propia", color: "#eb6834", dark: "#d95926", rate: 0.03, refPrefix: "WEB", initials: "VM" },
  FALABELLA: { label: "Falabella", short: "Falabella", color: "#1baf7a", dark: "#199e70", rate: 0.14, refPrefix: "FAL", initials: "F" },
  MERCADOLIBRE: { label: "Mercado Libre", short: "M. Libre", color: "#eda100", dark: "#c98500", rate: 0.15, refPrefix: "MLC", initials: "ML" },
};

/** Fixed display order (= color slot order). */
export const CHANNEL_ORDER: SalesChannel[] = ["PARIS", "DIRECT", "FALABELLA", "MERCADOLIBRE"];

/** Theme-aware color (light/dark tokens in globals.css). */
export const channelVar = (c: SalesChannel) => `var(--ch-${c.toLowerCase()})`;

export const isChannel = (v: unknown): v is SalesChannel => typeof v === "string" && v in CHANNELS;

export const clp = (n: number) => n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

/** Compact CLP for axes and tiles: $1,2 M, $850 mil. */
export function clpShort(n: number) {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: a >= 10_000_000 ? 0 : 1 })} M`;
  if (a >= 1_000) return `$${Math.round(n / 1_000).toLocaleString("es-CL")} mil`;
  return `$${n}`;
}
