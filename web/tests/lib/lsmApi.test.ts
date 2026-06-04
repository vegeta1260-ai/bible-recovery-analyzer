import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRecoveryText, buildLsmChapterRef, __resetLsmCache, type RecoveryResult } from '@/lib/lsmApi';

describe('buildLsmChapterRef', () => {
  it('單字英文書名：原樣 + 章號', () => {
    expect(buildLsmChapterRef('Gen', 'Genesis', 1, 50)).toBe('Genesis.1');
    expect(buildLsmChapterRef('John', 'John', 3, 21)).toBe('John.3');
  });

  it('含空格英文書名：去空格（LSM 不接受空格）', () => {
    expect(buildLsmChapterRef('2Pet', '2 Peter', 1, 3)).toBe('2Peter.1');
    expect(buildLsmChapterRef('1Cor', '1 Corinthians', 5, 16)).toBe('1Corinthians.5');
  });

  it('LSM 書名特例：用 override 簡稱', () => {
    expect(buildLsmChapterRef('Song', 'Song of Solomon', 1, 8)).toBe('SoS.1'); // 去空格仍查無
    expect(buildLsmChapterRef('Prov', 'Proverbs', 1, 31)).toBe('Prv.1');       // 中文模式只認 Prv
    expect(buildLsmChapterRef('Ezek', 'Ezekiel', 1, 48)).toBe('Ezk.1');        // 中文模式只認 Ezk
    expect(buildLsmChapterRef('Mark', 'Mark', 1, 16)).toBe('Mrk.1');           // 中文模式只認 Mrk
  });

  it('單章書：用範圍 .1-99 取整章（避免被當第 1 節）', () => {
    expect(buildLsmChapterRef('Jude', 'Jude', 1, 1)).toBe('Jude.1-99');
    expect(buildLsmChapterRef('3John', '3 John', 1, 1)).toBe('3John.1-99'); // 去空格 + 範圍
    expect(buildLsmChapterRef('Obad', 'Obadiah', 1, 1)).toBe('Obadiah.1-99');
  });
});

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

  it('filters out LSM "No such" placeholder verses', async () => {
    // LSM 對查不到的書/節仍回 200 + 文字佔位（中英皆以 "No such" 開頭）。
    // 單章書用 .1-99 大上界取整章時，超界尾節都是此佔位，必須濾掉而非當經文塞入。
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const lang = new URL(input as string).searchParams.get('Lang');
      const body = lang === 'eng'
        ? { verses: [
            { ref: 'Jude 1:1', text: 'Jude, a slave of Jesus Christ' },
            { ref: 'Jude 1:2', text: 'No such verse in Jude 1' },
          ] }
        : { verses: [
            { ref: '猶 1:1', text: '耶穌基督的奴僕，雅各的弟兄猶大' },
            { ref: '猶 1:2', text: 'No such verse in 猶 1' },
          ] };
      return new Response(JSON.stringify(body), { status: 200 });
    });

    const result = await fetchRecoveryText('Jude.1-99');
    expect(result.verses.length).toBe(1); // 佔位節被濾掉，只剩真實的第 1 節
    expect(result.verses[0].text).toBe('耶穌基督的奴僕，雅各的弟兄猶大');
    expect(result.verses[0].textEn).toBe('Jude, a slave of Jesus Christ');
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
