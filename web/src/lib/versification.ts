// 原文（OSHB/MorphGNT）↔ 恢復本 分節對映。
// 逐章頁的恢復本 slot 以「原文節號」建立；ChapterRecovery 取回的是「恢復本節號」。
// 當兩套分節不一致時，直接同號填入會錯位（詩篇希伯來題注最嚴重）。
// 本模組把「恢復本節號」轉成「應填入的原文 slot 節號」。
// 對映資料由 scripts/scan-versification.mjs 掃描全經產出 versification.json。
import data from '../data/versification.json';

type OffsetEntry = { type: 'offset'; recToOrig: number };
type MergeEntry = { type: 'merge'; merges: Record<string, number[]> };
type ReviewEntry = { type: 'review'; origMax: number; recMax: number };
type Entry = OffsetEntry | MergeEntry | ReviewEntry;

const table = data as Record<string, Record<string, Entry>>;

// 新約少數章：恢復本（英文傳統）比原文（SBLGNT/MorphGNT）多節——章末長句拆兩節、
// 頌讚位置、pericope adulterae 開頭等。Copenhagen eng.json（希伯來 OT 基準）未涵蓋，
// 故手動對映「恢復本節 → 原文 slot」；多節對同 slot 者由 ChapterRecovery 合併顯示。
const NT_REMAP: Record<string, Record<number, Record<number, number>>> = {
  Acts: { 19: { 41: 40 } },                 // 希臘 Acts 19:40 = 英文 19:40+41
  '2Cor': { 13: { 13: 12, 14: 13 } },       // 希臘 13:12=英文12+13；希臘 13:13=英文14
  John: { 7: { 53: 52 } },                  // 7:53（pericope adulterae 開頭）原文正文無
  // Rom 16:25-27（頌讚，原文古卷多無）：改為補空 slot 各自分行（見 [chapter].astro
  // 的 extraVerses），故此處不再併入 16:24，恢復本 25-27 以同號填入補出的 slot。
};

function entryOf(osis: string, chapter: number): Entry | undefined {
  return table[osis]?.[String(chapter)];
}

/**
 * 給定恢復本節號，回傳「應填入的原文 slot 節號」（可能多格，如末節合併）。
 * - offset（詩篇題注）：恢復本 vN → 原文 v(N + recToOrig)。
 * - merge（3John 末節）：恢復本 v14 → 原文 [14,15]。
 * - review / 無對映：維持原行為（同號），暫不調整（待後續逐章定對映）。
 */
export function recoveryVerseToOrigSlots(osis: string, chapter: number, recVerse: number): number[] {
  const nt = NT_REMAP[osis]?.[chapter]?.[recVerse];
  if (nt) return [nt]; // 新約手動對映（恢復本多出的節併入指定原文 slot）
  const e = entryOf(osis, chapter);
  if (!e) return [recVerse];
  if (e.type === 'offset') return [recVerse + e.recToOrig];
  if (e.type === 'merge') return e.merges[String(recVerse)] ?? [recVerse];
  return [recVerse]; // review：尚未定對映，維持原行為
}

/**
 * 該章「題注 slot」的原文節號（offset 章被恢復本空出的前幾節，即希伯來題注）。
 * 用來在頁面標示「〔詩篇題注〕」，而非留空或填錯位經文。
 */
export function chapterTitleSlots(osis: string, chapter: number): number[] {
  const e = entryOf(osis, chapter);
  if (e?.type === 'offset') return Array.from({ length: e.recToOrig }, (_, i) => i + 1);
  return [];
}
