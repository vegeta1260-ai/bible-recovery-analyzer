import { describe, it, expect } from 'vitest';
import { normalizeRef, splitOsisRange } from '@/lib/reference';

describe('normalizeRef', () => {
  it('parses Chinese book name + chapter:verse', () => {
    expect(normalizeRef('約1:1')).toBe('John.1.1');
  });

  it('parses English book name', () => {
    expect(normalizeRef('John1:1')).toBe('John.1.1');
  });

  it('parses range', () => {
    expect(normalizeRef('約1:1-3')).toBe('John.1.1-3');
  });

  it('parses book with space', () => {
    expect(normalizeRef('1 Cor1:1')).toBe('1Cor.1.1');
  });

  it('throws on invalid format', () => {
    expect(() => normalizeRef('invalid')).toThrow('無法解析經文格式');
  });

  it('throws on unknown book', () => {
    expect(() => normalizeRef('虛構1:1')).toThrow('不支援的書卷');
  });
});

describe('splitOsisRange', () => {
  it('returns single ref for non-range', () => {
    expect(splitOsisRange('John.1.1')).toEqual(['John.1.1']);
  });

  it('expands range into individual refs', () => {
    expect(splitOsisRange('John.1.1-3')).toEqual([
      'John.1.1',
      'John.1.2',
      'John.1.3',
    ]);
  });

  // 反向範圍過去回空陣列，導致下游 TypeError 裸露給使用者 → 現在擲出友善錯誤
  it('throws on reversed range (e.g. 創1:5-2)', () => {
    expect(() => splitOsisRange('Gen.1.5-2')).toThrow('結束節不可小於起始節');
  });

  it('throws on range exceeding 30 verses', () => {
    expect(() => splitOsisRange('Ps.119.1-40')).toThrow('範圍過大');
  });

  it('allows range of exactly 30 verses', () => {
    expect(splitOsisRange('Ps.119.1-30')).toHaveLength(30);
  });
});
