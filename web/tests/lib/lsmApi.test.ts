import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRecoveryText, __resetLsmCache, type RecoveryResult } from '@/lib/lsmApi';

const mockResponse = {
  verses: [{ ref: 'John 1:1', text: 'In the beginning was the Word...' }],
  inputstring: 'John 1:1',
  detected: 'verse',
  message: '',
  copyright: 'Copyright LSM',
};

describe('fetchRecoveryText', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetLsmCache(); // 清掉去重/成功快取，避免測試間以相同 ref 互相污染
  });

  it('fetches both zho and eng with correct params', async () => {
    // 每次回全新 Response：中英並行會各讀一次 body，共用同一物件會 double-read 失敗。
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    await fetchRecoveryText('John 1:1');

    expect(fetchSpy).toHaveBeenCalledTimes(2); // 中英各一次
    const langs = fetchSpy.mock.calls
      .map((c) => new URL(c[0] as string).searchParams.get('Lang'))
      .sort();
    expect(langs).toEqual(['eng', 'zho']);
    for (const c of fetchSpy.mock.calls) {
      const url = new URL(c[0] as string);
      expect(url.origin + url.pathname).toBe('https://api.lsm.org/recver/txo.php');
      expect(url.searchParams.get('String')).toBe('John 1:1');
      expect(url.searchParams.get('Out')).toBe('json');
    }
  });

  it('merges zho (primary) with English per verse', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const lang = new URL(input as string).searchParams.get('Lang');
      const body = lang === 'eng'
        ? { verses: [{ ref: 'John 1:1', text: 'In the beginning was the Word' }], copyright: 'LSM EN' }
        : { verses: [{ ref: '約 1:1', text: '太初有話' }], copyright: '恢復本聖經' };
      return new Response(JSON.stringify(body), { status: 200 });
    });

    const result = await fetchRecoveryText('John 1:1');
    expect(result.verses.length).toBe(1);
    expect(result.verses[0].text).toBe('太初有話');               // 中文為主
    expect(result.verses[0].textEn).toBe('In the beginning was the Word'); // 英文逐節併入
    expect(result.copyright).toBe('恢復本聖經');                  // 版權取中文
  });

  it('returns error result on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await fetchRecoveryText('John 1:1');
    expect(result.error).toBe(true);
    expect(result.errorMessage).toContain('Network error');
  });

  it('returns error result on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Server Error', { status: 500 })
    );

    const result = await fetchRecoveryText('John 1:1');
    expect(result.error).toBe(true);
  });

  it('retries each language once on transient failure', async () => {
    const attempts: Record<string, number> = { zho: 0, eng: 0 };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const lang = new URL(input as string).searchParams.get('Lang')!;
      attempts[lang]++;
      if (attempts[lang] === 1) throw new Error('timeout'); // 每語言第一次失敗
      return new Response(JSON.stringify(mockResponse), { status: 200 });
    });

    const result = await fetchRecoveryText('John 1:1');
    expect(result.error).toBeFalsy();
    expect(attempts.zho).toBe(2); // 失敗一次 + 重試成功
    expect(attempts.eng).toBe(2);
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });
});
