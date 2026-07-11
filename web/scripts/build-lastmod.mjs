#!/usr/bin/env node
/**
 * build-lastmod.mjs — 產生 src/data/lastmod.json（各書卷/字典/站台的「內容真實最後變更日」manifest）。
 *
 * 為什麼：sitemap 與章頁 Article.dateModified 過去用 new Date()（build 日），
 * 等於每次 deploy 全站 15k URL 都宣稱剛改過——Google 會折價甚至忽略這種 lastmod。
 * 本 manifest 以「內容來源檔的 git 最後 commit 日」為準，只有內容真的變了日期才會動。
 *
 * 資料來源（取各書卷三檔的最大值）：
 *   - src/data/chapter-summaries/{osis}.json（概要）
 *   - src/data/chapter-meditations/{osis}.json（默想）
 *   - public/data/tokens/{osis}.json（原文 token）
 * 另有 lexicon（lexicon.json / strongs-occurrences.json 取大）與 site（web/src 最後 commit）。
 * tokens 欄位（全部 token 檔的最大 commit 日）供 IndexedDB 快取版本化使用。
 *
 * ⚠️ 需在「有完整 git 歷史」的本機執行（CI checkout 預設 depth=1，日期會全部變成 HEAD 日期，
 * 所以 manifest 是 commit 進 git 的，不在 CI 產）。資料檔變更後重跑本腳本並一起 commit。
 * 冪等：輸出僅依 git 歷史，可重複執行。
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(WEB, '..');

function gitDate(...relPaths) {
  // 取多個路徑中最新的 commit 日（YYYY-MM-DD）；路徑不存在於歷史則忽略。
  let max = '';
  for (const p of relPaths) {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', p], {
      cwd: REPO,
      encoding: 'utf-8',
    }).trim();
    if (out && out > max) max = out;
  }
  return max;
}

const summariesDir = path.join(WEB, 'src', 'data', 'chapter-summaries');
const books = readdirSync(summariesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

if (books.length !== 66) {
  console.error(`FAIL: chapter-summaries 應有 66 卷，實得 ${books.length}`);
  process.exit(1);
}

const manifest = { books: {}, lexicon: '', tokens: '', site: '' };
for (const osis of books) {
  manifest.books[osis] = gitDate(
    `web/src/data/chapter-summaries/${osis}.json`,
    `web/src/data/chapter-meditations/${osis}.json`,
    `web/public/data/tokens/${osis}.json`,
  );
}
manifest.lexicon = gitDate('web/src/data/lexicon.json', 'web/src/data/strongs-occurrences.json');
manifest.tokens = gitDate('web/public/data/tokens');
manifest.site = gitDate('web/src');

const missing = books.filter((b) => !manifest.books[b]);
if (missing.length || !manifest.lexicon || !manifest.tokens || !manifest.site) {
  console.error(`FAIL: 有項目取不到 git 日期（books 缺 ${missing.length}）`);
  process.exit(1);
}

const outPath = path.join(WEB, 'src', 'data', 'lastmod.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 1) + '\n', 'utf-8');
console.log(`OK: ${outPath}（66 卷；lexicon=${manifest.lexicon}, tokens=${manifest.tokens}, site=${manifest.site}）`);
