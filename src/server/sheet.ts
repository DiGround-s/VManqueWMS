import "server-only";
import * as XLSX from "xlsx";
import { UserError } from "./errors";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

/** Reads the first sheet of an .xlsx/.xls/.csv upload into rows keyed by lower-cased header. */
export async function readSheet(file: unknown): Promise<Record<string, string>[]> {
  if (!(file instanceof File) || file.size === 0) throw new UserError("Selecciona un archivo");
  if (file.size > MAX_BYTES) throw new UserError("El archivo supera 5 MB");
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new UserError("Formato no soportado: usa .xlsx, .xls o .csv");
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", raw: false, dense: true });
  } catch {
    throw new UserError("No se pudo leer el archivo");
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new UserError("El archivo no tiene hojas");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  if (rows.length > MAX_ROWS) throw new UserError(`Máximo ${MAX_ROWS} filas por archivo`);
  return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? "").trim()])));
}
