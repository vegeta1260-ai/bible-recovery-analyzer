import { describe, it, expect, vi } from 'vitest';
import { getVerseTokens, lookupWord, lookupLemma, foldOriginal } from '@/lib/analyzer';

// Note: getVerseTokens, lookupWord, lookupLemma are async (they load per-book JSON dynamically)
// In test environment without a server, they return empty arrays since fetch fails.
// We verify async APIs don't throw and test the pure helpers.

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
