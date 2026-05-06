import { describe, it, expect } from 'vitest';
import { search } from '@/lib/search';

describe('search', () => {
  it('finds by verse ref', () => {
    const result = search('John.1.1');
    expect(result.refs).toContain('John.1.1');
  });
  it('finds by surface form', () => {
    const result = search('λόγος');
    expect(result.matchedLemmas).toContain('λόγος');
  });
  it('finds by strongs number', () => {
    const result = search('G3056');
    expect(result.matchedStrongs).toContain('G3056');
  });
  it('finds by analytical code', () => {
    const result = search('NOM');
    expect(result.refs.length).toBeGreaterThan(0);
  });
  it('returns sorted unique results', () => {
    const result = search('John');
    const sorted = [...result.refs].sort();
    expect(result.refs).toEqual(sorted);
  });
  it('returns empty for no match', () => {
    const result = search('xyznonexistent');
    expect(result.refs).toEqual([]);
  });
});
