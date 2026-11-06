"""Original background track for the demo video (synthesized, no samples, no licensing).

Soft "tech" bed at 96 BPM: pad chords Am–F–C–G, plucked arpeggio with echo, sine bass and light
drums, arranged in sections, with fade in/out. Writes a 44.1 kHz stereo WAV.

  python music.py <seconds> <out.wav>
"""
import sys, wave
import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

# A minor, i–VI–III–VII
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
ROOTS = [45, 41, 48, 43]


def lp_fast(x, cutoff, passes=2):
    # cheap smoothing: moving average approximates a gentle low-pass, much faster than a loop
    k = max(1, int(SR / cutoff))
    kern = np.ones(k) / k
    for _ in range(passes):
        x = np.convolve(x, kern, mode="same")
    return x


def env(n, a, r, sustain=1.0):
    e = np.full(n, sustain)
    A, R = int(a * SR), int(r * SR)
    if A: e[:A] = np.linspace(0, sustain, A)
    if R: e[-R:] *= np.linspace(1, 0, R)
    return e


def saw(f, t, phase=0.0):
    return 2 * ((f * t + phase) % 1.0) - 1


def pad_bar(chord, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for note in chord + [chord[0] + 12]:
        f = midi(note)
        for d, pan in ((-0.09, 0.2), (0.0, 0.5), (0.11, 0.8)):
            v = saw(f * 2 ** (d / 12), t, rng.random())
            out[:, 0] += v * (1 - pan)
            out[:, 1] += v * pan
    for c in range(2):
        out[:, c] = lp_fast(out[:, c], 900)
    out *= env(n, 0.6, 0.6)[:, None] * 0.05
    return out


def pluck(f, dur):
    # Karplus–Strong string
    n = int(dur * SR)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p)
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return out * env(n, 0.002, dur * 0.6)


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 120 * np.exp(-t * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def hat():
    n = int(0.05 * SR)
    x = rng.uniform(-1, 1, n)
    x = x - lp_fast(x, 6000, 1)
    return x * np.exp(-np.arange(n) / SR * 90)


def clap():
    n = int(0.18 * SR)
    x = rng.uniform(-1, 1, n)
    x = lp_fast(x, 3000, 1) - lp_fast(x, 800, 1)
    return x * np.exp(-np.arange(n) / SR * 22)


def add(mix, sig, at, gain=1.0, pan=0.5):
    i = int(at * SR)
    if i >= len(mix): return
    j = min(len(mix), i + len(sig))
    s = sig[: j - i] * gain
    if s.ndim == 1:
        mix[i:j, 0] += s * (1 - pan) * 2 * 0.5
        mix[i:j, 1] += s * pan * 2 * 0.5
    else:
        mix[i:j] += s


def reverb(x, seconds=2.2, wet=0.22):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 3.2)
    ir /= np.sqrt((ir ** 2).sum())
    out = np.empty_like(x)
    L = len(x) + n - 1
    N = 1 << (L - 1).bit_length()
    IR = np.fft.rfft(ir, N)
    for c in range(2):
        out[:, c] = x[:, c] * (1 - wet) + np.fft.irfft(np.fft.rfft(x[:, c], N) * IR, N)[: len(x)] * wet * 3
    return out


def main(total, path):
    bars = int(np.ceil(total / BAR)) + 1
    mix = np.zeros((int((bars * BAR + 3) * SR), 2))
    plucks = {}
    for b in range(bars):
        t0 = b * BAR
        ch = CHORDS[b % 4]
        add(mix, pad_bar(ch, BAR + 0.6), t0)
        intro, outro = b < 4, b >= bars - 5
        # bass: root on beats 1 and 3 (+ a pickup on the "and" of 4)
        if not intro:
            for k, off in enumerate((0, 2, 3.5)):
                f = midi(ROOTS[b % 4])
                n = int(BEAT * (0.9 if k < 2 else 0.45) * SR)
                t = np.arange(n) / SR
                bass = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * env(n, 0.01, 0.15)
                add(mix, bass, t0 + off * BEAT, 0.16)
        # arpeggio: 8th notes up and down the chord, two octaves up, with a dotted-8th echo
        if b >= 2:
            seq = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1], ch[0] + 12, ch[2]]
            for k, note in enumerate(seq):
                key = note + 12
                if key not in plucks: plucks[key] = pluck(midi(key), 0.6)
                at = t0 + k * BEAT / 2
                g = 0.075 if not outro else 0.06
                pan = 0.35 if k % 2 else 0.65
                add(mix, plucks[key], at, g, pan)
                add(mix, plucks[key], at + BEAT * 0.75, g * 0.35, 1 - pan)
        # drums
        if 4 <= b < bars - 3:
            for beat in range(4):
                if beat in (0, 2): add(mix, kick(), t0 + beat * BEAT, 0.33)
                if beat in (1, 3) and b >= 8: add(mix, clap(), t0 + beat * BEAT, 0.07, 0.55)
            for e in range(8):
                add(mix, hat(), t0 + e * BEAT / 2 + 0.01, 0.05 if e % 2 else 0.028, 0.6)
    mix = reverb(mix)
    n = int(total * SR)
    mix = mix[:n]
    fade_in, fade_out = int(2.5 * SR), int(6 * SR)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.5
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)  # gentle glue
    mix /= np.abs(mix).max() / 0.89
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"{path}: {total:.1f} s, {bars} compases a {BPM} BPM")


if __name__ == "__main__":
    main(float(sys.argv[1]), sys.argv[2])
