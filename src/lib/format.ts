const dt = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" });
const d = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" });
const n = new Intl.NumberFormat("es-CL");

export const fmtDateTime = (v: Date | string | null | undefined) => (v ? dt.format(new Date(v)) : "—");
export const fmtDate = (v: Date | string | null | undefined) => (v ? d.format(new Date(v)) : "—");
export const fmtNum = (v: number) => n.format(v);

/** Start of "today" in Chile, as a UTC Date (server runs in any timezone). */
export function startOfTodayChile(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const offsetMin = -tzOffsetMinutes(now);
  return new Date(new Date(`${parts}T00:00:00Z`).getTime() + offsetMin * 60_000);
}

function tzOffsetMinutes(date: Date) {
  const local = new Date(date.toLocaleString("en-US", { timeZone: "America/Santiago" }));
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return (local.getTime() - utc.getTime()) / 60_000;
}
