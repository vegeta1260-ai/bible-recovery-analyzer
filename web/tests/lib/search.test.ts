import { describe, it, expect } from 'vitest';
import { search } from '@/lib/search';

// search is now async (loads per-book JSON dynamically)
// In test env without server, loadBookTokens returns empty, so search returns empty.
// We test that the API doesn't throw and returns correct structure.

describe('search', () => {
  it('returns SearchResult structure', async () => {
    const result = await search('test');
    expect(result).toHaveProperty('query', 'test');
    expect(result).toHaveProperty('refs');
    expect(result).toHaveProperty('matchedLemmas');
    expect(result).toHaveProperty('matchedStrongs');
    expect(Array.isArray(result.refs)).toBe(true);
  });

  it('returns empty for no match', async () => {
    const result = await search('xyznonexistent');
    expect(result.refs).toEqual([]);
  });

  it('preserves query string', async () => {
    const result = await search('  hello  ');
    expect(result.query).toBe('hello');
  });
});
