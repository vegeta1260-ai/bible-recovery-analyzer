import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import bookMap from '@/data/bookMap.json';

// 內容完整性 gate：逐章頁（study/[book]/[chapter]）由 token 動態產 1,189 頁，
// 每頁疊上「本章概要」與「默想·禱讀」。這兩份資料是逐章補齊的，容易漏章或留空，
// 故在此把「66 卷每一章都有非空概要與默想」固化成 CI gate，防止未來退化。
// 章數權威來源 = token（與 getStaticPaths 同源），不硬編，避免兩處數字漂移。

type CToken = { r?: string };

const tokensDir = path.join(process.cwd(), 'public', 'data', 'tokens');
const outlineDir = path.join(process.cwd(), 'src', 'data', 'chapter-outlines');
const meditationDir = path.join(process.cwd(), 'src', 'data', 'chapter-meditations');

/** 由 token 的 verse_ref（"Book.Chapter.Verse"）算出該卷最大章號。0 = 無 token 檔。 */
function chapterCount(osis: string): number {
  const f = path.join(tokensDir, `${osis}.json`);
  if (!fs.existsSync(f)) return 0;
  const toks = JSON.parse(fs.readFileSync(f, 'utf-8')) as CToken[];
  let max = 0;
  for (const t of toks) {
    if (!t || !t.r) continue;
    const parts = t.r.split('.');
    if (parts.length < 3) continue;
    const ch = Number(parts[1]);
    if (Number.isFinite(ch) && ch > max) max = ch;
  }
  return max;
}

function loadJson(dir: string, osis: string): Record<string, unknown> | null {
  const f = path.join(dir, `${osis}.json`);
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf-8')) as Record<string, unknown>;
}

const books = (bookMap as { osis: string; zh: string }[])
  .map((b) => ({ ...b, n: chapterCount(b.osis) }))
  .filter((b) => b.n > 0);

// 取數一次，確保 token 真的被讀到（避免目錄空跑成 0 卷而「全綠」的假陽性）
it('能由 token 解析出 66 卷的章數', () => {
  expect(books.length).toBe(66);
  expect(books.reduce((s, b) => s + b.n, 0)).toBe(1189);
});

for (const [label, dir] of [
  ['本章概要', outlineDir],
  ['默想·禱讀', meditationDir],
] as const) {
  describe(`${label} 每章都有非空內容`, () => {
    for (const b of books) {
      it(`${b.osis}（${b.zh}）1..${b.n} 章完整`, () => {
        const data = loadJson(dir, b.osis);
        expect(data, `${label} 缺檔：${b.osis}.json`).not.toBeNull();
        const missing: number[] = [];
        const empty: number[] = [];
        for (let ch = 1; ch <= b.n; ch++) {
          const v = data![String(ch)];
          if (typeof v !== 'string') missing.push(ch);
          else if (v.trim().length === 0) empty.push(ch);
        }
        expect(missing, `${b.osis} ${label} 缺章`).toEqual([]);
        expect(empty, `${b.osis} ${label} 空值章`).toEqual([]);
      });
    }
  });
}
