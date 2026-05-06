import { describe, it, expect } from 'vitest';
import { normalizeStrongs } from '@/lib/strongs';

describe('normalizeStrongs', () => {
  it('normalizes G3056', () => { expect(normalizeStrongs('G3056')).toBe('G3056'); });
  it('strips leading zeros', () => { expect(normalizeStrongs('G0076')).toBe('G76'); });
  it('handles special normalization G3056A -> G3056', () => { expect(normalizeStrongs('G3056A')).toBe('G3056'); });
  it('handles H430A -> H430', () => { expect(normalizeStrongs('H430A')).toBe('H430'); });
  it('is case-insensitive', () => { expect(normalizeStrongs('g3056')).toBe('G3056'); });
  it('strips curly quotes', () => { expect(normalizeStrongs("G\u20183056\u2019")).toBe('G3056'); });
  it('throws on invalid ID', () => { expect(() => normalizeStrongs('X999')).toThrow('Invalid'); });
});
