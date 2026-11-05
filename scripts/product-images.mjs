// Writes the sample product illustrations to public/products/vm-XXXX.svg (one per seed product).
// Flat, two-tone drawings on a tinted tile so the catalog, picking and packing screens show something recognisable.
// Run: node scripts/product-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(import.meta.dirname, "..", "public", "products");
mkdirSync(out, { recursive: true });

const INK = "#1b2333";
const s = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="5" stroke-linejoin="round" ${extra}/>`;
const r = (x, y, w, h, rx, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${INK}" stroke-width="5"/>`;
const c = (cx, cy, rr, fill) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${fill}" stroke="${INK}" stroke-width="5"/>`;
const e = (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${INK}" stroke-width="5"/>`;
const line = (d, w = 5, col = INK) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const label = (x, y, w, h, fill = "#fffdf8") => r(x, y, w, h, 6, fill);

// Archetypes: each returns the drawing for a 200×200 canvas.
const A = {
  thermos: (m) => r(70, 40, 60, 130, 18, m) + r(78, 26, 44, 22, 8, INK) + r(70, 80, 60, 10, 0, "#ffffff55"),
  gourd: (m, a) => s("M60 110 C55 60 145 60 140 110 C138 155 62 155 60 110 Z", m) + e(100, 72, 34, 10, a) + line("M118 30 L106 82", 7, "#c0c6cf") + c(118, 28, 6, "#c0c6cf"),
  straw: (m) => line("M50 160 L150 40", 9, m) + e(52, 158, 12, 8, m) + line("M60 140 L70 150 M66 132 L76 142", 3),
  bag: (m, a) => s("M55 60 L145 60 L155 170 L45 170 Z", m) + s("M55 60 L70 38 L130 38 L145 60 Z", a) + label(70, 95, 60, 40),
  bagSmall: (m, a) => s("M65 70 L135 70 L142 165 L58 165 Z", m) + line("M65 70 L135 70", 9, a) + label(78, 100, 44, 32),
  jar: (m, a) => r(62, 62, 76, 100, 14, m) + r(58, 42, 84, 26, 6, a) + label(72, 96, 56, 34),
  box: (m, a) => s("M40 80 L100 55 L160 80 L160 150 L100 175 L40 150 Z", m) + s("M40 80 L100 105 L160 80 L100 55 Z", a) + line("M100 105 L100 175"),
  bottle: (m, a) => s("M82 30 L118 30 L118 62 C140 75 140 90 140 100 L140 168 L60 168 L60 100 C60 90 60 75 82 62 Z", m) + r(84, 22, 32, 14, 4, a) + label(70, 110, 60, 36),
  dropper: (m, a) => r(72, 80, 56, 86, 10, m) + r(84, 54, 32, 30, 4, a) + e(100, 44, 14, 14, INK) + label(80, 108, 40, 30),
  soap: (m, a) => s("M45 105 C45 80 155 80 155 105 L155 130 C155 150 45 150 45 130 Z", m) + e(100, 104, 52, 16, a) + c(140, 60, 10, "#ffffffaa") + c(120, 48, 6, "#ffffffaa"),
  chocolate: (m, a) => r(45, 50, 110, 110, 8, m) + r(45, 110, 110, 50, 0, a) + line("M82 50 L82 110 M118 50 L118 110 M45 80 L155 80", 4),
  sock: (m, a) => s("M80 30 L125 30 L125 110 C125 140 115 165 85 165 L55 165 C40 165 38 140 55 135 L80 125 Z", m) + r(78, 30, 48, 20, 4, a) + line("M82 75 L122 75 M82 95 L122 95", 4, a),
  beanie: (m, a) => s("M40 140 C40 70 160 70 160 140 Z", m) + r(34, 130, 132, 28, 10, a) + c(100, 62, 14, a) + line("M70 100 L70 128 M100 92 L100 128 M130 100 L130 128", 4),
  blanket: (m, a) => s("M40 60 L160 60 L160 150 L40 150 Z", m) + line("M40 85 L160 85 M40 125 L160 125", 8, a) + line("M48 150 L48 168 M64 150 L64 168 M80 150 L80 168 M96 150 L96 168 M112 150 L112 168 M128 150 L128 168 M144 150 L144 168", 3),
  poncho: (m, a) => s("M100 40 L170 140 L100 170 L30 140 Z", m) + e(100, 58, 16, 10, "#fffdf8") + line("M54 132 L100 152 L146 132", 7, a),
  pot: (m, a) => s("M45 85 L155 85 C155 140 140 165 100 165 C60 165 45 140 45 85 Z", m) + r(38, 74, 124, 18, 9, a) + line("M38 100 L26 100 M162 100 L174 100", 8),
  bowl: (m, a) => s("M38 95 L162 95 C162 140 135 160 100 160 C65 160 38 140 38 95 Z", m) + e(100, 95, 62, 12, a),
  basket: (m, a) => s("M40 95 L160 95 L145 165 L55 165 Z", m) + line("M65 60 C80 20 120 20 135 60 L135 95 M65 60 L65 95", 7) + line("M48 118 L152 118 M52 140 L148 140", 4, a),
  board: (m, a) => r(40, 60, 120, 90, 14, m) + c(148, 105, 8, "#fffdf8") + line("M60 85 L120 85 M60 105 L110 105 M60 125 L125 125", 3, a),
  mortar: (m, a) => s("M50 105 L150 105 C150 150 130 170 100 170 C70 170 50 150 50 105 Z", m) + e(100, 105, 50, 12, a) + line("M118 30 L100 98", 14, m) + line("M118 30 L100 98", 4),
  knife: (m, a) => s("M40 120 L130 70 C150 62 158 74 148 84 L60 136 Z", "#d6dbe2") + s("M130 70 L170 46 L178 58 L148 84 Z", m) + c(160, 56, 3, a),
  mat: (m, a) => r(40, 55, 120, 95, 6, m) + line("M40 70 L160 70 M40 86 L160 86 M40 102 L160 102 M40 118 L160 118 M40 134 L160 134", 3, a),
  candle: (m, a) => r(68, 70, 64, 96, 8, m) + line("M100 70 L100 56", 4) + s("M100 26 C112 40 112 52 100 56 C88 52 88 40 100 26 Z", a),
};

const P = [
  ["thermos", "#3b7a8c", "#2f3b4d", "#d7ecef"],
  ["gourd", "#8a5a2b", "#5e3b18", "#f3e3c8"],
  ["straw", "#b8bec7", "#8b929c", "#e6eaf0"],
  ["bag", "#4f8a3c", "#36652a", "#e3efd9"],
  ["bagSmall", "#b0352b", "#7a2019", "#f6dcd8"],
  ["bagSmall", "#e8e4da", "#b7b0a0", "#e2e9f5"],
  ["jar", "#e3a72a", "#8a5a00", "#fbecc6"],
  ["jar", "#7b2e4f", "#c88aa7", "#f1dde6"],
  ["bag", "#c98a3a", "#8a5a00", "#f6e7cf"],
  ["bag", "#e9d7a8", "#b09454", "#f3efe4"],
  ["bagSmall", "#c9a06a", "#7d5a2e", "#f3e6d2"],
  ["box", "#6f9a4a", "#9fc47a", "#e3efd9"],
  ["dropper", "#d98a6a", "#7a3a2a", "#f8e2d8"],
  ["soap", "#e9a6a0", "#f6d3cf", "#fbe9e6"],
  ["box", "#c6842f", "#e9b46b", "#f6e7cf"],
  ["chocolate", "#5b2f20", "#6e3f8f", "#eadff3"],
  ["sock", "#9c8b74", "#5c4f3e", "#efe8dd"],
  ["beanie", "#2f5d8c", "#e2b33c", "#e2e9f5"],
  ["blanket", "#b0352b", "#e2b33c", "#f6dcd8"],
  ["poncho", "#d8cdb6", "#7d6a4a", "#f3efe4"],
  ["pot", "#b5652e", "#8a4720", "#f6e1d0"],
  ["bowl", "#b5652e", "#8a4720", "#f6e1d0"],
  ["basket", "#c9a06a", "#8a6a3a", "#f3e6d2"],
  ["board", "#9c5b33", "#6a3a1e", "#f3e3d6"],
  ["mortar", "#8b929c", "#5d646e", "#e6eaf0"],
  ["knife", "#6a3a1e", "#e2b33c", "#efe8dd"],
  ["mat", "#c8b27a", "#8a7440", "#f3efe4"],
  ["candle", "#e8c24a", "#e2702c", "#fbecc6"],
  ["bottle", "#5f7d2a", "#2f3b1a", "#e8efd9"],
  ["bag", "#4a2f22", "#2a1a12", "#efe2d6"],
];

P.forEach(([kind, main, alt, bg], i) => {
  const sku = `vm-${String(i + 1).padStart(4, "0")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="${bg}"/><ellipse cx="100" cy="176" rx="62" ry="8" fill="${INK}" opacity=".12"/>${A[kind](main, alt)}</svg>\n`;
  writeFileSync(join(out, `${sku}.svg`), svg);
});
console.log(`${P.length} imágenes en public/products`);
