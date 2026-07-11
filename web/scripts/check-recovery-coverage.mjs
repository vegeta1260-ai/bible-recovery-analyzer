#!/usr/bin/env node
// 恢復本經文覆蓋率檢查：實際向 LSM API 驗證全 66 卷「每一卷的第 1 章」都能取到
// 中英文恢復本經文。這是 web/src/pages/study 逐章頁主要內容的回歸防護——
// 曾因英文書名含空格（18 卷）/ 單章書章節格式而整段缺漏（commit 642831bd）。
//
// 依賴外部 LSM API + 公開 web token + 配額，故不放進 `npm test`（單元測試需離線可跑）；
// 現為 CI 部署 gate：deploy-pages.yml 的「Recovery coverage」步驟跑 `npm run check:recovery`，
// 失敗則不部署。也可手動執行：node scripts/check-recovery-coverage.mjs。
// 書名解析規則與 src/lib/lsmApi.ts 的 buildLsmChapterRef 同源（此處內聯一份，故意保持一致）。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LSM_API_URL = 'https://api.lsm.org/recver/txo.php';
const LSM_AUTH =
  'Basic ' +
  Buffer.from('ai.vegeta1260.biblerecoveryanalyzer:web_9972c275-24f4-4720-bd42-8b5c0d9c6fd7').toString('base64');

// 與 src/lib/lsmApi.ts buildLsmChapterRef 同源（見該檔註解）。
const LSM_BOOK_OVERRIDE = { Song: 'SoS', Prov: 'Prv', Ezek: 'Ezk', Mark: 'Mrk', Judg: 'Jdg', Phlm: 'Phm' };
function buildLsmChapterRef(osis, bookEn, chapter, totalChapters) {
  const book = LSM_BOOK_OVERRIDE[osis] ?? bookEn.replace(/\s+/g, '');
  return totalChapters === 1 ? `${book}.1-99` : `${book}.${chapter}`;
}

function chapterCount(osis) {
  const f = path.join(root, 'public', 'data', 'tokens', `${osis}.json`);
  if (!fs.existsSync(f)) return 0;
  let max = 0;
  for (const t of JSON.parse(fs.readFileSync(f, 'utf-8'))) {
    if (!t || !t.r) continue;
    const parts = t.r.split('.');
    if (parts.length < 3) continue;
    const ch = Number(parts[1]);
    if (Number.isFinite(ch) && ch > max) max = ch;
  }
  return max;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(ref, lang) {
  const params = new URLSearchParams({ String: ref, Out: 'json', Lang: lang });
  const resp = await fetch(`${LSM_API_URL}?${params}`, { headers: { Authorization: LSM_AUTH } });
  if (!resp.ok) {
    const e = new Error(`HTTP ${resp.status}`);
    e.retryable = RETRYABLE_STATUS.has(resp.status);
    throw e;
  }
  return resp.json();
}

async function fetchVerses(ref, lang) {
  // 此腳本是 deploy gate（任一卷失敗即不發佈），故對網路例外 / 5xx / 429 退避重試一次，
  // 避免 LSM 短暫抖動誤擋部署；4xx（如 401/404）視為真失敗，不重試。
  let data;
  try {
    data = await fetchOnce(ref, lang);
  } catch (e1) {
    if (e1.retryable === false) return { ok: false, count: 0, reason: e1.message };
    await sleep(2000);
    try {
      data = await fetchOnce(ref, lang);
    } catch (e2) {
      return { ok: false, count: 0, reason: e2.message };
    }
  }
  const verses = Array.isArray(data.verses) ? data.verses : [];
  // 與 doFetchLang 一致：濾掉空字串與 "No such..." 佔位
  const valid = verses.filter((v) => v && typeof v.text === 'string' && v.text.trim() && !/^No such/i.test(v.text.trim()));
  return { ok: valid.length > 0, count: valid.length, reason: valid.length ? '' : `detected="${(data.detected || '').trim()}"` };
}

const books = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'bookMap.json'), 'utf-8'))
  .map((b) => ({ ...b, n: chapterCount(b.osis) }))
  .filter((b) => b.n > 0);

console.log(`檢查全 ${books.length} 卷第 1 章恢復本（中英）覆蓋率…\n`);
let failed = 0;
for (const b of books) {
  const ref = buildLsmChapterRef(b.osis, b.english, 1, b.n);
  const [zh, en] = await Promise.all([fetchVerses(ref, 'zho'), fetchVerses(ref, 'eng')]);
  // 嚴格：中英都要取到，且節數一致。中文只回 1 節（書名在中文模式被誤解析）這種曾被
  // 「zho>=1 就算過」放過（Judg/Phlm），故改為要求 zho.count === eng.count。
  const pass = zh.ok && en.ok && zh.count === en.count;
  if (!pass) failed++;
  const tag = pass ? 'OK  ' : 'FAIL';
  const detail = pass
    ? `zho=${zh.count} eng=${en.count}`
    : `zho=${zh.count}(${zh.reason}) eng=${en.count}(${en.reason})${zh.count !== en.count ? ' 節數不一致' : ''}`;
  console.log(`  ${tag}  ${b.osis.padEnd(8)} ${ref.padEnd(16)} ${detail}`);
}

console.log(`\n=== ${books.length - failed}/${books.length} 卷通過${failed ? `，${failed} 卷失敗` : '' } ===`);
process.exit(failed ? 1 : 0);
