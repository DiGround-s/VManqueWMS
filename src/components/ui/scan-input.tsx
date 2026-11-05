"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, CornerDownLeft, Loader2, ScanLine } from "lucide-react";
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
    if (autoFocus) ref.current?.focus();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(value);
  }

  const big = size === "xl";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
      {label && <span className="text-[13px] font-medium">{label}</span>}
      <div className="flex gap-2">
        <div className="group relative flex-1">
          <ScanLine className={cn("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted", big ? "size-6" : "size-[18px]")} aria-hidden />
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
              "w-full rounded-full bg-panel font-mono text-text shadow-card ring-1 ring-inset ring-border placeholder:font-sans placeholder:text-muted/80 transition hover:ring-border-strong focus:outline-none focus:ring-2 focus:ring-brand",
              big ? "h-16 pl-13 pr-12 text-lg" : "h-11 pl-11 pr-10 text-[15px]",
            )}
          />
          {pending ? (
            <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-brand" aria-label="Procesando" />
          ) : (
            value && <CornerDownLeft className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          )}
        </div>
        <button
          type="button"
          onClick={() => setCamera(true)}
          className={cn(
            "flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-accent-ink transition hover:opacity-90 active:scale-95",
            big ? "size-16" : "h-11 px-4",
          )}
          aria-label="Escanear con la cámara"
          title="Escanear con la cámara"
        >
          <Camera className={big ? "size-7" : "size-5"} aria-hidden />
          {!big && <span className="hidden text-sm sm:inline">Cámara</span>}
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
  const [ready, setReady] = useState(false);
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
        else setReady(true);
      } catch {
        setError("No se pudo abrir la cámara. Revisa el permiso del navegador (requiere HTTPS o localhost).");
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [onResult]);

  if (error) return <p className="rounded-xl bg-danger-bg p-3 font-medium text-danger">{error}</p>;
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} className="aspect-[3/4] w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="relative h-2/5 w-4/5 rounded-3xl border-[3px] border-white/90 shadow-[0_0_0_200vmax_rgb(0_0_0/0.45)]">
            {ready && <div className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-brand" />}
          </div>
        </div>
        {!ready && <Loader2 className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" aria-label="Abriendo cámara" />}
      </div>
      <p className="text-center text-sm text-muted">Centra el código de barras o QR dentro del marco.</p>
    </div>
  );
}
