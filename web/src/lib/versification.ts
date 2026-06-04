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
