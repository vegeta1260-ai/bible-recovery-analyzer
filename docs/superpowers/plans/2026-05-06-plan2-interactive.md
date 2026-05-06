# Plan 2: Interactive — 搜尋 + 經文結果 + Interlinear + TokenCard + /study 頁面

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作核心互動功能：搜尋框、經文結果卡片、逐字對照、研究卡，以及 `/study` 研經主頁，前端直接呼叫 LSM API 取得恢復本經文。

**Architecture:** React Islands 在 Astro 頁面中 hydrate。SearchBox 是核心入口，觸發本地 JSON 查詢 + LSM API 呼叫，結果透過 React state 流向 VerseResult → InterlinearView → TokenCard。使用骨架屏做漸進渲染（本地資料先顯示，LSM 回傳後補上恢復本經文）。

**Tech Stack:** React 19, TypeScript, Astro Islands (`client:load` / `client:visible`), LSM API (直接呼叫，已確認 CORS OK)

**Spec reference:** `docs/superpowers/specs/2026-05-06-github-pages-frontend-design.md`
**Depends on:** Plan 1 已完成（lib modules, data JSON, BaseLayout, CSS tokens）

---

## File Structure

```
web/src/
├── lib/
│   └── lsmApi.ts                          # 新增：直接呼叫 LSM API
├── components/
│   ├── islands/
│   │   ├── SearchBox.tsx                   # 新增：搜尋框 + 模式切換
│   │   ├── VerseResult.tsx                 # 新增：單節經文結果
│   │   ├── PassageResult.tsx               # 新增：段落經文結果
│   │   ├── InterlinearView.tsx             # 新增：四行對照
│   │   ├── TokenCard.tsx                   # 新增：23 欄位研究卡
│   │   └── StudyView.tsx                   # 新增：研經聚合元件
│   └── static/
│       └── SkeletonCard.astro              # 新增：骨架屏
├── pages/
│   ├── index.astro                         # 修改：加入 SearchBox
│   └── study.astro                         # 新增：研經主頁
web/tests/
└── lib/
    └── lsmApi.test.ts                      # 新增：LSM API 測試
```

---

### Task 1: lib/lsmApi.ts — LSM API 前端呼叫模組

**Files:**
- Create: `web/src/lib/lsmApi.ts`
- Create: `web/tests/lib/lsmApi.test.ts`

- [ ] **Step 1: 寫失敗測試**

建立 `web/tests/lib/lsmApi.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRecoveryText, type RecoveryResult } from '@/lib/lsmApi';

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
  });

  it('calls LSM API with correct params', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    await fetchRecoveryText('John 1:1');

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://api.lsm.org/recver/txo.php');
    expect(url.searchParams.get('String')).toBe('John 1:1');
    expect(url.searchParams.get('Out')).toBe('json');
  });

  it('parses verses from response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const result = await fetchRecoveryText('John 1:1');
    expect(result.verses.length).toBe(1);
    expect(result.verses[0].text).toContain('beginning');
    expect(result.copyright).toBe('Copyright LSM');
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

  it('retries once on failure then gives up', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

    const result = await fetchRecoveryText('John 1:1');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.error).toBeFalsy();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/lsmApi.test.ts
```

- [ ] **Step 3: 實作 lsmApi.ts**

建立 `web/src/lib/lsmApi.ts`：

```typescript
const LSM_API_URL = 'https://api.lsm.org/recver/txo.php';

export interface RecoveryVerse {
  ref: string;
  text: string;
}

export interface RecoveryResult {
  verses: RecoveryVerse[];
  text: string;
  inputstring: string;
  detected: string;
  message: string;
  copyright: string;
  error?: boolean;
  errorMessage?: string;
}

function emptyResult(): RecoveryResult {
  return { verses: [], text: '', inputstring: '', detected: '', message: '', copyright: '' };
}

function errorResult(msg: string): RecoveryResult {
  return { ...emptyResult(), error: true, errorMessage: msg };
}

async function doFetch(ref: string): Promise<RecoveryResult> {
  const params = new URLSearchParams({ String: ref, Out: 'json' });
  const resp = await fetch(`${LSM_API_URL}?${params}`);
  if (!resp.ok) {
    return errorResult(`LSM API returned ${resp.status}`);
  }
  const data = await resp.json();
  const verses: RecoveryVerse[] = [];
  if (Array.isArray(data.verses)) {
    for (const v of data.verses) {
      if (v && typeof v.text === 'string' && v.text.trim()) {
        verses.push({ ref: v.ref || '', text: v.text.trim() });
      }
    }
  }
  const text = typeof data.text === 'string' ? data.text.trim()
    : verses.map(v => v.text).join('\n');

  return {
    verses,
    text,
    inputstring: data.inputstring || '',
    detected: data.detected || '',
    message: data.message || '',
    copyright: data.copyright || '',
  };
}

export async function fetchRecoveryText(ref: string): Promise<RecoveryResult> {
  try {
    return await doFetch(ref);
  } catch (err) {
    // Retry once
    try {
      return await doFetch(ref);
    } catch (retryErr) {
      return errorResult(retryErr instanceof Error ? retryErr.message : 'Unknown error');
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/lsmApi.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/lsmApi.ts web/tests/lib/lsmApi.test.ts
git commit -m "feat(web): add LSM API client with retry and error handling"
```

---

### Task 2: SkeletonCard 骨架屏

**Files:**
- Create: `web/src/components/static/SkeletonCard.astro`

- [ ] **Step 1: 建立 SkeletonCard.astro**

```astro
---
interface Props {
  lines?: number;
}
const { lines = 4 } = Astro.props;
---

<div class="skeleton-card card">
  {Array.from({ length: lines }).map((_, i) => (
    <div class="skeleton" style={`height: 1.2em; width: ${85 - i * 10}%; margin-bottom: 0.6rem;`} />
  ))}
</div>

<style>
  .skeleton-card {
    min-height: 120px;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/static/SkeletonCard.astro
git commit -m "feat(web): add SkeletonCard loading placeholder"
```

---

### Task 3: TokenCard 元件

**Files:**
- Create: `web/src/components/islands/TokenCard.tsx`

- [ ] **Step 1: 建立 TokenCard.tsx**

```tsx
import { useState } from 'react';
import type { Token } from '@/lib/analyzer';
import { parseAnalyticalCode } from '@/lib/analyticalCodes';

interface Props {
  token: Token;
  defaultExpanded?: boolean;
}

export default function TokenCard({ token, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const codeInfo = parseAnalyticalCode(token.analytical_code_raw);
  const isHebrew = token.strongs_primary.startsWith('H');
  const langTag = isHebrew ? 'he' : 'grc';
  const langDir = isHebrew ? 'rtl' : 'ltr';

  return (
    <div className="token-card card" onClick={() => setExpanded(!expanded)}>
      <div className="token-header">
        <span lang={langTag} dir={langDir} className="token-surface">
          {token.surface_form}
        </span>
        <span className="token-gloss">{token.literal_gloss_en}</span>
        <span className="token-strongs mono">{token.strongs_primary}</span>
      </div>

      {expanded && (
        <div className="token-detail">
          <dl className="token-fields">
            <dt>正規形式</dt><dd lang={langTag} dir={langDir}>{token.normalized_form}</dd>
            <dt>Lemma</dt><dd lang={langTag} dir={langDir}>{token.lemma}</dd>
            <dt>詞性</dt><dd>{token.part_of_speech}</dd>
            <dt>分析碼</dt>
            <dd className="mono">
              {token.analytical_code_raw}
              <span className="code-expanded">
                {Object.entries(codeInfo.expanded).map(([k, v]) => (
                  <span key={k} className="code-tag">{k}: {v}</span>
                ))}
              </span>
            </dd>
            {token.strongs_secondary && (
              <><dt>次級 Strong's</dt><dd className="mono">{token.strongs_secondary}</dd></>
            )}
            <dt>音譯</dt><dd>{token.pronunciation_transliteration}</dd>
            <dt>注音</dt><dd>{token.pronunciation_bopomofo}</dd>
            <dt>中文翻譯注記</dt><dd>{token.translation_note_zh}</dd>
            <dt>恢復本對齊</dt><dd>{token.recovery_alignment_note}</dd>
            <dt>文法解釋</dt><dd>{token.grammar_explanation}</dd>
            <dt>經文用法</dt><dd>{token.verse_usage}</dd>
            <dt>來源層</dt><dd className="mono">{token.source_layer}</dd>
            {token.is_ot_quote && (
              <><dt>舊約引用</dt><dd>是</dd></>
            )}
          </dl>
        </div>
      )}

      <button
        className="expand-toggle"
        aria-label={expanded ? '收合詳細資訊' : '展開詳細資訊'}
        aria-expanded={expanded}
      >
        {expanded ? '收合' : '展開'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 加入 TokenCard CSS**

在 `TokenCard.tsx` 同檔底部或用 CSS module。由於 Astro Islands 的 React 元件不支援 `.astro` scoped style，改用 inline style object 或建立 `web/src/styles/token-card.css` 並在 global.css 中 import。

建議在 `global.css` 末尾追加：

```css
/* -- TokenCard -- */
.token-card { cursor: pointer; }
.token-header { display: flex; align-items: baseline; gap: 0.8rem; flex-wrap: wrap; }
.token-surface { font-size: var(--font-xl); font-weight: 700; }
.token-gloss { font-size: var(--font-base); color: var(--color-text-secondary); }
.token-strongs { font-size: var(--font-sm); color: var(--color-text-muted); }
.token-detail { margin-top: 1rem; }
.token-fields { display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 1rem; font-size: var(--font-sm); }
.token-fields dt { font-weight: 700; color: var(--color-text-secondary); white-space: nowrap; }
.code-expanded { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.3rem; }
.code-tag { background: var(--color-surface-hover); padding: 0.1rem 0.4rem; border-radius: 4px; font-size: var(--font-xs); }
.expand-toggle { background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: var(--font-sm); padding: 0.4rem 0; font-family: var(--font-sans); }
```

- [ ] **Step 3: 驗證 build**

```bash
npx astro build
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/islands/TokenCard.tsx web/src/styles/global.css
git commit -m "feat(web): add TokenCard component with 23-field expandable detail"
```

---

### Task 4: InterlinearView 元件

**Files:**
- Create: `web/src/components/islands/InterlinearView.tsx`

- [ ] **Step 1: 建立 InterlinearView.tsx**

```tsx
import type { Token } from '@/lib/analyzer';

interface Props {
  tokens: Token[];
  recoveryText: string;
}

export default function InterlinearView({ tokens, recoveryText }: Props) {
  if (tokens.length === 0) return null;

  return (
    <div className="interlinear-view card">
      <h3 className="interlinear-title">逐字對照</h3>
      <div className="interlinear-scroll">
        <table className="interlinear-table" role="table" aria-label="逐字對照表">
          <tbody>
            <tr className="row-original">
              <th>原文</th>
              {tokens.map((t, i) => {
                const isHebrew = t.strongs_primary.startsWith('H');
                return (
                  <td key={i} lang={isHebrew ? 'he' : 'grc'} dir={isHebrew ? 'rtl' : 'ltr'}>
                    {t.surface_form}
                  </td>
                );
              })}
            </tr>
            <tr className="row-strongs">
              <th>Strong's</th>
              {tokens.map((t, i) => (
                <td key={i} className="mono">
                  {t.strongs_primary}
                  {t.strongs_secondary ? `|${t.strongs_secondary}` : ''}
                </td>
              ))}
            </tr>
            <tr className="row-code">
              <th>分析碼</th>
              {tokens.map((t, i) => (
                <td key={i} className="mono">{t.analytical_code_raw}</td>
              ))}
            </tr>
            <tr className="row-gloss">
              <th>Gloss</th>
              {tokens.map((t, i) => (
                <td key={i}>{t.literal_gloss_en}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {recoveryText && (
        <div className="recovery-text">
          <strong>恢復本：</strong>{recoveryText}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 追加 CSS 到 global.css**

```css
/* -- InterlinearView -- */
.interlinear-title { font-size: var(--font-lg); margin-bottom: 0.8rem; }
.interlinear-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.interlinear-table { border-collapse: collapse; min-width: 100%; }
.interlinear-table th { font-size: var(--font-xs); color: var(--color-text-muted); text-align: left; padding: 0.4rem 0.8rem; white-space: nowrap; font-family: var(--font-sans); }
.interlinear-table td { padding: 0.4rem 0.8rem; border-bottom: 1px solid var(--color-border); text-align: center; vertical-align: top; white-space: nowrap; }
.row-original td { font-size: var(--font-original); font-weight: 700; }
.row-strongs td { font-size: var(--font-xs); color: var(--color-text-muted); }
.row-code td { font-size: var(--font-xs); color: var(--color-text-muted); }
.row-gloss td { font-size: var(--font-sm); color: var(--color-text-secondary); }
.recovery-text { margin-top: 1rem; padding: 0.8rem; background: var(--color-surface-hover); border-radius: 8px; font-size: var(--font-base); line-height: 1.8; color: var(--color-recovery); }
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/islands/InterlinearView.tsx web/src/styles/global.css
git commit -m "feat(web): add InterlinearView four-line parallel display"
```

---

### Task 5: VerseResult + PassageResult 元件

**Files:**
- Create: `web/src/components/islands/VerseResult.tsx`
- Create: `web/src/components/islands/PassageResult.tsx`

- [ ] **Step 1: 建立 VerseResult.tsx**

```tsx
import type { Token } from '@/lib/analyzer';
import type { RecoveryResult } from '@/lib/lsmApi';
import InterlinearView from './InterlinearView';
import TokenCard from './TokenCard';

interface Props {
  osisRef: string;
  tokens: Token[];
  recovery: RecoveryResult | null;
  loading?: boolean;
}

export default function VerseResult({ osisRef, tokens, recovery, loading }: Props) {
  const parts = osisRef.split('.');
  const displayRef = parts.length >= 3 ? `${parts[0]} ${parts[1]}:${parts[2]}` : osisRef;

  return (
    <div className="verse-result">
      <h2 className="verse-ref">{displayRef}</h2>

      {recovery?.error && (
        <div className="error-card card" role="alert">
          <p>恢復本經文暫時無法載入，請稍後再試。</p>
          <p className="error-detail">{recovery.errorMessage}</p>
        </div>
      )}

      {loading && !recovery && (
        <div className="skeleton" style={{ height: '3rem', marginBottom: '1rem' }} />
      )}

      {recovery && !recovery.error && (
        <div className="recovery-block card">
          {recovery.verses.length > 0
            ? recovery.verses.map((v, i) => (
                <p key={i} className="recovery-verse-text">{v.text}</p>
              ))
            : recovery.text && <p className="recovery-verse-text">{recovery.text}</p>
          }
          {recovery.copyright && (
            <p className="recovery-copyright">{recovery.copyright}</p>
          )}
        </div>
      )}

      {tokens.length > 0 && (
        <>
          <InterlinearView
            tokens={tokens}
            recoveryText={recovery?.text || ''}
          />

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.8rem' }}>原文研究卡</h3>
          <div className="token-card-grid">
            {tokens.map((t, i) => (
              <TokenCard key={i} token={t} />
            ))}
          </div>
        </>
      )}

      {tokens.length === 0 && !loading && (
        <p className="no-data">此經節尚無原文 token 資料（MVP 資料範圍有限）。</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 建立 PassageResult.tsx**

```tsx
import type { Token } from '@/lib/analyzer';
import type { RecoveryResult } from '@/lib/lsmApi';
import VerseResult from './VerseResult';

interface VerseData {
  osisRef: string;
  tokens: Token[];
  recovery: RecoveryResult | null;
}

interface Props {
  verses: VerseData[];
  loading?: boolean;
}

export default function PassageResult({ verses, loading }: Props) {
  if (verses.length === 0 && !loading) {
    return <p className="no-data">查無資料。</p>;
  }

  return (
    <div className="passage-result">
      <p className="passage-summary">
        共 {verses.length} 節，
        {verses.reduce((sum, v) => sum + v.tokens.length, 0)} 個 token。
      </p>
      {verses.map((v, i) => (
        <VerseResult
          key={i}
          osisRef={v.osisRef}
          tokens={v.tokens}
          recovery={v.recovery}
          loading={loading}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 追加 CSS 到 global.css**

```css
/* -- VerseResult -- */
.verse-result { margin-bottom: 2rem; }
.verse-ref { font-size: var(--font-2xl); margin-bottom: 1rem; color: var(--color-primary); }
.recovery-block { margin-bottom: 1.5rem; }
.recovery-verse-text { font-size: var(--font-lg); line-height: 1.8; margin-bottom: 0.5rem; }
.recovery-copyright { font-size: var(--font-xs); color: var(--color-text-muted); margin-top: 0.5rem; }
.error-card { background: oklch(0.95 0.03 25); border-color: oklch(0.70 0.15 25); color: oklch(0.35 0.10 25); }
.error-detail { font-size: var(--font-xs); margin-top: 0.3rem; }
.token-card-grid { display: grid; gap: 1rem; }
.no-data { color: var(--color-text-muted); font-style: italic; padding: 2rem 0; }
/* -- PassageResult -- */
.passage-summary { font-size: var(--font-sm); color: var(--color-text-muted); margin-bottom: 1.5rem; }
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/islands/VerseResult.tsx web/src/components/islands/PassageResult.tsx web/src/styles/global.css
git commit -m "feat(web): add VerseResult and PassageResult components"
```

---

### Task 6: SearchBox 元件

**Files:**
- Create: `web/src/components/islands/SearchBox.tsx`

- [ ] **Step 1: 建立 SearchBox.tsx**

```tsx
import { useState, useCallback } from 'react';
import { normalizeRef, splitOsisRange } from '@/lib/reference';
import { getVerseTokens, lookupWord, lookupLemma } from '@/lib/analyzer';
import { search as fullTextSearch } from '@/lib/search';
import { fetchRecoveryText } from '@/lib/lsmApi';
import type { Token } from '@/lib/analyzer';
import type { RecoveryResult } from '@/lib/lsmApi';
import VerseResult from './VerseResult';
import PassageResult from './PassageResult';

type SearchMode = 'verse' | 'word' | 'lemma' | 'search' | 'morphology';

interface VerseData {
  osisRef: string;
  tokens: Token[];
  recovery: RecoveryResult | null;
}

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('verse');
  const [loading, setLoading] = useState(false);
  const [verseResults, setVerseResults] = useState<VerseData[]>([]);
  const [tokenResults, setTokenResults] = useState<Token[]>([]);
  const [searchResults, setSearchResults] = useState<{ refs: string[]; matchedLemmas: string[]; matchedStrongs: string[] } | null>(null);
  const [error, setError] = useState('');

  const clearResults = () => {
    setVerseResults([]);
    setTokenResults([]);
    setSearchResults(null);
    setError('');
  };

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    clearResults();
    setLoading(true);

    try {
      if (mode === 'verse') {
        const osisRef = normalizeRef(q);
        const refs = splitOsisRange(osisRef);
        const results: VerseData[] = refs.map(ref => ({
          osisRef: ref,
          tokens: getVerseTokens(ref),
          recovery: null,
        }));
        setVerseResults(results);

        // Fetch recovery text in parallel
        const recoveryPromises = refs.map(ref => {
          const parts = ref.split('.');
          const displayRef = parts.length >= 3 ? `${parts[0]} ${parts[1]}:${parts.slice(2).join('-')}` : ref;
          return fetchRecoveryText(displayRef);
        });

        const recoveries = await Promise.all(recoveryPromises);
        setVerseResults(refs.map((ref, i) => ({
          osisRef: ref,
          tokens: getVerseTokens(ref),
          recovery: recoveries[i],
        })));
      } else if (mode === 'word') {
        setTokenResults(lookupWord(q));
      } else if (mode === 'lemma') {
        setTokenResults(lookupLemma(q));
      } else if (mode === 'search' || mode === 'morphology') {
        const result = fullTextSearch(q);
        setSearchResults(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜尋發生錯誤');
    } finally {
      setLoading(false);
    }
  }, [query, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const modes: { value: SearchMode; label: string }[] = [
    { value: 'verse', label: '經文' },
    { value: 'word', label: '字詞' },
    { value: 'lemma', label: 'Lemma' },
    { value: 'search', label: '全文搜尋' },
    { value: 'morphology', label: '詞形' },
  ];

  return (
    <div className="search-box-container">
      <div className="search-modes">
        {modes.map(m => (
          <button
            key={m.value}
            className={`mode-btn ${mode === m.value ? 'active' : ''}`}
            onClick={() => { setMode(m.value); clearResults(); }}
            aria-pressed={mode === m.value}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="search-input-row">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'verse' ? '輸入經文，如：約1:1 或 Gen1:1-3'
            : mode === 'word' ? '輸入原文或音譯，如：λόγος 或 logos'
            : mode === 'lemma' ? '輸入 lemma，如：λόγος'
            : mode === 'morphology' ? '輸入分析碼或詞性，如：NOM 或 noun'
            : '輸入任意關鍵字搜尋'}
          className="search-input"
          aria-label="搜尋經文或原文"
        />
        <button onClick={handleSearch} disabled={loading} className="search-btn">
          {loading ? '搜尋中...' : '搜尋'}
        </button>
      </div>

      {error && (
        <div className="error-card card" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Verse mode results */}
      {mode === 'verse' && verseResults.length === 1 && (
        <VerseResult
          osisRef={verseResults[0].osisRef}
          tokens={verseResults[0].tokens}
          recovery={verseResults[0].recovery}
          loading={loading}
        />
      )}
      {mode === 'verse' && verseResults.length > 1 && (
        <PassageResult verses={verseResults} loading={loading} />
      )}

      {/* Token results (word/lemma mode) */}
      {(mode === 'word' || mode === 'lemma') && tokenResults.length > 0 && (
        <div className="token-results">
          <p className="result-count">找到 {tokenResults.length} 筆結果</p>
          <div className="token-card-grid">
            {tokenResults.map((t, i) => (
              <div key={i} className="token-result-item">
                <span className="token-result-ref mono">{t.verse_ref}</span>
                <div className="token-card card">
                  <div className="token-header">
                    <span lang={t.strongs_primary.startsWith('H') ? 'he' : 'grc'}
                          dir={t.strongs_primary.startsWith('H') ? 'rtl' : 'ltr'}
                          className="token-surface">{t.surface_form}</span>
                    <span className="token-gloss">{t.literal_gloss_en}</span>
                    <span className="token-strongs mono">{t.strongs_primary}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {(mode === 'search' || mode === 'morphology') && searchResults && (
        <div className="search-results card">
          <h3>搜尋結果</h3>
          {searchResults.refs.length > 0 && (
            <div className="result-section">
              <h4>匹配經節 ({searchResults.refs.length})</h4>
              <div className="ref-list">{searchResults.refs.map(r => <span key={r} className="ref-tag mono">{r}</span>)}</div>
            </div>
          )}
          {searchResults.matchedLemmas.length > 0 && (
            <div className="result-section">
              <h4>匹配 Lemma ({searchResults.matchedLemmas.length})</h4>
              <div className="ref-list">{searchResults.matchedLemmas.map(l => <span key={l} className="ref-tag">{l}</span>)}</div>
            </div>
          )}
          {searchResults.matchedStrongs.length > 0 && (
            <div className="result-section">
              <h4>匹配 Strong's ({searchResults.matchedStrongs.length})</h4>
              <div className="ref-list">{searchResults.matchedStrongs.map(s => <span key={s} className="ref-tag mono">{s}</span>)}</div>
            </div>
          )}
          {searchResults.refs.length === 0 && <p className="no-data">查無結果。</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 追加 SearchBox CSS 到 global.css**

```css
/* -- SearchBox -- */
.search-box-container { margin: 2rem 0; }
.search-modes { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
.mode-btn { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 0.4rem 0.8rem; cursor: pointer; font-family: var(--font-sans); font-size: var(--font-sm); color: var(--color-text-secondary); transition: all 0.2s; }
.mode-btn.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.mode-btn:hover:not(.active) { background: var(--color-surface-hover); }
.search-input-row { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.search-input { flex: 1; padding: 0.8rem 1rem; border: 2px solid var(--color-border); border-radius: 10px; font-size: var(--font-base); font-family: var(--font-serif); background: var(--color-bg); color: var(--color-text); outline: none; transition: border-color 0.2s; }
.search-input:focus { border-color: var(--color-primary); }
.search-btn { padding: 0.8rem 1.5rem; background: var(--color-primary); color: white; border: none; border-radius: 10px; font-size: var(--font-base); font-family: var(--font-sans); cursor: pointer; transition: background 0.2s; white-space: nowrap; }
.search-btn:hover { background: var(--color-primary-hover); }
.search-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.result-count { font-size: var(--font-sm); color: var(--color-text-muted); margin-bottom: 1rem; }
.token-result-item { margin-bottom: 0.5rem; }
.token-result-ref { font-size: var(--font-xs); color: var(--color-text-muted); display: block; margin-bottom: 0.2rem; }
.search-results h3 { font-size: var(--font-lg); margin-bottom: 1rem; }
.result-section { margin-bottom: 1rem; }
.result-section h4 { font-size: var(--font-sm); color: var(--color-text-secondary); margin-bottom: 0.5rem; }
.ref-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.ref-tag { background: var(--color-surface-hover); padding: 0.2rem 0.6rem; border-radius: 6px; font-size: var(--font-sm); }
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/islands/SearchBox.tsx web/src/styles/global.css
git commit -m "feat(web): add SearchBox with 5 search modes and LSM API integration"
```

---

### Task 7: /study 研經主頁

**Files:**
- Create: `web/src/pages/study.astro`

- [ ] **Step 1: 建立 study.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SearchBox from '../components/islands/SearchBox.tsx';
---

<BaseLayout title="研經" description="聖經恢復本原文字義研經工具 — 搜尋經文、逐字對照、原文分析">
  <div class="study-page">
    <h1 style="margin: 2rem 0 0;">研經工具</h1>
    <p style="color: var(--color-text-secondary); margin-bottom: 0.5rem;">
      輸入經文引用查看恢復本經文 + 原文逐字對照 + 研究卡。切換模式可搜尋字詞、lemma、詞形。
    </p>
    <SearchBox client:load />
  </div>
</BaseLayout>

<style>
  .study-page {
    max-width: 900px;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/study.astro
git commit -m "feat(web): add /study page with SearchBox island"
```

---

### Task 8: 首頁更新 — 加入 SearchBox + 書卷快捷

**Files:**
- Modify: `web/src/pages/index.astro`

- [ ] **Step 1: 更新首頁**

覆寫 `web/src/pages/index.astro`：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SearchBox from '../components/islands/SearchBox.tsx';
import BookGrid from '../components/static/BookGrid.astro';
---

<BaseLayout title="首頁" description="聖經恢復本原文字義解析 — 搜尋經文、逐字對照、原文研究">
  <section class="hero">
    <h1>聖經恢復本原文字義解析</h1>
    <p class="hero-sub">搜尋經文查看恢復本 + 原文逐字對照 + 研究卡</p>
  </section>

  <SearchBox client:load />

  <section class="book-section">
    <h2>書卷快速入口</h2>
    <BookGrid />
  </section>
</BaseLayout>

<style>
  .hero {
    text-align: center;
    padding: 3rem 0 1rem;
  }
  .hero h1 {
    font-size: var(--font-2xl);
  }
  .hero-sub {
    color: var(--color-text-secondary);
    font-size: var(--font-lg);
    margin-top: 0.5rem;
  }
  .book-section {
    margin-top: 3rem;
  }
  .book-section h2 {
    font-size: var(--font-xl);
    margin-bottom: 1rem;
  }
</style>
```

- [ ] **Step 2: 更新 Header 導覽加入 /study**

修改 `web/src/components/static/Header.astro`，在 navItems 陣列中加入研經連結：

```typescript
const navItems = [
  { href: `${base}`, label: '首頁' },
  { href: `${base}study`, label: '研經' },
  { href: `${base}books`, label: '書卷' },
  { href: `${base}legend`, label: '圖例' },
  { href: `${base}lexicon`, label: '字典' },
  { href: `${base}resources`, label: '資源' },
];
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/index.astro web/src/components/static/Header.astro
git commit -m "feat(web): update homepage with SearchBox and add /study to navigation"
```

---

### Task 9: 完整 Build + 整合驗證

**Files:** 無新增。

- [ ] **Step 1: 執行所有單元測試**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run
```

Expected: 全部 PASS（38 原有 + 5 lsmApi = 43 tests）。

- [ ] **Step 2: 完整 Build**

```bash
npx astro build
```

Expected: Build 成功，無 error。

- [ ] **Step 3: 驗證所有頁面產出**

```bash
find dist -name 'index.html' | sort
```

Expected: 14 個 HTML 頁面（原 13 + `/study`）。

- [ ] **Step 4: 驗證 SearchBox JS 在 build 產物中**

```bash
ls dist/_astro/ | grep -i search || ls dist/_astro/ | head -10
```

Expected: 有 React island 相關的 JS chunk。

- [ ] **Step 5: 最終 Commit**

```bash
git add -A web/
git commit -m "feat(web): Plan 2 complete — interactive search, verse results, interlinear, token cards"
```

---

## Plan 2 完成條件

- [ ] `lib/lsmApi.ts` 可直接呼叫 LSM API，含重試和錯誤處理，5 tests PASS
- [ ] SearchBox 支援 5 種搜尋模式（經文、字詞、lemma、全文、詞形）
- [ ] VerseResult 顯示恢復本經文 + interlinear + token cards
- [ ] PassageResult 支援多節經文
- [ ] InterlinearView 四行對照（原文、Strong's、分析碼、gloss）+ 恢復本
- [ ] TokenCard 23 欄位可展開/收合
- [ ] SkeletonCard 骨架屏載入動畫
- [ ] `/study` 研經主頁可用
- [ ] 首頁有 SearchBox + 書卷快捷入口
- [ ] 43+ tests 全部 PASS
- [ ] 14 個靜態 HTML 頁面成功 build
