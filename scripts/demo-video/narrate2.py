"""Narrates a demo video at natural speed. When a line does not fit its scene, the scene is
lengthened by holding its last frame, so the voice never has to rush.

Usage: python narrate2.py config.json
config: {"video": "...mp4", "out": "...mp4", "voice": "en-US-BrianMultilingualNeural",
         "total": 144.8, "lines": [[start_seconds, "text"], ...]}
"""
import asyncio, json, subprocess, sys, tempfile
from pathlib import Path
import edge_tts
sys.path.insert(0, str(Path(__file__).parent))

FF = r"C:\Users\power\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
GAP = 0.35  # silence kept before the next line starts


def duration(p):
    out = subprocess.run([f"{FF}\\ffprobe.exe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout
    return float(out.strip())


async def main(cfg):
    lines, total = cfg["lines"], cfg["total"]
    tmp = Path(tempfile.mkdtemp(prefix="narr-"))
    clips, holds = [], []
    for i, (start, text) in enumerate(lines):
        end = lines[i + 1][0] if i + 1 < len(lines) else total
        path = tmp / f"l{i:02d}.mp3"
        if cfg.get("engine") == "elevenlabs":
            import eleven
            prev = lines[i - 1][1] if i else None
            nxt = lines[i + 1][1] if i + 1 < len(lines) else None
            eleven.synth(text, path, cfg["voice"], prev, nxt)
        else:
            await edge_tts.Communicate(text, cfg["voice"], rate=cfg.get("rate", "+0%"), pitch=cfg.get("pitch", "+0Hz")).save(str(path))
        d = duration(path)
        hold = max(0.0, d + GAP - (end - start))
        holds.append(hold)
        clips.append((start, path, d))
        print(f"{i:2d} {start:6.1f}s  voz {d:4.1f}s / escena {end - start:4.1f}s" + (f"  +{hold:.1f}s congelado" if hold else ""))

    # Video: cut at each line start; every scene gets its hold (last frame frozen) at the end.
    cuts = [0.0] + [s for s, _ in lines] + [total]
    parts, labels = [], []
    for k in range(len(cuts) - 1):
        a, b = cuts[k], cuts[k + 1]
        if b - a <= 0.01:
            continue
        hold = holds[k - 1] if k >= 1 else 0.0  # segment k starts at line k-1
        f = f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS"
        if hold > 0:
            f += f",tpad=stop_mode=clone:stop_duration={hold:.3f}"
        parts.append(f + f"[v{k}]")
        labels.append(f"[v{k}]")
    parts.append("".join(labels) + f"concat=n={len(labels)}:v=1:a=0[vout]")

    # Audio: each line at its start, shifted by the holds added before it.
    inputs, afilters, shift = [], [], 0.0
    for k, (start, path, d) in enumerate(clips):
        inputs += ["-i", str(path)]
        ms = int((start + shift) * 1000)
        afilters.append(f"[{k + 1}:a]adelay={ms}|{ms},aresample=48000[a{k}]")
        shift += holds[k]
    afilters.append("".join(f"[a{k}]" for k in range(len(clips))) + f"amix=inputs={len(clips)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]")
    new_total = total + sum(holds)
    subprocess.run([f"{FF}\\ffmpeg.exe", "-y", "-loglevel", "error", "-i", cfg["video"], *inputs,
                    "-filter_complex", ";".join(parts + afilters), "-map", "[vout]", "-map", "[aout]",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p",
                    "-ac", "2", "-c:a", "aac", "-b:a", "160k", "-t", f"{new_total:.2f}", "-movflags", "+faststart",
                    "-metadata", f"title={cfg.get('title', 'VManque WMS')}", cfg["out"]], check=True)
    print(f"listo: {cfg['out']}  ({new_total:.1f} s, +{sum(holds):.1f} s de escenas alargadas)")


asyncio.run(main(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))))
