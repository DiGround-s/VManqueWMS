"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "./action-result";

/** Runs a server action inside a transition (so buttons can show `pending`) and toasts errors. */
export function useAction() {
  const [pending, startTransition] = useTransition();
  function run<T>(call: () => Promise<ActionResult<T>>, opts: { success?: string | ((d: T) => string); onOk?: (d: T) => void; onError?: (e: string) => void } = {}) {
    startTransition(async () => {
      const res = await call();
      if (res.ok) {
        if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(res.data) : opts.success);
        opts.onOk?.(res.data);
      } else {
        toast.error(res.error);
        opts.onError?.(res.error);
      }
    });
  }
  return [pending, run] as const;
}
