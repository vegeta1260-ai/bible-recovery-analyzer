import { describe, it, expect } from 'vitest';
import { transliterationToZhuyinLike } from '@/lib/pronunciation';

describe('transliterationToZhuyinLike', () => {
  it('converts Hebrew bereshit', () => {
    const result = transliterationToZhuyinLike('bereshit', 'Hebrew');
    expect(result).toContain('ㄅ');
    expect(result).toContain('ㄕ');
  });
  it('converts Greek logos', () => {
    const result = transliterationToZhuyinLike('logos', 'Greek');
    expect(result).toContain('ㄌ');
    expect(result).toContain('ㄙ');
  });
  it('converts Greek theos', () => {
    const result = transliterationToZhuyinLike('theos', 'Greek');
    expect(result).toContain('ㄙ');
  });
  it('handles multi-char rules before single-char', () => {
    const result = transliterationToZhuyinLike('sh', 'Hebrew');
    expect(result).toBe('ㄕ');
  });
});
