import bookMapData from '@/data/bookMap.json';

type BookEntry = { osis: string; english: string; zh: string; aliases: string[] };
const bookMap = bookMapData as BookEntry[];

const bookAliases: Record<string, string> = {};
for (const row of bookMap) {
  for (const alias of row.aliases) {
    bookAliases[alias.replace(/ /g, '').toLowerCase()] = row.osis;
  }
}

const REF_PATTERN = /^([\u4e00-\u9fa5A-Za-z0-9 ]+)(\d+):(\d+)(?:-(\d+))?$/;

export function normalizeRef(ref: string): string {
  const text = ref.trim();
  const m = text.match(REF_PATTERN);
  if (!m) {
    throw new Error('無法解析經文格式，請使用如 創1:1 或 John1:1-3');
  }
  const [, bookRaw, chapter, verseStart, verseEnd] = m;
  const key = bookRaw.replace(/ /g, '').toLowerCase();
  const osis = bookAliases[key];
  if (!osis) {
    throw new Error(`不支援的書卷：${bookRaw}`);
  }
  if (verseEnd) {
    return `${osis}.${chapter}.${verseStart}-${verseEnd}`;
  }
  return `${osis}.${chapter}.${verseStart}`;
}

// 單次展開上限：每節都會對 LSM API 發 runtime 請求，範圍過大應改走逐章研經頁。
const MAX_RANGE_VERSES = 30;

export function splitOsisRange(osisRef: string): string[] {
  if (!osisRef.includes('-')) {
    return [osisRef];
  }
  const [left, end] = osisRef.split('-');
  const parts = left.split('.');
  const start = parseInt(parts[2], 10);
  const stop = parseInt(end, 10);
  if (Number.isNaN(start) || Number.isNaN(stop)) {
    throw new Error('無法解析經文範圍，請使用如 創1:1-5');
  }
  if (stop < start) {
    throw new Error('經文範圍的結束節不可小於起始節，請確認輸入，如 創1:1-5');
  }
  if (stop - start + 1 > MAX_RANGE_VERSES) {
    throw new Error(`一次最多查詢 ${MAX_RANGE_VERSES} 節，範圍過大；請縮小範圍，或改用逐章研經頁瀏覽整章`);
  }
  const refs: string[] = [];
  for (let v = start; v <= stop; v++) {
    refs.push(`${parts[0]}.${parts[1]}.${v}`);
  }
  return refs;
}
