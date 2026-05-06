import { describe, it, expect } from 'vitest';
import { resolveEffect, EFFECT_RULES } from '@/effects/MiracleEffectRouter';
import type { MiracleContext } from '@/effects/MiracleEffectRouter';

const PNEUMA = '\u03C0\u03BD\u03B5\u03C5\u03BC\u03B1';

function ctx(book: string, ref: string, normalizedForms: string[] = []): MiracleContext {
  return { book, ref, normalizedForms };
}

describe('resolveEffect — book-level rules', () => {
  it('Gen → genesis-light (first Gen rule)', () => {
    expect(resolveEffect(ctx('Gen', 'Gen.1.1'))).toBe('genesis-light');
  });

  it('Exod → parting-waters', () => {
    expect(resolveEffect(ctx('Exod', 'Exod.14.21'))).toBe('parting-waters');
  });

  it('Ps → cosmic-firmament', () => {
    expect(resolveEffect(ctx('Ps', 'Ps.8.3'))).toBe('cosmic-firmament');
  });

  it('Acts → pentecost-flames', () => {
    expect(resolveEffect(ctx('Acts', 'Acts.2.3'))).toBe('pentecost-flames');
  });

  it('Rev → tree-of-life', () => {
    expect(resolveEffect(ctx('Rev', 'Rev.22.2'))).toBe('tree-of-life');
  });
});

describe('resolveEffect — chapter-level rules', () => {
  it('Matt.28 → resurrection-quake', () => {
    expect(resolveEffect(ctx('Matt', 'Matt.28.1'))).toBe('resurrection-quake');
  });

  it('John.20 → resurrection-quake', () => {
    expect(resolveEffect(ctx('John', 'John.20.1'))).toBe('resurrection-quake');
  });

  it('Mark.16 → resurrection-quake', () => {
    expect(resolveEffect(ctx('Mark', 'Mark.16.6'))).toBe('resurrection-quake');
  });

  it('Luke.24 → resurrection-quake', () => {
    expect(resolveEffect(ctx('Luke', 'Luke.24.1'))).toBe('resurrection-quake');
  });

  it('John.1 (not resurrection chapter) → dove-descending when pneuma present', () => {
    expect(resolveEffect(ctx('John', 'John.1.32', [PNEUMA]))).toBe('dove-descending');
  });
});

describe('resolveEffect — semantic-level rules', () => {
  it('normalized pneuma form → dove-descending', () => {
    expect(resolveEffect(ctx('Rom', 'Rom.8.1', [PNEUMA]))).toBe('dove-descending');
  });

  it('no special forms in epistle → particle-text fallback', () => {
    expect(resolveEffect(ctx('Rom', 'Rom.3.23', ['αμαρτια']))).toBe('particle-text');
  });

  it('unknown book with no forms → particle-text', () => {
    expect(resolveEffect(ctx('Neh', 'Neh.8.1', []))).toBe('particle-text');
  });
});

describe('resolveEffect — default fallback', () => {
  it('any unmatched context returns particle-text', () => {
    expect(resolveEffect(ctx('1Cor', '1Cor.13.1', ['αγαπη']))).toBe('particle-text');
  });
});

describe('EFFECT_RULES — always ends with fallback', () => {
  it('last rule matches everything', () => {
    const last = EFFECT_RULES[EFFECT_RULES.length - 1];
    expect(last.match(ctx('Obad', 'Obad.1.1', []))).toBe(true);
    expect(last.effect).toBe('particle-text');
  });
});
