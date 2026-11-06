// frames-b + cuts-b + speech-b → narrated MP4 (server waits removed, voice placed in video time).
import fs from "fs";
import { execFileSync } from "child_process";
const FF = "C:/Users/power/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
const OUT = process.argv[2] ?? "C:/Users/power/OneDrive/Escritorio/VManqueWMS/video/VManque-WMS-demo-B-narrado.mp4";
const frames = JSON.parse(fs.readFileSync("frames-b.json", "utf8"));
const cuts = JSON.parse(fs.readFileSync("cuts-b.json", "utf8")).sort((a, b) => a[0] - b[0]);
const speech = JSON.parse(fs.readFileSync("speech-b.json", "utf8"));
const inCut = (t) => cuts.some(([a, b]) => t > a && t < b);
const removedBefore = (t) => cuts.reduce((n, [a, b]) => n + (b <= t ? b - a : a < t ? t - a : 0), 0);
const t0 = frames[0].ts;
const kept = frames.filter((f) => !inCut(f.ts)).map((f) => ({ ...f, adj: f.ts - removedBefore(f.ts) }));
const base = kept[0].adj;
let s = "";
for (let i = 0; i < kept.length; i++) {
  const d = i < kept.length - 1 ? Math.max(0.001, kept[i + 1].adj - kept[i].adj) : 1.5;
  s += `file 'frames-b/${kept[i].file}'\nduration ${Math.min(d, 8).toFixed(4)}\n`;
}
s += `file 'frames-b/${kept[kept.length - 1].file}'\n`;
fs.writeFileSync("list-b.txt", s);
const total = kept[kept.length - 1].adj - base + 1.5;

const args = ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "list-b.txt"];
const filters = [];
speech.forEach((sp, k) => {
  args.push("-i", sp.file);
  const at = Math.max(0, sp.t - removedBefore(sp.t) - base);
  const ms = Math.round(at * 1000);
  filters.push(`[${k + 1}:a]adelay=${ms}|${ms},aresample=48000[a${k}]`);
});
filters.push(speech.map((_, k) => `[a${k}]`).join("") + `amix=inputs=${speech.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]`);
args.push("-filter_complex", filters.join(";"), "-map", "0:v", "-map", "[aout]", "-vf", "fps=30,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-ac", "2", "-c:a", "aac", "-b:a", "160k", "-t", total.toFixed(2),
  "-movflags", "+faststart", "-metadata", "title=VManque WMS - Demo (diseño B, narrado)", OUT);
execFileSync(FF, args, { stdio: "inherit" });
console.log(`listo ${OUT} · ${total.toFixed(1)} s · ${kept.length}/${frames.length} cuadros · cortado ${cuts.reduce((n, [a, b]) => n + b - a, 0).toFixed(1)} s · inicio ${(base - t0).toFixed(1)} s`);
