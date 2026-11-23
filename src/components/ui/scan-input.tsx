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
  /** What this field expects. The camera ignores other kinds of codes, so a neighbouring QR can't be read by mistake. */
  expect?: ScanKind;
};

export type ScanKind = "location" | "product" | "order";
const LOCATION = /^(LOC:\s*)?[A-Z]+-\d+-\d+-\d+$/i;
const ORDER = /^PED-\d+$/i;
/** Whether a code read by the camera is the kind a field expects. */
export function isKind(code: string, kind?: ScanKind) {
  const c = code.trim();
  if (!kind) return true;
  if (kind === "location") return /^LOC:/i.test(c) || LOCATION.test(c);
  if (kind === "order") return ORDER.test(c);
  return !/^LOC:/i.test(c) && !LOCATION.test(c) && !ORDER.test(c) && !/^https?:\/\//i.test(c);
}

/**
 * Scan field for keyboard-wedge readers (USB/Bluetooth: they type the code and press Enter)
 * plus a camera button. Keeps focus after each scan so a reader can fire continuously.
 */
export function ScanInput({ onScan, placeholder = "Escanea o escribe el código", pending, size = "md", autoFocus = true, label, expect }: Props) {
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
            accept={(code) => isKind(code, expect)}
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

/** Back camera, sharp enough to read a QR off a screen or a small label, with continuous focus where supported. */
const CAMERA: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
  },
};
/** Only what the warehouse prints: QR labels, EAN-13 product barcodes and Code 128. */
const NATIVE_FORMATS = ["qr_code", "ean_13", "code_128"];

type Detected = { rawValue: string; boundingBox?: DOMRectReadOnly };
type Detector = { detect: (source: HTMLVideoElement) => Promise<Detected[]> };
type DetectorCtor = { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };

/**
 * Reads codes from the camera. Uses the phone's built-in detector when there is one (Android Chrome)
 * and otherwise ZXing (iPhone): it decodes only the square in the middle of the frame, scaled down,
 * several times a second — fast on a phone, and a QR beside the target stays out of the crop.
 */
function CameraReader({ onResult, accept }: { onResult: (code: string) => void; accept: (code: string) => boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const done = useRef(false);
  // The latest callbacks, so a parent re-render never restarts the camera mid-scan.
  const result = useRef(onResult);
  result.current = onResult;
  const wanted = useRef(accept);
  wanted.current = accept;

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let stream: MediaStream | null = null;
    const stop = () => {
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    const finish = (text: string | null | undefined) => {
      if (done.current || !text || !wanted.current(text)) return false;
      done.current = true;
      stop();
      result.current(text);
      return true;
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia(CAMERA);
        const el = video.current;
        if (cancelled || !el) return stop();
        el.srcObject = stream;
        await el.play();
        if (cancelled) return stop();

        const Native = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
        const supported = Native ? await Native.getSupportedFormats?.().catch(() => []) : [];
        const formats = NATIVE_FORMATS.filter((f) => supported?.includes(f));
        let read: () => Promise<string | null>;

        if (Native && formats.includes("qr_code")) {
          const detector = new Native({ formats });
          read = async () => {
            // Several codes in view: keep the expected kind, then the one nearest the centre of the frame.
            const cx = el.videoWidth / 2, cy = el.videoHeight / 2;
            const dist = (d: Detected) => (d.boundingBox ? Math.hypot(d.boundingBox.x + d.boundingBox.width / 2 - cx, d.boundingBox.y + d.boundingBox.height / 2 - cy) : 0);
            const best = (await detector.detect(el)).filter((d) => wanted.current(d.rawValue)).sort((a, b) => dist(a) - dist(b))[0];
            return best?.rawValue ?? null;
          };
        } else {
          const [{ HTMLCanvasElementLuminanceSource }, zx] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
          const reader = new zx.MultiFormatReader();
          reader.setHints(new Map([[zx.DecodeHintType.POSSIBLE_FORMATS, [zx.BarcodeFormat.QR_CODE, zx.BarcodeFormat.EAN_13, zx.BarcodeFormat.CODE_128]]]));
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          let n = 0;
          read = async () => {
            const vw = el.videoWidth, vh = el.videoHeight;
            // Mostly the centre square (what the frame on screen shows); every 4th try the whole picture.
            const whole = ++n % 4 === 0;
            const side = whole ? Math.max(vw, vh) : Math.round(Math.min(vw, vh) * 0.75);
            const sw = whole ? vw : side, sh = whole ? vh : side;
            const scale = Math.min(1, 640 / Math.max(sw, sh));
            canvas.width = Math.round(sw * scale);
            canvas.height = Math.round(sh * scale);
            ctx.drawImage(el, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
            try {
              return reader.decodeWithState(new zx.BinaryBitmap(new zx.HybridBinarizer(new HTMLCanvasElementLuminanceSource(canvas)))).getText();
            } catch {
              return null;
            } finally {
              reader.reset();
            }
          };
        }

        const tick = async () => {
          if (cancelled || done.current) return;
          try {
            if (el.readyState >= 2 && finish(await read())) return;
          } catch {}
          timer = window.setTimeout(tick, 80);
        };
        setReady(true);
        void tick();
      } catch {
        stop();
        if (!cancelled) setError("No se pudo abrir la cámara. Revisa el permiso del navegador (requiere HTTPS o localhost).");
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  if (error) return <p className="rounded-xl bg-danger-bg p-3 font-medium text-danger">{error}</p>;
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} className="aspect-[3/4] w-full object-cover" muted playsInline autoPlay />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="relative aspect-square w-3/4 rounded-3xl border-[3px] border-white/90 shadow-[0_0_0_200vmax_rgb(0_0_0/0.45)]">
            {ready && <div className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-brand" />}
          </div>
        </div>
        {!ready && <Loader2 className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" aria-label="Abriendo cámara" />}
      </div>
      <p className="text-center text-sm text-muted">Centra el código dentro del cuadro, a unos 20–30 cm.</p>
    </div>
  );
}
