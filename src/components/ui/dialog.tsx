"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Native <dialog>: a bottom sheet on phones, a centered card on wider screens. `side` renders a right-hand sheet. */
export function Dialog({ open, onClose, title, children, side, className }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; side?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={cn(
        "bg-panel p-0 text-text shadow-lift",
        side
          ? "ml-auto mr-0 h-dvh max-h-dvh w-full max-w-lg rounded-none"
          : "mx-auto mb-0 mt-auto w-full max-w-lg rounded-t-3xl sm:m-auto sm:w-[calc(100%-2rem)] sm:rounded-3xl",
        className,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          {!side && <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border-strong sm:hidden" aria-hidden />}
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-panel-2 hover:bg-border" aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2">{children}</div>
        </div>
      )}
    </dialog>
  );
}
