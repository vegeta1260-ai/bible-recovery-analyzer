import { scanBooks, type Token } from '@/lib/analyzer';
import bookMapData from '@/data/bookMap.json';

type BookEntry = { osis: string };
const allBooks = (bookMapData as BookEntry[]).map(b => b.osis);

export interface SearchResult {
  query: string;
  refs: string[];
  matchedLemmas: string[];
  matchedStrongs: string[];
}

export async function search(
  query: string,
  book?: string,
  onProgress?: (scanned: number, total: number) => void,
): Promise<SearchResult> {
  const q = query.trim();
  const qUpper = q.toUpperCase();
  const booksToSearch = book ? [book] : allBooks;
  const matched: Token[] = [];

  // 有限並行掃卷（上限 4），滿 500 筆即不再排新卷
  await scanBooks(booksToSearch, (tokens) => {
    for (const t of tokens) {
      if (
        t.verse_ref.includes(q) || t.surface_form.includes(q) ||
        t.lemma.includes(q) || t.strongs_primary.includes(qUpper) ||
        t.analytical_code_raw.includes(qUpper)
      ) {
        matched.push(t);
      }
    }
    return matched.length >= 500;
  }, onProgress);

  const refs = [...new Set(matched.map((t) => t.verse_ref))].sort().slice(0, 100);
  const matchedLemmas = [...new Set(matched.map((t) => t.lemma))].sort().slice(0, 100);
  const matchedStrongs = [...new Set(matched.map((t) => t.strongs_primary))].filter(Boolean).sort().slice(0, 100);

  return { query: q, refs, matchedLemmas, matchedStrongs };
}
