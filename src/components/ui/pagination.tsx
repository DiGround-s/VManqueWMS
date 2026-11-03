import Link from "next/link";
import { buttonClass } from "./button";

/** Server-side pagination links that keep the other search params. */
export function Pagination({ page, pageSize, total, params, basePath }: { page: number; pageSize: number; total: number; params: Record<string, string | undefined>; basePath: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp}`;
  };
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-muted">
      <span>
        {total} resultados · página {page} de {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? <Link className={buttonClass("secondary", "sm")} href={href(page - 1)}>Anterior</Link> : null}
        {page < pages ? <Link className={buttonClass("secondary", "sm")} href={href(page + 1)}>Siguiente</Link> : null}
      </div>
    </div>
  );
}

export function parsePage(v: string | undefined) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
