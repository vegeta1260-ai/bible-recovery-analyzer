import { describe, it, expect, beforeAll, vi } from 'vitest';
import { getVerseTokens, lookupStrongs, lookupWord, lookupLemma, loadBookTokens, foldOriginal } from '@/lib/analyzer';

// Pre-load test books so async tests work against real data
beforeAll(async () => {
  // loadBookTokens will fetch from public/data/tokens/ — in test env it falls back to empty
  // So we mock the fetch to return data from the JSON files
});

// Note: getVerseTokens, lookupWord, lookupLemma are now async (they load per-book JSON dynamically)
// In test environment without a server, they return empty arrays since fetch fails.
// We test lookupStrongs (sync, uses bundled lexicon.json) and verify async APIs don't throw.

describe('lookupStrongs', () => {
  it('finds G3056 lexicon entry', () => {
    const entry = lookupStrongs('G3056');
    expect(entry).not.toBeNull();
    expect(entry!.lemma).toBe('λόγος');
    expect(entry!.language).toBe('Greek');
  });

  it('finds H430 lexicon entry', () => {
    const entry = lookupStrongs('H430');
    expect(entry).not.toBeNull();
    expect(entry!.language).toBe('Hebrew');
  });

  it('returns null for unknown ID', () => {
    expect(lookupStrongs('G99999')).toBeNull();
  });

  it('normalizes strongs with leading zeros', () => {
    const entry = lookupStrongs('G0001');
    expect(entry).not.toBeNull();
    expect(entry!.strongs).toBe('G1');
  });
});

describe('foldOriginal（原文寬鬆比對：忽略母音點/重音）', () => {
  it('希伯來文帶母音點與無點折疊相同', () => {
    expect(foldOriginal('בָּרָא')).toBe(foldOriginal('ברא'));
    expect(foldOriginal('אֱלֹהִים')).toBe(foldOriginal('אלהים'));
  });
  it('去除詞綴分隔「/」與重音', () => {
    expect(foldOriginal('בְּ/רֵאשִׁ֖ית')).toBe(foldOriginal('בראשית'));
  });
  it('希臘文帶重音與無重音折疊相同', () => {
    expect(foldOriginal('θεός')).toBe(foldOriginal('θεος'));
    expect(foldOriginal('λόγος')).toBe(foldOriginal('ΛΟΓΟΣ'.toLowerCase()));
  });
});

describe('async token APIs', () => {
  it('getVerseTokens returns array (empty in test env without server)', async () => {
    const tokens = await getVerseTokens('John.1.1');
    expect(Array.isArray(tokens)).toBe(true);
  });

  it('lookupWord returns array', async () => {
    const results = await lookupWord('λόγος');
    expect(Array.isArray(results)).toBe(true);
  });

  it('lookupLemma returns array', async () => {
    const results = await lookupLemma('λόγος');
    expect(Array.isArray(results)).toBe(true);
  });

  // 回歸：字詞/Lemma 搜尋過去只掃 bookTokenCache（剛進站為空）→ 搜零本書 → 「沒反應」。
  // 現在固定掃全 66 卷；此處用 mock fetch 計次驗證確實嘗試載入多卷。
  it('lookupWord scans all books even with empty cache (regression)', async () => {
    const calls: string[] = [];
    const orig = globalThis.fetch;
    // 回傳 ok:false 使每卷得 [] 不快取、不早退 → 應遍歷全部書卷
    globalThis.fetch = vi.fn(async (url: any) => {
      calls.push(String(url));
      return { ok: false } as Response;
    });
    await lookupWord('zzz-不存在的字-zzz');
    globalThis.fetch = orig;
    expect(calls.length).toBeGreaterThanOrEqual(60);
  });
});
