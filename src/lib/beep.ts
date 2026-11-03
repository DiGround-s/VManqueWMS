"use client";

import { toast } from "sonner";

let ctx: AudioContext | null = null;

/** Short scanner-style feedback: one high beep when OK, three low buzzes on error. */
export function beep(ok: boolean) {
  try {
    ctx ??= new AudioContext();
    const tones = ok ? [[1200, 0]] : [[220, 0], [220, 0.18], [220, 0.36]];
    for (const [freq, at] of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = ok ? "sine" : "square";
      osc.frequency.value = freq;
      gain.gain.value = ok ? 0.15 : 0.25;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + (ok ? 0.08 : 0.14));
    }
    if (!ok) navigator.vibrate?.([120, 60, 120]);
  } catch {
    // Audio is a nicety; never break a scan over it.
  }
}

/** Wrong thing scanned: buzz and say what was expected. */
export function scanError(message: string) {
  beep(false);
  toast.error(message);
}
