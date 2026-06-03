// 產生每書卷 OG 分享卡（66 張）到 public/og/{osis}.png。
// CJK 用 macOS 系統字型渲染（resvg loadSystemFonts），故須在「本機 macOS」執行，
// 產出 PNG 後 commit；CI（ubuntu，無中文字型）不重產，只當靜態資產複製。
//   用法：cd web && node scripts/build-og-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const bookMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/bookMap.json'), 'utf-8'));
const OUT = path.join(ROOT, 'public', 'og');
fs.mkdirSync(OUT, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svgFor(zh, en) {
  // 書名過長時縮小字級，避免溢出 1120px 內框
  const size = zh.length >= 7 ? 116 : zh.length >= 5 ? 132 : 150;
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2c2013"/>
      <stop offset="1" stop-color="#16100a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="44" y="44" width="1112" height="542" fill="none" stroke="#8b6914" stroke-width="2" rx="12"/>
  <text x="600" y="170" font-family="Songti SC, STSong, serif" font-size="42" fill="#c9a24a" text-anchor="middle">聖經恢復本 · 原文字義解析</text>
  <text x="600" y="360" font-family="Songti SC, STSong, serif" font-size="${size}" font-weight="700" fill="#f2e7cf" text-anchor="middle">${esc(zh)}</text>
  <text x="600" y="450" font-family="Georgia, serif" font-size="42" fill="#c9a24a" text-anchor="middle" font-style="italic">${esc(en)}</text>
  <text x="600" y="540" font-family="Songti SC, STSong, serif" font-size="32" fill="#b08d57" text-anchor="middle">原文逐字對照 · 恢復本經文</text>
</svg>`;
}

let n = 0;
for (const b of bookMap) {
  const svg = svgFor(b.zh, b.english);
  const resvg = new Resvg(svg, {
    font: { loadSystemFonts: true, defaultFontFamily: 'Songti SC' },
    fitTo: { mode: 'width', value: 1200 },
  });
  fs.writeFileSync(path.join(OUT, `${b.osis}.png`), resvg.render().asPng());
  n++;
}
console.log(`✓ 產出 ${n} 張書卷 OG 卡到 public/og/`);
