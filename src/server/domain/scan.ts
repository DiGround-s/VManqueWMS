export type ParsedScan = { kind: "location"; code: string } | { kind: "any"; code: string };

/** `LOC:<code>` is an explicit location label; anything else may be a location, product or order. */
export function parseScan(raw: string): ParsedScan | null {
  const code = raw.trim();
  if (!code) return null;
  if (/^LOC:/i.test(code)) return { kind: "location", code: code.slice(4).trim().toUpperCase() };
  return { kind: "any", code };
}

export function looksLikeOrderCode(code: string) {
  return /^PED-\d+$/i.test(code);
}
