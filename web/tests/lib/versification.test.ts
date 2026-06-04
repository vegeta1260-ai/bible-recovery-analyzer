import { describe, it, expect } from 'vitest';
import { recoveryVerseToOrigSlots, chapterTitleSlots } from '../../src/lib/versification';
import data from '../../src/data/versification.json';

describe('recoveryVerseToOrigSlots', () => {
  it('詩篇題注 offset：恢復本 v → 原文 v+offset', () => {
    expect(recoveryVerseToOrigSlots('Ps', 3, 1)).toEqual([2]);   // Ps3 offset 1（題注1節）
    expect(recoveryVerseToOrigSlots('Ps', 3, 8)).toEqual([9]);
    expect(recoveryVerseToOrigSlots('Ps', 51, 1)).toEqual([3]);  // Ps51 offset 2（題注2節）
  });

  it('3John 末節合併：恢復本 v14 → 原文 [14,15]', () => {
    expect(recoveryVerseToOrigSlots('3John', 1, 14)).toEqual([14, 15]);
    expect(recoveryVerseToOrigSlots('3John', 1, 1)).toEqual([1]); // 其餘節不變
  });

  it('無分節差異的卷章：恢復本節號即原文 slot', () => {
    expect(recoveryVerseToOrigSlots('John', 3, 16)).toEqual([16]);
    expect(recoveryVerseToOrigSlots('Gen', 1, 1)).toEqual([1]);
  });

  it('review 章（尚未定對映）：維持原行為', () => {
    // Num.16 在掃描中標為 review，暫不調整
    expect(recoveryVerseToOrigSlots('Num', 16, 1)).toEqual([1]);
  });
});

describe('chapterTitleSlots', () => {
  it('offset 章回題注 slot（原文前 offset 節）', () => {
    expect(chapterTitleSlots('Ps', 3)).toEqual([1]);
    expect(chapterTitleSlots('Ps', 51)).toEqual([1, 2]);
  });
  it('非 offset 章回空', () => {
    expect(chapterTitleSlots('John', 3)).toEqual([]);
    expect(chapterTitleSlots('3John', 1)).toEqual([]);
  });
});

describe('versification.json 資料健全性', () => {
  it('每個條目 type 合法且欄位齊全', () => {
    for (const [osis, chs] of Object.entries(data as Record<string, Record<string, any>>)) {
      for (const [ch, e] of Object.entries(chs)) {
        expect(['offset', 'merge', 'review'], `${osis}.${ch}`).toContain(e.type);
        if (e.type === 'offset') expect(typeof e.recToOrig, `${osis}.${ch}`).toBe('number');
        if (e.type === 'merge') expect(typeof e.merges, `${osis}.${ch}`).toBe('object');
      }
    }
  });
});
