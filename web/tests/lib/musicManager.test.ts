import { describe, it, expect, vi } from 'vitest';

// musicManager 頂層 import howler（需 AudioContext，jsdom 無），mock 掉以純測 getBookType。
vi.mock('howler', () => ({ Howl: class { play() {} fade() {} stop() {} volume() { return 0; } } }));

import { getBookType } from '@/audio/musicManager';

describe('getBookType', () => {
  it('五經 / 福音書 / 啟示錄等對到正確書卷類型', () => {
    expect(getBookType('Gen')).toBe('pentateuch');
    expect(getBookType('Deut')).toBe('pentateuch');
    expect(getBookType('Matt')).toBe('gospel');
    expect(getBookType('John')).toBe('gospel');
    expect(getBookType('Rev')).toBe('apocalypse');
  });

  it('未知書卷回 default', () => {
    expect(getBookType('NOPE')).toBe('default');
    expect(getBookType('')).toBe('default');
  });
});
