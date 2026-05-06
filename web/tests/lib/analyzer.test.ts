import { describe, it, expect } from 'vitest';
import { getVerseTokens, lookupStrongs, lookupWord, lookupLemma } from '@/lib/analyzer';

describe('getVerseTokens', () => {
  it('returns tokens for John.1.1', () => {
    const tokens = getVerseTokens('John.1.1');
    expect(tokens.length).toBe(2);
    expect(tokens[0].surface_form).toBe('λόγος');
    expect(tokens[1].surface_form).toBe('θεός');
  });
  it('returns empty for unknown ref', () => {
    expect(getVerseTokens('Fake.99.99')).toEqual([]);
  });
  it('returns tokens sorted by token_order', () => {
    const tokens = getVerseTokens('Gen.1.1');
    expect(tokens[0].token_order).toBe(1);
    expect(tokens[1].token_order).toBe(2);
  });
});

describe('lookupStrongs', () => {
  it('finds G3056 lexicon entry', () => {
    const entry = lookupStrongs('G3056');
    expect(entry).not.toBeNull();
    expect(entry!.lemma).toBe('λόγος');
    expect(entry!.language).toBe('Greek');
  });
  it('returns null for unknown ID', () => {
    expect(lookupStrongs('G9999')).toBeNull();
  });
});

describe('lookupWord', () => {
  it('finds by surface form', () => {
    const results = lookupWord('λόγος');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].surface_form).toBe('λόγος');
  });
  it('finds by transliteration', () => {
    const results = lookupWord('logos');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('lookupLemma', () => {
  it('finds tokens by lemma', () => {
    const results = lookupLemma('λόγος');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].lemma).toBe('λόγος');
  });
});
