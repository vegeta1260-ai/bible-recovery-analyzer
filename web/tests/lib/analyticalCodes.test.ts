import { describe, it, expect } from 'vitest';
import { parseAnalyticalCode } from '@/lib/analyticalCodes';

describe('parseAnalyticalCode', () => {
  it('expands N-NOM-SG-MASC', () => {
    const result = parseAnalyticalCode('N-NOM-SG-MASC');
    expect(result.code).toBe('N-NOM-SG-MASC');
    expect(result.expanded.N).toBe('Noun / 名詞');
    expect(result.expanded.NOM).toBe('Nominative 主格');
    expect(result.expanded.SG).toBe('Singular 單數');
    expect(result.expanded.MASC).toBe('Masculine 陽性');
  });
  it('handles M/P merged code', () => {
    const result = parseAnalyticalCode('V-PRES-IMP-2-SG-M/P');
    expect(result.expanded['M/P']).toBe('Middle/Passive merged / 中被動合併');
  });
  it('marks unknown parts', () => {
    const result = parseAnalyticalCode('N-UNKNOWN');
    expect(result.expanded.UNKNOWN).toBe('unknown');
  });
  it('includes methodology note', () => {
    const result = parseAnalyticalCode('N-NOM');
    expect(result.methodologyNote).toContain('form-first');
  });
  it('includes full legend', () => {
    const result = parseAnalyticalCode('N-NOM');
    expect(Object.keys(result.legend).length).toBeGreaterThan(30);
  });
});
