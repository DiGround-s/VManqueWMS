// frames.json + cuts.json → concat list with server waits removed.
import fs from "fs";
const frames = JSON.parse(fs.readFileSync("frames.json", "utf8"));
const cuts = JSON.parse(fs.readFileSync("cuts.json", "utf8")).sort((a, b) => a[0] - b[0]);
const inCut = (t) => cuts.some(([a, b]) => t > a && t < b);
const removedBefore = (t) => cuts.reduce((n, [a, b]) => n + (b <= t ? b - a : a < t ? t - a : 0), 0);
const kept = frames.filter((f) => !inCut(f.ts)).map((f) => ({ ...f, adj: f.ts - removedBefore(f.ts) }));
let s = "";
for (let i = 0; i < kept.length; i++) {
  const d = i < kept.length - 1 ? Math.max(0.001, kept[i + 1].adj - kept[i].adj) : 1.5;
  s += `file 'frames/${kept[i].file}'\nduration ${Math.min(d, 8).toFixed(4)}\n`;
}
s += `file 'frames/${kept[kept.length - 1].file}'\n`;
fs.writeFileSync("list.txt", s);
const total = kept[kept.length - 1].adj - kept[0].adj;
console.log(`frames ${kept.length}/${frames.length} · cut ${cuts.reduce((n, [a, b]) => n + b - a, 0).toFixed(1)} s · total ${total.toFixed(1)} s`);
