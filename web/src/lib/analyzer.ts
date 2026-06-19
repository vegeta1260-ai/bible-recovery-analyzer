import lexiconData from '@/data/lexicon.json';
import bookMap from '@/data/bookMap.json';
import { normalizeStrongs } from '@/lib/strongs';

// 全部書卷 OSIS（正典順序）。字詞/Lemma 搜尋預設掃全 66 卷——
// 不可只掃 bookTokenCache（剛進站時為空，會導致搜尋「沒反應」）。
const ALL_BOOKS: string[] = (bookMap as { osis: string }[]).map((b) => b.osis);

// 原文寬鬆比對：去除希伯來母音點/重音（U+0591–U+05C7）與希臘重音/氣號（NFD 後的組合符
// U+0300–U+036F），以及詞綴分隔「/」與空白，轉小寫。讓使用者帶不帶這些符號都能命中。
export function foldOriginal(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[֑-ׇ̀-ͯ]/g, '')
    .replace(/[/\s]/g, '')
    .toLowerCase();
}

export interface Token {
  verse_ref: string;
  token_order: number;
  surface_form: string;
  normalized_form: string;
  lemma: string;
  strongs_primary: string;
  strongs_secondary: string | null;
  analytical_code_raw: string;
  part_of_speech: string;
  morphology_features: Record<string, string>;
  literal_gloss_en: string;
  translation_note_zh: string;
  recovery_alignment_note: string;
  pronunciation_transliteration: string;
  pronunciation_bopomofo: string;
  source_layer: string;
  verse_usage: string;
  grammar_explanation: string;
  is_ot_quote: boolean;
}

export interface LexiconEntry {
  strongs: string;
  normalized_strongs: string;
  lemma: string;
  language: string;
  transliteration: string;
  pronunciation_bopomofo: string;
  short_definition: string;
  literal_gloss_en: string;
  common_inflections: string[];
  analytical_notes: string[];
}

const lexicon = lexiconData as LexiconEntry[];

// --- Compressed token key mapping ---
interface CompressedToken {
  r: string;    // verse_ref
  o: number;    // token_order
  s: string;    // surface_form
  n: string;    // normalized_form
  l: string;    // lemma
  ac: string;   // analytical_code_raw
  pos: string;  // part_of_speech
  mf: Record<string, string>; // morphology_features
  st?: string;  // strongs_primary
  st2?: string; // strongs_secondary
  ge?: string;  // literal_gloss_en
  zh?: string;  // translation_note_zh
  ra?: string;  // recovery_alignment_note
  tr?: string;  // pronunciation_transliteration
  bp?: string;  // pronunciation_bopomofo
  sl?: string;  // source_layer
  vu?: string;  // verse_usage
  gx?: string;  // grammar_explanation
  oq?: boolean; // is_ot_quote
}

function expandToken(c: CompressedToken): Token {
  return {
    verse_ref: c.r,
    token_order: c.o,
    surface_form: c.s,
    normalized_form: c.n,
    lemma: c.l,
    strongs_primary: c.st || '',
    strongs_secondary: c.st2 || null,
    analytical_code_raw: c.ac,
    part_of_speech: c.pos,
    morphology_features: c.mf,
    literal_gloss_en: c.ge || '',
    translation_note_zh: c.zh || '',
    recovery_alignment_note: c.ra || '',
    pronunciation_transliteration: c.tr || '',
    pronunciation_bopomofo: c.bp || '',
    source_layer: c.sl || 'SBLGNT|MorphGNT',
    verse_usage: c.vu || '',
    grammar_explanation: c.gx || '',
    is_ot_quote: c.oq || false,
  };
}

// --- IndexedDB cache ---
const DB_NAME = 'bible-tokens';
const DB_VERSION = 1;
const STORE_NAME = 'books';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCached(book: string): Promise<Token[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(book);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCache(book: string, tokens: Token[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(tokens, book);
  } catch {
    // silently ignore cache errors
  }
}

// --- Per-book loading ---
const BASE = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
  ? import.meta.env.BASE_URL.replace(/\/$/, '')
  : '';

const bookTokenCache = new Map<string, Token[]>();

export async function loadBookTokens(book: string): Promise<Token[]> {
  // Memory cache first
  if (bookTokenCache.has(book)) {
    return bookTokenCache.get(book)!;
  }

  // IndexedDB cache second
  const cached = await getCached(book);
  if (cached) {
    bookTokenCache.set(book, cached);
    return cached;
  }

  // Fetch from server
  try {
    const resp = await fetch(`${BASE}/data/tokens/${book}.json`);
    if (!resp.ok) return [];
    const compressed: CompressedToken[] = await resp.json();
    const tokens = compressed.map(expandToken);
    bookTokenCache.set(book, tokens);
    await setCache(book, tokens);
    return tokens;
  } catch {
    return [];
  }
}

// --- Public API (now async for book loading) ---

export async function getVerseTokens(osisRef: string): Promise<Token[]> {
  const book = osisRef.split('.')[0];
  const tokens = await loadBookTokens(book);
  return tokens
    .filter((t) => t.verse_ref === osisRef)
    .sort((a, b) => a.token_order - b.token_order);
}

export function lookupStrongs(rawId: string): LexiconEntry | null {
  try {
    const sid = normalizeStrongs(rawId);
    return lexicon.find((e) => e.normalized_strongs === sid) ?? null;
  } catch {
    return null;
  }
}

export async function lookupWord(query: string, book?: string): Promise<Token[]> {
  const q = query.trim();
  const fq = foldOriginal(q);          // 寬鬆比對鍵（忽略母音點/重音）
  const tq = q.toLowerCase();          // 音譯（拉丁字母）比對
  const books = book ? [book] : ALL_BOOKS;
  const results: Token[] = [];
  for (const b of books) {
    const tokens = await loadBookTokens(b);
    results.push(...tokens.filter((t) =>
      foldOriginal(t.surface_form) === fq ||
      foldOriginal(t.normalized_form) === fq ||
      foldOriginal(t.lemma) === fq ||
      (t.pronunciation_transliteration || '').toLowerCase() === tq
    ));
    if (results.length >= 80) break;
  }
  return results
    .sort((a, b) => a.verse_ref.localeCompare(b.verse_ref) || a.token_order - b.token_order)
    .slice(0, 80);
}

export async function lookupLemma(lemma: string, book?: string): Promise<Token[]> {
  const fq = foldOriginal(lemma.trim());   // 寬鬆比對（忽略母音點/重音）
  const books = book ? [book] : ALL_BOOKS;
  const results: Token[] = [];
  for (const b of books) {
    const tokens = await loadBookTokens(b);
    results.push(...tokens.filter((t) => foldOriginal(t.lemma) === fq));
    if (results.length >= 80) break;
  }
  return results
    .sort((a, b) => a.verse_ref.localeCompare(b.verse_ref) || a.token_order - b.token_order)
    .slice(0, 80);
}
