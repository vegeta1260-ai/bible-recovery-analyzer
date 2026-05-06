import tokensData from '@/data/tokens.json';
import lexiconData from '@/data/lexicon.json';
import { normalizeStrongs } from '@/lib/strongs';

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

const tokens = tokensData as Token[];
const lexicon = lexiconData as LexiconEntry[];

export function getVerseTokens(osisRef: string): Token[] {
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

export function lookupWord(query: string): Token[] {
  const q = query.trim();
  return tokens
    .filter((t) =>
      t.surface_form === q || t.normalized_form === q ||
      t.lemma === q || t.pronunciation_transliteration === q
    )
    .sort((a, b) => a.verse_ref.localeCompare(b.verse_ref) || a.token_order - b.token_order)
    .slice(0, 80);
}

export function lookupLemma(lemma: string): Token[] {
  return tokens
    .filter((t) => t.lemma === lemma)
    .sort((a, b) => a.verse_ref.localeCompare(b.verse_ref) || a.token_order - b.token_order)
    .slice(0, 80);
}
