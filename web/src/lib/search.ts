import tokensData from '@/data/tokens.json';
import type { Token } from '@/lib/analyzer';

const tokens = tokensData as Token[];

export interface SearchResult {
  query: string;
  refs: string[];
  matchedLemmas: string[];
  matchedStrongs: string[];
}

export function search(query: string): SearchResult {
  const q = query.trim();
  const qUpper = q.toUpperCase();

  const matched = tokens.filter((t) =>
    t.verse_ref.includes(q) || t.surface_form.includes(q) ||
    t.lemma.includes(q) || t.strongs_primary.includes(qUpper) ||
    t.analytical_code_raw.includes(qUpper)
  );

  const refs = [...new Set(matched.map((t) => t.verse_ref))].sort().slice(0, 100);
  const matchedLemmas = [...new Set(matched.map((t) => t.lemma))].sort().slice(0, 100);
  const matchedStrongs = [...new Set(matched.map((t) => t.strongs_primary))].sort().slice(0, 100);

  return { query: q, refs, matchedLemmas, matchedStrongs };
}
