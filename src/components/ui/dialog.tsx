"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Native <dialog>. `side` renders it as a right-hand sheet. */
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
        "border-2 border-border-strong bg-panel text-text p-0 shadow-[0_24px_60px_-12px_rgb(14_21_37/0.45)]",
        side ? "ml-auto mr-0 h-dvh max-h-dvh w-full max-w-lg rounded-none border-y-0 border-r-0" : "m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl",
        className,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b-[1.5px] border-border px-4 py-3">
            <h2 className="text-lg font-extrabold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-panel-2" aria-label="Cerrar">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
