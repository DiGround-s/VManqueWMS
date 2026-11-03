import { orderInput, type OrderInput } from "./schema";

export type ImportGroup = { ref: string; firstRow: number; order: OrderInput | null; errors: string[] };

/**
 * One row per order line, grouped by `ref`. Columns: ref, customer, address, commune, phone, carrier, sku, qty.
 * Header data is taken from the first row of each ref. Rows are numbered as in the spreadsheet (header = 1).
 */
export function groupOrderRows(rows: Record<string, string>[]): ImportGroup[] {
  const groups = new Map<string, { firstRow: number; head: Record<string, string>; lines: { sku: string; qty: string }[]; errors: string[] }>();
  rows.forEach((r, i) => {
    const rowNo = i + 2;
    const ref = r.ref ?? "";
    if (!ref) {
      if (Object.values(r).some(Boolean)) groups.set(`#${rowNo}`, { firstRow: rowNo, head: r, lines: [], errors: [`Fila ${rowNo}: falta ref`] });
      return;
    }
    const g = groups.get(ref) ?? { firstRow: rowNo, head: r, lines: [], errors: [] };
    g.lines.push({ sku: r.sku ?? "", qty: r.qty ?? "" });
    groups.set(ref, g);
  });

  return [...groups].map(([ref, g]) => {
    if (g.errors.length) return { ref, firstRow: g.firstRow, order: null, errors: g.errors };
    const parsed = orderInput.safeParse({
      externalRef: ref,
      customerName: g.head.customer,
      address: g.head.address,
      commune: g.head.commune,
      phone: g.head.phone,
      carrier: g.head.carrier,
      lines: g.lines,
    });
    return parsed.success
      ? { ref, firstRow: g.firstRow, order: parsed.data, errors: [] }
      : { ref, firstRow: g.firstRow, order: null, errors: parsed.error.issues.map((x) => `Fila ${g.firstRow}: ${x.message}`) };
  });
}
