#!/usr/bin/env node
// 掃描全經，找出「原文（OSHB/MorphGNT）節號」與「恢復本節號」分節不一致的卷章，
// 推導對映規則並寫出 src/data/versification.json，供 ChapterRecovery 對齊用。
//
// 背景：逐章頁的恢復本 slot 以原文節號建立；ChapterRecovery 用恢復本節號填同號 slot。
// 當兩套分節不同（詩篇希伯來題注→原文多 1-2 節；3John 末節合併…），恢復本會錯位。
// 依賴外部 LSM API（約 1189 章請求），故為手動工具，不放 CI：node scripts/scan-versification.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LSM_API_URL = 'https://api.lsm.org/recver/txo.php';
const LSM_AUTH =
  'Basic ' +
  Buffer.from('ai.vegeta1260.biblerecoveryanalyzer:web_9972c275-24f4-4720-bd42-8b5c0d9c6fd7').toString('base64');
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CONCURRENCY = 12;

// 與 src/lib/lsmApi.ts buildLsmChapterRef 同源（書名特例）。
const LSM_BOOK_OVERRIDE = { Song: 'SoS', Prov: 'Prv', Ezek: 'Ezk', Mark: 'Mrk', Judg: 'Jdg', Phlm: 'Phm' };
function lsmBook(osis, bookEn) {
  return LSM_BOOK_OVERRIDE[osis] ?? bookEn.replace(/\s+/g, '');
}

// 讀 token，回 { chapter: Set<verseNum> }（原文節號）
function origVersesByChapter(osis) {
  const f = path.join(root, 'public', 'data', 'tokens', `${osis}.json`);
  if (!fs.existsSync(f)) return null;
  const map = new Map();
  for (const t of JSON.parse(fs.readFileSync(f, 'utf-8'))) {
    if (!t || !t.r) continue;
    const [, c, v] = t.r.split('.');
    const ch = Number(c), vs = Number(v);
    if (!Number.isFinite(ch) || !Number.isFinite(vs)) continue;
    if (!map.has(ch)) map.set(ch, new Set());
    map.get(ch).add(vs);
  }
  return map;
}

async function fetchOnce(ref) {
  const p = new URLSearchParams({ String: ref, Out: 'json', Lang: 'zho' });
  const resp = await fetch(`${LSM_API_URL}?${p}`, { headers: { Authorization: LSM_AUTH } });
  if (!resp.ok) { const e = new Error(`HTTP ${resp.status}`); e.retryable = RETRYABLE.has(resp.status); throw e; }
  return resp.json();
}

// 回恢復本該章節號陣列（已過濾 No such / 空）。單章書用 .1-99 取整章（同 buildLsmChapterRef）。
async function recoveryVerses(book, chapter, totalCh) {
  const ref = totalCh === 1 ? `${book}.1-99` : `${book}.${chapter}`;
  let data;
  try { data = await fetchOnce(ref); }
  catch (e) { if (e.retryable === false) throw e; await sleep(2000); data = await fetchOnce(ref); }
  const verses = Array.isArray(data.verses) ? data.verses : [];
  return verses
    .filter((v) => v && typeof v.text === 'string' && v.text.trim() && !/^No such/i.test(v.text.trim()))
    .map((v) => { const m = v.ref.match(/:(\d+)/); return m ? Number(m[1]) : 0; })
    .filter((n) => n > 0);
}

// 並發執行
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const books = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'bookMap.json'), 'utf-8'));

// 攤平成 (osis, bookEn, chapter, origMax) 工作清單
const jobs = [];
for (const b of books) {
  const m = origVersesByChapter(b.osis);
  if (!m) continue;
  for (const [ch, set] of m) jobs.push({ osis: b.osis, bookEn: b.english, chapter: ch, origMax: Math.max(...set), totalCh: m.size });
}
jobs.sort((a, c) => a.osis.localeCompare(c.osis) || a.chapter - c.chapter);

console.error(`掃描 ${jobs.length} 章（並發 ${CONCURRENCY}）…`);
let done = 0;
const results = await mapLimit(jobs, CONCURRENCY, async (j) => {
  let recMax = 0, recCount = 0, err = '';
  try { const rv = await recoveryVerses(lsmBook(j.osis, j.bookEn), j.chapter, j.totalCh); recMax = rv.length ? Math.max(...rv) : 0; recCount = rv.length; }
  catch (e) { err = String(e.message || e); }
  if (++done % 100 === 0) console.error(`  …${done}/${jobs.length}`);
  return { ...j, recMax, recCount, err };
});

// 推導差異與 type
const versification = {};
const review = [];
const errors = [];
for (const r of results) {
  if (r.err) { errors.push(`${r.osis}.${r.chapter}: ${r.err}`); continue; }
  if (r.recMax === 0) { errors.push(`${r.osis}.${r.chapter}: 恢復本 0 節`); continue; }
  const diff = r.origMax - r.recMax; // >0：原文多（題注/合併）
  if (diff === 0 && r.origMax === r.recCount) continue; // 對齊，無差異
  versification[r.osis] ??= {};
  if (r.osis === 'Ps' && diff > 0) {
    // 詩篇題注：恢復本整體後移 diff 節（恢復本 vN → 原文 v(N+diff)）
    versification[r.osis][r.chapter] = { type: 'offset', recToOrig: diff };
  } else if (r.osis === '3John' && r.chapter === 1) {
    versification[r.osis][r.chapter] = { type: 'merge', merges: { 14: [14, 15] } };
  } else {
    // 其餘差異標 review，待人工複核型態（可能末節合併或中段插節）
    review.push({ ref: `${r.osis}.${r.chapter}`, origMax: r.origMax, recMax: r.recMax, recCount: r.recCount, diff });
    versification[r.osis][r.chapter] = { type: 'review', origMax: r.origMax, recMax: r.recMax };
  }
}

const outFile = path.join(root, 'src', 'data', 'versification.json');
fs.writeFileSync(outFile, JSON.stringify(versification, null, 2) + '\n');

const psCount = Object.keys(versification.Ps ?? {}).length;
console.error('\n=== 摘要 ===');
console.error(`詩篇 offset（題注）章數：${psCount}`);
console.error(`3John merge：${versification['3John'] ? '有' : '無'}`);
console.error(`待複核（review）：${review.length} 章`);
for (const r of review) console.error(`  REVIEW ${r.ref}  原文${r.origMax} 恢復本${r.recMax}(count=${r.recCount}) diff=${r.diff}`);
console.error(`錯誤：${errors.length}`);
for (const e of errors.slice(0, 20)) console.error(`  ERR ${e}`);
console.error(`\n已寫 ${outFile}`);
