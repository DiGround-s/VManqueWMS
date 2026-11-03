"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Loader2, ScanLine } from "lucide-react";
import { cn } from "@/lib/cn";
import { Dialog } from "./dialog";

type Props = {
  onScan: (code: string) => void | Promise<void>;
  placeholder?: string;
  pending?: boolean;
  size?: "md" | "xl";
  autoFocus?: boolean;
  label?: string;
};

/**
 * Scan field for keyboard-wedge readers (USB/Bluetooth: they type the code and press Enter)
 * plus a camera button. Keeps focus after each scan so a reader can fire continuously.
 */
export function ScanInput({ onScan, placeholder = "Escanea o escribe el código", pending, size = "md", autoFocus = true, label }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [camera, setCamera] = useState(false);

  useEffect(() => {
    if (autoFocus && !pending) ref.current?.focus();
  }, [autoFocus, pending]);

  async function submit(code: string) {
    const c = code.trim();
    if (!c) return;
    setValue("");
    await onScan(c);
    ref.current?.focus();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(value);
  }

  const big = size === "xl";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1">
      {label && <span className="label">{label}</span>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted", big ? "size-6" : "size-4")} aria-hidden />
          <input
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            aria-label={label ?? placeholder}
            className={cn(
              "w-full rounded-md border-2 border-border-strong bg-panel font-mono text-text placeholder:font-sans placeholder:text-muted focus:border-accent",
              big ? "h-16 pl-12 pr-3 text-xl" : "h-11 pl-9 pr-3 text-base",
            )}
          />
          {pending && <Loader2 className="absolute right-3 top-1/2 size-5 -translate-y-1/2 animate-spin text-accent-strong" aria-label="Procesando" />}
        </div>
        <button
          type="button"
          onClick={() => setCamera(true)}
          className={cn("flex items-center justify-center rounded-md border-2 border-border-strong bg-panel-2 hover:border-accent", big ? "h-16 w-16" : "h-11 w-11")}
          aria-label="Escanear con la cámara"
        >
          <Camera className={big ? "size-7" : "size-5"} />
        </button>
      </div>
      <Dialog open={camera} onClose={() => setCamera(false)} title="Escanear con la cámara">
        {camera && (
          <CameraReader
            onResult={(code) => {
              setCamera(false);
              void submit(code);
            }}
          />
        )}
      </Dialog>
    </form>
  );
}

function CameraReader({ onResult }: { onResult: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !video.current) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, video.current, (result) => {
          if (result && !done.current) {
            done.current = true;
            controls.stop();
            onResult(result.getText());
          }
        });
        stop = () => controls.stop();
        if (cancelled) stop();
      } catch {
        setError("No se pudo abrir la cámara. Revisa el permiso del navegador (requiere HTTPS o localhost).");
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [onResult]);

  return error ? (
    <p className="text-danger">{error}</p>
  ) : (
    <video ref={video} className="aspect-[3/4] w-full rounded-md bg-black object-cover" muted playsInline />
  );
}
