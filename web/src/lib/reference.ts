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

export function splitOsisRange(osisRef: string): string[] {
  if (!osisRef.includes('-')) {
    return [osisRef];
  }
  const [left, end] = osisRef.split('-');
  const parts = left.split('.');
  const start = parseInt(parts[2], 10);
  const stop = parseInt(end, 10);
  const refs: string[] = [];
  for (let v = start; v <= stop; v++) {
    refs.push(`${parts[0]}.${parts[1]}.${v}`);
  }
  return refs;
}
