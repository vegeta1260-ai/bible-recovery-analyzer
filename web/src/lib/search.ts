import { loadBookTokens, type Token } from '@/lib/analyzer';
import bookMapData from '@/data/bookMap.json';

type BookEntry = { osis: string };
const allBooks = (bookMapData as BookEntry[]).map(b => b.osis);

export interface SearchResult {
  query: string;
  refs: string[];
  matchedLemmas: string[];
  matchedStrongs: string[];
}

export async function search(query: string, book?: string): Promise<SearchResult> {
  const q = query.trim();
  const qUpper = q.toUpperCase();
  const booksToSearch = book ? [book] : allBooks;
  const matched: Token[] = [];

  for (const b of booksToSearch) {
    let tokens: Token[];
    try {
      tokens = await loadBookTokens(b);
    } catch {
      continue;
    }
    if (tokens.length === 0) continue;

    for (const t of tokens) {
      if (
        t.verse_ref.includes(q) || t.surface_form.includes(q) ||
        t.lemma.includes(q) || t.strongs_primary.includes(qUpper) ||
        t.analytical_code_raw.includes(qUpper)
      ) {
        matched.push(t);
      }
    }
    if (matched.length >= 500) break;
  }

  const refs = [...new Set(matched.map((t) => t.verse_ref))].sort().slice(0, 100);
  const matchedLemmas = [...new Set(matched.map((t) => t.lemma))].sort().slice(0, 100);
  const matchedStrongs = [...new Set(matched.map((t) => t.strongs_primary))].filter(Boolean).sort().slice(0, 100);

  return { query: q, refs, matchedLemmas, matchedStrongs };
}
