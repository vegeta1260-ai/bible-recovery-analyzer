# Plan 1: Foundation — 專案骨架 + 資料層 + Lib 模組 + CSS Tokens + 靜態頁面

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Astro 前端專案骨架，包含完整的資料層、TypeScript 邏輯模組、OKLCH design tokens、響應式基礎 CSS，以及 4 個純靜態頁面（books, legend, lexicon, resources），可在 GitHub Pages 上獨立運作。

**Architecture:** Astro 5 靜態站，`src/data/` 放 build 時產生的 JSON，`src/lib/` 放移植自 Python 的純 TypeScript 邏輯。靜態頁面直接在 `.astro` 檔中 import JSON 資料渲染為 HTML。React Islands 在此階段僅用於 FontSizeControl 和 ThemeToggle。

**Tech Stack:** Astro 5, React 19, TypeScript, Vitest, CSS Modules + OKLCH

**Spec reference:** `docs/superpowers/specs/2026-05-06-github-pages-frontend-design.md`

---

## File Structure

```
web/
├── astro.config.mjs                    # Astro 配置
├── package.json                        # 依賴
├── tsconfig.json                       # TS 配置
├── vitest.config.ts                    # 測試配置
├── public/
│   └── fonts/                          # self-host 字體 (Ezra SIL, GentiumPlus)
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro            # 共用版面
│   ├── pages/
│   │   ├── index.astro                 # 首頁（此階段為靜態佔位）
│   │   ├── books.astro                 # 書卷總覽
│   │   ├── legend.astro                # 分析碼圖例
│   │   ├── lexicon/
│   │   │   ├── index.astro             # Lexicon 列表
│   │   │   └── [id].astro              # 個別 Strong's 頁
│   │   └── resources.astro             # 事工資源索引
│   ├── components/
│   │   ├── islands/
│   │   │   ├── FontSizeControl.tsx     # 字體大小切換
│   │   │   └── ThemeToggle.tsx         # 深色模式切換
│   │   └── static/
│   │       ├── Header.astro            # 導覽列
│   │       ├── Footer.astro            # 頁尾
│   │       ├── BookGrid.astro          # 書卷格子
│   │       ├── LegendTable.astro       # 分析碼表格
│   │       └── ResourceList.astro      # 資源列表
│   ├── data/
│   │   ├── tokens.json                 # 10 筆 token
│   │   ├── lexicon.json                # 8 筆 lexicon
│   │   ├── bookMap.json                # 30 卷書對照
│   │   └── analyticalCodes.json        # 分析碼 + 縮寫 + 文法注記
│   ├── lib/
│   │   ├── reference.ts                # normalizeRef, splitOsisRange
│   │   ├── strongs.ts                  # normalizeStrongs
│   │   ├── analyticalCodes.ts          # parseAnalyticalCode
│   │   ├── pronunciation.ts            # transliterationToZhuyinLike
│   │   ├── analyzer.ts                 # 本地 token/lexicon 查詢
│   │   └── search.ts                   # 全文搜尋
│   └── styles/
│       ├── tokens.css                  # OKLCH design tokens
│       └── global.css                  # 全域樣式 + 字體 + 響應式
└── tests/
    ├── lib/
    │   ├── reference.test.ts
    │   ├── strongs.test.ts
    │   ├── analyticalCodes.test.ts
    │   ├── pronunciation.test.ts
    │   ├── analyzer.test.ts
    │   └── search.test.ts
    └── setup.ts
```

---

### Task 1: Astro 專案初始化

**Files:**
- Create: `web/package.json`
- Create: `web/astro.config.mjs`
- Create: `web/tsconfig.json`
- Create: `web/vitest.config.ts`
- Create: `web/tests/setup.ts`

- [ ] **Step 1: 初始化 Astro 專案**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
npm create astro@latest web -- --template minimal --no-install --no-git --typescript strict
```

- [ ] **Step 2: 安裝依賴**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npm install @astrojs/react react react-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom typescript
```

- [ ] **Step 3: 配置 astro.config.mjs**

覆寫 `web/astro.config.mjs`：

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://vegeta1260-ai.github.io',
  base: '/bible-recovery-analyzer',
  integrations: [react()],
  output: 'static',
});
```

- [ ] **Step 4: 配置 vitest.config.ts**

建立 `web/vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

建立 `web/tests/setup.ts`：

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: 驗證 Astro 可 build**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx astro build
```

Expected: Build 成功，產出 `dist/` 目錄。

- [ ] **Step 6: 驗證 vitest 可運行**

在 `web/package.json` 的 `scripts` 中加入 `"test": "vitest run"`，然後：

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npm test
```

Expected: 顯示 "No test files found"（尚無測試，但框架正常）。

- [ ] **Step 7: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/
git commit -m "feat(web): scaffold Astro project with React integration and Vitest"
```

---

### Task 2: 靜態 JSON 資料層

**Files:**
- Create: `web/src/data/tokens.json`
- Create: `web/src/data/lexicon.json`
- Create: `web/src/data/bookMap.json`
- Create: `web/src/data/analyticalCodes.json`

**Reference:** `bible_recovery_analyzer/scripts/seed_data.py`, `bible_recovery_analyzer/app/data/book_map.py`, `bible_recovery_analyzer/app/services/analytical_codes.py`

- [ ] **Step 1: 建立 tokens.json**

建立 `web/src/data/tokens.json`，移植 `seed_data.py` 的 `SAMPLE_TOKENS`（10 筆），每筆加入 `pronunciation_bopomofo`（需先用 Python 跑一次產出）：

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/bible_recovery_analyzer
python -c "
from app.services.pronunciation import transliteration_to_zhuyin_like
from scripts.seed_data import SAMPLE_TOKENS
import json

tokens = []
for t in SAMPLE_TOKENS:
    lang = 'Hebrew' if t['strongs_primary'].startswith('H') else 'Greek'
    bopomofo = transliteration_to_zhuyin_like(t['pronunciation_transliteration'], lang)
    entry = {**t, 'pronunciation_bopomofo': bopomofo}
    tokens.append(entry)

print(json.dumps(tokens, ensure_ascii=False, indent=2))
" > ../web/src/data/tokens.json
```

- [ ] **Step 2: 建立 lexicon.json**

建立 `web/src/data/lexicon.json`，移植 `seed_data.py` 的 `LEXICON`：

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/bible_recovery_analyzer
python -c "
from app.services.pronunciation import transliteration_to_zhuyin_like
from app.services.strongs import normalize_strongs
from scripts.seed_data import LEXICON
import json

entries = []
for s, lemma, lang, tr, definition, gloss in LEXICON:
    sid = normalize_strongs(s)
    bopomofo = transliteration_to_zhuyin_like(tr, lang)
    entries.append({
        'strongs': sid,
        'normalized_strongs': sid,
        'lemma': lemma,
        'language': lang,
        'transliteration': tr,
        'pronunciation_bopomofo': bopomofo,
        'short_definition': definition,
        'literal_gloss_en': gloss,
        'common_inflections': [tr, f'{tr}s'],
        'analytical_notes': ['form-priority', 'function-exception-possible'],
    })

print(json.dumps(entries, ensure_ascii=False, indent=2))
" > ../web/src/data/lexicon.json
```

- [ ] **Step 3: 建立 bookMap.json**

建立 `web/src/data/bookMap.json`，移植 `book_map.py` 的 `BOOK_ROWS`：

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/bible_recovery_analyzer
python -c "
from app.data.book_map import BOOK_ROWS
import json

rows = [{'osis': osis, 'english': en, 'zh': zh, 'aliases': aliases} for osis, en, zh, aliases in BOOK_ROWS]
print(json.dumps(rows, ensure_ascii=False, indent=2))
" > ../web/src/data/bookMap.json
```

- [ ] **Step 4: 建立 analyticalCodes.json**

建立 `web/src/data/analyticalCodes.json`，合併 `analytical_codes.py` 的三個 dict：

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/bible_recovery_analyzer
python -c "
from app.services.analytical_codes import ANALYTICAL_CODE_LEGEND, ABBREVIATION_LEGEND, GRAMMAR_NOTES
import json

data = {
    'analyticalCodeLegend': ANALYTICAL_CODE_LEGEND,
    'abbreviationLegend': ABBREVIATION_LEGEND,
    'grammarNotes': GRAMMAR_NOTES,
}
print(json.dumps(data, ensure_ascii=False, indent=2))
" > ../web/src/data/analyticalCodes.json
```

- [ ] **Step 5: 驗證 JSON 格式正確**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
node -e "
const t = require('./src/data/tokens.json');
const l = require('./src/data/lexicon.json');
const b = require('./src/data/bookMap.json');
const a = require('./src/data/analyticalCodes.json');
console.log('tokens:', t.length, '| lexicon:', l.length, '| books:', b.length, '| codes:', Object.keys(a.analyticalCodeLegend).length);
"
```

Expected: `tokens: 10 | lexicon: 8 | books: 30 | codes: 41`

- [ ] **Step 6: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/data/
git commit -m "feat(web): add static JSON data layer from seed data"
```

---

### Task 3: lib/reference.ts — 經文引用解析

**Files:**
- Create: `web/src/lib/reference.ts`
- Create: `web/tests/lib/reference.test.ts`

**Reference:** `bible_recovery_analyzer/app/services/reference.py`

- [ ] **Step 1: 寫失敗測試**

建立 `web/tests/lib/reference.test.ts`：

```typescript
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
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/reference.test.ts
```

Expected: FAIL — 找不到 `@/lib/reference` 模組。

- [ ] **Step 3: 實作 reference.ts**

建立 `web/src/lib/reference.ts`：

```typescript
import bookMapData from '@/data/bookMap.json';

type BookEntry = { osis: string; english: string; zh: string; aliases: string[] };
const bookMap = bookMapData as BookEntry[];

const bookAliases: Record<string, string> = {};
for (const row of bookMap) {
  for (const alias of row.aliases) {
    bookAliases[alias.replace(/ /g, '').toLowerCase()] = row.osis;
  }
}

const REF_PATTERN = /^([\u4e00-\u9fa5A-Za-z0-9 ]+)(\d+):(\d+)(?:-(\d+))?$/;

export function normalizeRef(ref: string): string {
  const text = ref.trim();
  const m = text.match(REF_PATTERN);
  if (!m) {
    throw new Error('無法解析經文格式，請使用如 創1:1 或 John1:1-3');
  }
  const [, bookRaw, chapter, verseStart, verseEnd] = m;
  const key = bookRaw.replace(/ /g, '').toLowerCase();
  const osis = bookAliases[key];
  if (!osis) {
    throw new Error(`不支援的書卷：${bookRaw}`);
  }
  if (verseEnd) {
    return `${osis}.${chapter}.${verseStart}-${verseEnd}`;
  }
  return `${osis}.${chapter}.${verseStart}`;
}

export function splitOsisRange(osisRef: string): string[] {
  if (!osisRef.includes('-')) {
    return [osisRef];
  }
  const [left, end] = osisRef.split('-');
  const parts = left.split('.');
  const start = parseInt(parts[2], 10);
  const stop = parseInt(end, 10);
  const refs: string[] = [];
  for (let v = start; v <= stop; v++) {
    refs.push(`${parts[0]}.${parts[1]}.${v}`);
  }
  return refs;
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/reference.test.ts
```

Expected: 6 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/lib/reference.ts web/tests/lib/reference.test.ts
git commit -m "feat(web): add reference parser (normalizeRef, splitOsisRange)"
```

---

### Task 4: lib/strongs.ts — Strong's 編號正規化

**Files:**
- Create: `web/src/lib/strongs.ts`
- Create: `web/tests/lib/strongs.test.ts`

**Reference:** `bible_recovery_analyzer/app/services/strongs.py`

- [ ] **Step 1: 寫失敗測試**

建立 `web/tests/lib/strongs.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeStrongs } from '@/lib/strongs';

describe('normalizeStrongs', () => {
  it('normalizes G3056', () => {
    expect(normalizeStrongs('G3056')).toBe('G3056');
  });

  it('strips leading zeros', () => {
    expect(normalizeStrongs('G0076')).toBe('G76');
  });

  it('handles special normalization G3056A -> G3056', () => {
    expect(normalizeStrongs('G3056A')).toBe('G3056');
  });

  it('handles H430A -> H430', () => {
    expect(normalizeStrongs('H430A')).toBe('H430');
  });

  it('is case-insensitive', () => {
    expect(normalizeStrongs('g3056')).toBe('G3056');
  });

  it('strips curly quotes', () => {
    expect(normalizeStrongs("G\u20183056\u2019")).toBe('G3056');
  });

  it('throws on invalid ID', () => {
    expect(() => normalizeStrongs('X999')).toThrow('Invalid');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/strongs.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 實作 strongs.ts**

建立 `web/src/lib/strongs.ts`：

```typescript
const STRONGS_CANONICAL = /^([GH])(\d{1,4})([A-Z]?)$/;

const SPECIAL_NORMALIZATION: Record<string, string> = {
  G3056A: 'G3056',
  H430A: 'H430',
};

export function normalizeStrongs(raw: string): string {
  let text = raw.trim().toUpperCase().replace(/\u2018/g, '').replace(/\u2019/g, '');
  text = SPECIAL_NORMALIZATION[text] ?? text;
  const m = text.match(STRONGS_CANONICAL);
  if (!m) {
    throw new Error(`Invalid Strong's ID: ${raw}`);
  }
  const [, prefix, digits, suffix] = m;
  const normalized = `${prefix}${parseInt(digits, 10)}`;
  return suffix ? `${normalized}${suffix}` : normalized;
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/strongs.test.ts
```

Expected: 7 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/lib/strongs.ts web/tests/lib/strongs.test.ts
git commit -m "feat(web): add Strong's number normalizer"
```

---

### Task 5: lib/analyticalCodes.ts — 分析碼解析

**Files:**
- Create: `web/src/lib/analyticalCodes.ts`
- Create: `web/tests/lib/analyticalCodes.test.ts`

**Reference:** `bible_recovery_analyzer/app/services/analytical_codes.py`

- [ ] **Step 1: 寫失敗測試**

建立 `web/tests/lib/analyticalCodes.test.ts`：

```typescript
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
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/analyticalCodes.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 實作 analyticalCodes.ts**

建立 `web/src/lib/analyticalCodes.ts`：

```typescript
import codesData from '@/data/analyticalCodes.json';

const { analyticalCodeLegend } = codesData as {
  analyticalCodeLegend: Record<string, string>;
  abbreviationLegend: Record<string, string>;
  grammarNotes: Record<string, string>;
};

export interface AnalyticalCodeInfo {
  code: string;
  expanded: Record<string, string>;
  legend: Record<string, string>;
  methodologyNote: string;
}

export function parseAnalyticalCode(code: string): AnalyticalCodeInfo {
  const parts = code.replace(/\//g, '-').split('-').filter(Boolean);
  const expanded: Record<string, string> = {};
  for (const p of parts) {
    expanded[p] = analyticalCodeLegend[p] ?? 'unknown';
  }
  if (code.includes('M/P')) {
    expanded['M/P'] = analyticalCodeLegend['M/P'];
  }

  return {
    code,
    expanded,
    legend: analyticalCodeLegend,
    methodologyNote:
      'Code expansion follows form-first strategy; function-based overrides are flagged in grammar notes.',
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/analyticalCodes.test.ts
```

Expected: 5 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/lib/analyticalCodes.ts web/tests/lib/analyticalCodes.test.ts
git commit -m "feat(web): add analytical code parser"
```

---

### Task 6: lib/pronunciation.ts — 注音轉換

**Files:**
- Create: `web/src/lib/pronunciation.ts`
- Create: `web/tests/lib/pronunciation.test.ts`

**Reference:** `bible_recovery_analyzer/app/services/pronunciation.py`

- [ ] **Step 1: 寫失敗測試**

建立 `web/tests/lib/pronunciation.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { transliterationToZhuyinLike } from '@/lib/pronunciation';

describe('transliterationToZhuyinLike', () => {
  it('converts Hebrew bereshit', () => {
    const result = transliterationToZhuyinLike('bereshit', 'Hebrew');
    expect(result).toContain('ㄅ');
    expect(result).toContain('ㄕ');
  });

  it('converts Greek logos', () => {
    const result = transliterationToZhuyinLike('logos', 'Greek');
    expect(result).toContain('ㄌ');
    expect(result).toContain('ㄙ');
  });

  it('converts Greek theos', () => {
    const result = transliterationToZhuyinLike('theos', 'Greek');
    expect(result).toContain('ㄙ');  // th -> ㄙ
  });

  it('handles multi-char rules before single-char', () => {
    // 'sh' should map as one unit, not 's' + 'h'
    const result = transliterationToZhuyinLike('sh', 'Hebrew');
    expect(result).toBe('ㄕ');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/pronunciation.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 實作 pronunciation.ts**

建立 `web/src/lib/pronunciation.ts`：

```typescript
const HEBREW_RULES: [string, string][] = [
  ['sh', 'ㄕ'], ['ts', 'ㄘ'], ['ch', 'ㄏ'],
  ['\u02BE', 'ㄚ'], ['ă', 'ㄚ'], ['ā', 'ㄚ'],
  ['e', 'ㄝ'], ['ē', 'ㄟ'], ['i', 'ㄧ'], ['î', 'ㄧ'],
  ['o', 'ㄛ'], ['ō', 'ㄡ'], ['u', 'ㄨ'], ['û', 'ㄨ'],
  ['b', 'ㄅ'], ['g', 'ㄍ'], ['d', 'ㄉ'], ['h', 'ㄏ'],
  ['w', 'ㄨ'], ['z', 'ㄗ'], ['y', 'ㄧ'], ['k', 'ㄎ'],
  ['l', 'ㄌ'], ['m', 'ㄇ'], ['n', 'ㄋ'], ['p', 'ㄆ'],
  ['r', 'ㄖ'], ['s', 'ㄙ'], ['t', 'ㄊ'],
];

const GREEK_RULES: [string, string][] = [
  ['th', 'ㄙ'], ['ph', 'ㄈ'], ['ch', 'ㄎ'], ['ps', 'ㄆㄙ'],
  ['ou', 'ㄨ'], ['ai', 'ㄞ'], ['ei', 'ㄟ'], ['oi', 'ㄛㄧ'],
  ['a', 'ㄚ'], ['e', 'ㄝ'], ['ē', 'ㄟ'], ['i', 'ㄧ'],
  ['o', 'ㄛ'], ['u', 'ㄨ'],
  ['b', 'ㄅ'], ['g', 'ㄍ'], ['d', 'ㄉ'], ['z', 'ㄗ'],
  ['k', 'ㄎ'], ['l', 'ㄌ'], ['m', 'ㄇ'], ['n', 'ㄋ'],
  ['p', 'ㄆ'], ['r', 'ㄖ'], ['s', 'ㄙ'], ['t', 'ㄊ'],
  ['x', 'ㄎㄙ'],
];

export function transliterationToZhuyinLike(text: string, language: string): string {
  const rules = language.toLowerCase() === 'hebrew' ? HEBREW_RULES : GREEK_RULES;
  // Sort by length descending so multi-char rules match first
  const sorted = [...rules].sort((a, b) => b[0].length - a[0].length);
  let out = text.toLowerCase();
  for (const [source, target] of sorted) {
    out = out.split(source).join(target);
  }
  return out;
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/pronunciation.test.ts
```

Expected: 4 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/lib/pronunciation.ts web/tests/lib/pronunciation.test.ts
git commit -m "feat(web): add transliteration to zhuyin-like converter"
```

---

### Task 7: lib/analyzer.ts — 本地 Token/Lexicon 查詢

**Files:**
- Create: `web/src/lib/analyzer.ts`
- Create: `web/tests/lib/analyzer.test.ts`

**Reference:** `bible_recovery_analyzer/app/services/analyzer.py`

- [ ] **Step 1: 寫失敗測試**

建立 `web/tests/lib/analyzer.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { getVerseTokens, lookupStrongs, lookupWord, lookupLemma } from '@/lib/analyzer';

describe('getVerseTokens', () => {
  it('returns tokens for John.1.1', () => {
    const tokens = getVerseTokens('John.1.1');
    expect(tokens.length).toBe(2);
    expect(tokens[0].surface_form).toBe('λόγος');
    expect(tokens[1].surface_form).toBe('θεός');
  });

  it('returns empty for unknown ref', () => {
    expect(getVerseTokens('Fake.99.99')).toEqual([]);
  });

  it('returns tokens sorted by token_order', () => {
    const tokens = getVerseTokens('Gen.1.1');
    expect(tokens[0].token_order).toBe(1);
    expect(tokens[1].token_order).toBe(2);
  });
});

describe('lookupStrongs', () => {
  it('finds G3056 lexicon entry', () => {
    const entry = lookupStrongs('G3056');
    expect(entry).not.toBeNull();
    expect(entry!.lemma).toBe('λόγος');
    expect(entry!.language).toBe('Greek');
  });

  it('returns null for unknown ID', () => {
    expect(lookupStrongs('G9999')).toBeNull();
  });
});

describe('lookupWord', () => {
  it('finds by surface form', () => {
    const results = lookupWord('λόγος');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].surface_form).toBe('λόγος');
  });

  it('finds by transliteration', () => {
    const results = lookupWord('logos');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('lookupLemma', () => {
  it('finds tokens by lemma', () => {
    const results = lookupLemma('λόγος');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].lemma).toBe('λόγος');
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/analyzer.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 實作 analyzer.ts**

建立 `web/src/lib/analyzer.ts`：

```typescript
import tokensData from '@/data/tokens.json';
import lexiconData from '@/data/lexicon.json';
import { normalizeStrongs } from '@/lib/strongs';

export interface Token {
  verse_ref: string;
  token_order: number;
  surface_form: string;
  normalized_form: string;
  lemma: string;
  strongs_primary: string;
  strongs_secondary: string | null;
  analytical_code_raw: string;
  part_of_speech: string;
  morphology_features: Record<string, string>;
  literal_gloss_en: string;
  translation_note_zh: string;
  recovery_alignment_note: string;
  pronunciation_transliteration: string;
  pronunciation_bopomofo: string;
  source_layer: string;
  verse_usage: string;
  grammar_explanation: string;
  is_ot_quote: boolean;
}

export interface LexiconEntry {
  strongs: string;
  normalized_strongs: string;
  lemma: string;
  language: string;
  transliteration: string;
  pronunciation_bopomofo: string;
  short_definition: string;
  literal_gloss_en: string;
  common_inflections: string[];
  analytical_notes: string[];
}

const tokens = tokensData as Token[];
const lexicon = lexiconData as LexiconEntry[];

export function getVerseTokens(osisRef: string): Token[] {
  return tokens
    .filter((t) => t.verse_ref === osisRef)
    .sort((a, b) => a.token_order - b.token_order);
}

export function lookupStrongs(rawId: string): LexiconEntry | null {
  try {
    const sid = normalizeStrongs(rawId);
    return lexicon.find((e) => e.normalized_strongs === sid) ?? null;
  } catch {
    return null;
  }
}

export function lookupWord(query: string): Token[] {
  const q = query.trim();
  return tokens
    .filter(
      (t) =>
        t.surface_form === q ||
        t.normalized_form === q ||
        t.lemma === q ||
        t.pronunciation_transliteration === q
    )
    .sort((a, b) => a.verse_ref.localeCompare(b.verse_ref) || a.token_order - b.token_order)
    .slice(0, 80);
}

export function lookupLemma(lemma: string): Token[] {
  return tokens
    .filter((t) => t.lemma === lemma)
    .sort((a, b) => a.verse_ref.localeCompare(b.verse_ref) || a.token_order - b.token_order)
    .slice(0, 80);
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/analyzer.test.ts
```

Expected: 7 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/lib/analyzer.ts web/tests/lib/analyzer.test.ts
git commit -m "feat(web): add local token/lexicon analyzer"
```

---

### Task 8: lib/search.ts — 全文搜尋

**Files:**
- Create: `web/src/lib/search.ts`
- Create: `web/tests/lib/search.test.ts`

**Reference:** `bible_recovery_analyzer/app/services/analyzer.py` search()

- [ ] **Step 1: 寫失敗測試**

建立 `web/tests/lib/search.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { search, type SearchResult } from '@/lib/search';

describe('search', () => {
  it('finds by verse ref', () => {
    const result = search('John.1.1');
    expect(result.refs).toContain('John.1.1');
  });

  it('finds by surface form', () => {
    const result = search('λόγος');
    expect(result.matchedLemmas).toContain('λόγος');
  });

  it('finds by strongs number', () => {
    const result = search('G3056');
    expect(result.matchedStrongs).toContain('G3056');
  });

  it('finds by analytical code', () => {
    const result = search('NOM');
    expect(result.refs.length).toBeGreaterThan(0);
  });

  it('returns sorted unique results', () => {
    const result = search('John');
    const sorted = [...result.refs].sort();
    expect(result.refs).toEqual(sorted);
  });

  it('returns empty for no match', () => {
    const result = search('xyznonexistent');
    expect(result.refs).toEqual([]);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/search.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 實作 search.ts**

建立 `web/src/lib/search.ts`：

```typescript
import tokensData from '@/data/tokens.json';
import type { Token } from '@/lib/analyzer';

const tokens = tokensData as Token[];

export interface SearchResult {
  query: string;
  refs: string[];
  matchedLemmas: string[];
  matchedStrongs: string[];
}

export function search(query: string): SearchResult {
  const q = query.trim();
  const qUpper = q.toUpperCase();

  const matched = tokens.filter(
    (t) =>
      t.verse_ref.includes(q) ||
      t.surface_form.includes(q) ||
      t.lemma.includes(q) ||
      t.strongs_primary.includes(qUpper) ||
      t.analytical_code_raw.includes(qUpper)
  );

  const refs = [...new Set(matched.map((t) => t.verse_ref))].sort().slice(0, 100);
  const matchedLemmas = [...new Set(matched.map((t) => t.lemma))].sort().slice(0, 100);
  const matchedStrongs = [...new Set(matched.map((t) => t.strongs_primary))].sort().slice(0, 100);

  return { query: q, refs, matchedLemmas, matchedStrongs };
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run tests/lib/search.test.ts
```

Expected: 6 tests PASS。

- [ ] **Step 5: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/lib/search.ts web/tests/lib/search.test.ts
git commit -m "feat(web): add full-text cross-field search"
```

---

### Task 9: OKLCH Design Tokens + 全域 CSS

**Files:**
- Create: `web/src/styles/tokens.css`
- Create: `web/src/styles/global.css`

- [ ] **Step 1: 建立 tokens.css**

建立 `web/src/styles/tokens.css`：

```css
:root {
  /* -- 主色系（暖棕） -- */
  --color-primary: oklch(0.45 0.10 55);
  --color-primary-hover: oklch(0.40 0.12 55);
  --color-primary-light: oklch(0.75 0.08 55);

  /* -- 強調色（琥珀金）-- 不可用於小號正文，僅用於按鈕/連結/大標題 -- */
  --color-accent: oklch(0.70 0.16 70);
  --color-accent-hover: oklch(0.65 0.18 70);
  --color-accent-glow: oklch(0.80 0.12 70);

  /* -- 語義色 -- */
  --color-hebrew: oklch(0.60 0.14 40);
  --color-greek: oklch(0.55 0.12 250);
  --color-recovery: oklch(0.50 0.10 150);

  /* -- 表面/背景 -- */
  --color-bg: oklch(0.98 0.005 80);
  --color-surface: oklch(0.96 0.01 75);
  --color-surface-hover: oklch(0.93 0.015 75);
  --color-border: oklch(0.88 0.02 70);

  /* -- 文字 -- */
  --color-text: oklch(0.22 0.03 50);
  --color-text-secondary: oklch(0.40 0.03 55);
  --color-text-muted: oklch(0.48 0.02 55);

  /* -- 特效專用 -- */
  --color-flame-core: oklch(0.75 0.20 60);
  --color-flame-outer: oklch(0.65 0.22 40);
  --color-water: oklch(0.65 0.10 230);
  --color-light-burst: oklch(0.95 0.08 90);
  --color-star: oklch(0.90 0.10 85);
  --color-particle: oklch(0.85 0.12 75);

  /* -- 字體大小 -- */
  --font-size-scale: 1;
  --font-xs: calc(14px * var(--font-size-scale));
  --font-sm: calc(16px * var(--font-size-scale));
  --font-base: calc(20px * var(--font-size-scale));
  --font-lg: calc(24px * var(--font-size-scale));
  --font-xl: calc(30px * var(--font-size-scale));
  --font-2xl: calc(36px * var(--font-size-scale));
  --font-original: calc(24px * var(--font-size-scale));
  --line-height: calc(1.6 + 0.1 * (var(--font-size-scale) - 1));

  /* -- 字體族 -- */
  --font-serif: "Noto Serif TC", "Source Han Serif TC", serif;
  --font-sans: "Noto Sans TC", "Source Han Sans TC", sans-serif;
  --font-hebrew: "Ezra SIL", "Noto Sans Hebrew", serif;
  --font-greek: "GentiumPlus", "Noto Sans Greek", serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
}

/* -- 字體大小三段切換 -- */
[data-font-scale="1"] { --font-size-scale: 1; }
[data-font-scale="1.3"] { --font-size-scale: 1.3; }
[data-font-scale="1.6"] { --font-size-scale: 1.6; }

/* -- 深色模式 -- */
[data-theme="dark"] {
  --color-bg: oklch(0.18 0.01 50);
  --color-surface: oklch(0.22 0.015 50);
  --color-surface-hover: oklch(0.27 0.02 50);
  --color-border: oklch(0.32 0.02 55);
  --color-text: oklch(0.90 0.02 70);
  --color-text-secondary: oklch(0.72 0.02 65);
  --color-text-muted: oklch(0.63 0.015 60);
  --color-primary: oklch(0.65 0.10 55);
  --color-primary-hover: oklch(0.60 0.12 55);
  --color-primary-light: oklch(0.45 0.08 55);
  --color-accent: oklch(0.75 0.16 70);
  --color-accent-hover: oklch(0.70 0.18 70);
  --color-accent-glow: oklch(0.85 0.12 70);
  --color-hebrew: oklch(0.70 0.14 40);
  --color-greek: oklch(0.65 0.12 250);
  --color-recovery: oklch(0.60 0.10 150);
  --color-particle: oklch(0.90 0.15 75);
  --color-flame-core: oklch(0.80 0.22 60);
  --color-flame-outer: oklch(0.70 0.22 40);
  --color-light-burst: oklch(0.98 0.10 90);
  --color-water: oklch(0.70 0.12 230);
  --color-star: oklch(0.92 0.12 85);
}
```

- [ ] **Step 2: 建立 global.css**

建立 `web/src/styles/global.css`：

```css
@import './tokens.css';

@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&family=JetBrains+Mono:wght@400&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: var(--font-base);
  line-height: var(--line-height);
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font-serif);
  color: var(--color-text);
  background-color: var(--color-bg);
  transition: color 0.3s ease, background-color 0.3s ease;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-sans);
  font-weight: 700;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}
a:hover {
  color: var(--color-primary-hover);
}

/* -- 原文語言標記 -- */
[lang="he"] {
  font-family: var(--font-hebrew);
  direction: rtl;
  font-size: var(--font-original);
}

[lang="grc"] {
  font-family: var(--font-greek);
  font-size: var(--font-original);
}

code, .mono {
  font-family: var(--font-mono);
}

/* -- 卡片基礎 -- */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.2rem;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  background: var(--color-surface-hover);
  box-shadow: 0 2px 8px oklch(0.5 0.02 50 / 0.1);
}

/* -- 骨架屏動畫 -- */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface) 25%,
    var(--color-surface-hover) 50%,
    var(--color-surface) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  border-radius: 8px;
}

@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* -- 響應式 -- */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 768px) {
  .container { padding: 0 2rem; }
}

@media (min-width: 1024px) {
  .layout-two-col {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 2rem;
  }
}

/* -- 無障礙：減少動畫 -- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: 驗證 build 成功（確認 CSS 無語法錯誤）**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx astro build
```

Expected: Build 成功。

- [ ] **Step 4: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/styles/
git commit -m "feat(web): add OKLCH design tokens, global CSS, dark mode, responsive layout"
```

---

### Task 10: BaseLayout + Header + Footer

**Files:**
- Create: `web/src/layouts/BaseLayout.astro`
- Create: `web/src/components/static/Header.astro`
- Create: `web/src/components/static/Footer.astro`
- Create: `web/src/components/islands/FontSizeControl.tsx`
- Create: `web/src/components/islands/ThemeToggle.tsx`

- [ ] **Step 1: 建立 ThemeToggle.tsx**

建立 `web/src/components/islands/ThemeToggle.tsx`：

```tsx
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    setDark(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? '切換至亮色模式' : '切換至深色模式'}
      style={{
        background: 'none',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '0.4rem 0.6rem',
        cursor: 'pointer',
        color: 'var(--color-text)',
        fontSize: 'var(--font-sm)',
      }}
    >
      {dark ? '亮色' : '深色'}
    </button>
  );
}
```

- [ ] **Step 2: 建立 FontSizeControl.tsx**

建立 `web/src/components/islands/FontSizeControl.tsx`：

```tsx
import { useState, useEffect } from 'react';

const SCALES = ['1', '1.3', '1.6'] as const;
const LABELS = ['A', 'A+', 'A++'] as const;

export default function FontSizeControl() {
  const [scaleIndex, setScaleIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('fontScale');
    if (saved) {
      const idx = SCALES.indexOf(saved as typeof SCALES[number]);
      if (idx !== -1) {
        setScaleIndex(idx);
        document.documentElement.setAttribute('data-font-scale', saved);
      }
    }
  }, []);

  const cycle = () => {
    const next = (scaleIndex + 1) % SCALES.length;
    setScaleIndex(next);
    const scale = SCALES[next];
    document.documentElement.setAttribute('data-font-scale', scale);
    localStorage.setItem('fontScale', scale);
  };

  return (
    <button
      onClick={cycle}
      aria-label={`字體大小：${LABELS[scaleIndex]}，點擊切換`}
      style={{
        background: 'none',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '0.4rem 0.6rem',
        cursor: 'pointer',
        color: 'var(--color-text)',
        fontSize: 'var(--font-sm)',
        fontWeight: 500,
      }}
    >
      {LABELS[scaleIndex]}
    </button>
  );
}
```

- [ ] **Step 3: 建立 Header.astro**

建立 `web/src/components/static/Header.astro`：

```astro
---
import FontSizeControl from '../islands/FontSizeControl.tsx';
import ThemeToggle from '../islands/ThemeToggle.tsx';

const { pathname } = Astro.url;
const base = import.meta.env.BASE_URL;

const navItems = [
  { href: `${base}`, label: '首頁' },
  { href: `${base}books`, label: '書卷' },
  { href: `${base}legend`, label: '圖例' },
  { href: `${base}lexicon`, label: '字典' },
  { href: `${base}resources`, label: '資源' },
];
---

<header class="site-header">
  <div class="header-inner container">
    <a href={base} class="logo">聖經原文解析</a>
    <nav class="main-nav" aria-label="主導覽">
      {navItems.map(item => (
        <a
          href={item.href}
          class:list={['nav-link', { active: pathname === item.href || pathname === item.href.replace(/\/$/, '') }]}
        >
          {item.label}
        </a>
      ))}
    </nav>
    <div class="header-controls">
      <FontSizeControl client:load />
      <ThemeToggle client:load />
    </div>
  </div>
</header>

<style>
  .site-header {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-inner {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding-top: 0.8rem;
    padding-bottom: 0.8rem;
  }
  .logo {
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: var(--font-lg);
    color: var(--color-primary);
    white-space: nowrap;
  }
  .main-nav {
    display: flex;
    gap: 1rem;
    flex: 1;
  }
  .nav-link {
    font-family: var(--font-sans);
    font-size: var(--font-sm);
    color: var(--color-text-secondary);
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
  }
  .nav-link:hover, .nav-link.active {
    color: var(--color-primary);
    background: var(--color-surface);
  }
  .header-controls {
    display: flex;
    gap: 0.5rem;
  }
  @media (max-width: 767px) {
    .main-nav { display: none; }
  }
</style>
```

- [ ] **Step 4: 建立 Footer.astro**

建立 `web/src/components/static/Footer.astro`：

```astro
<footer class="site-footer">
  <div class="container">
    <p class="attribution">
      恢復本經文由 LSM Text Only Holy Bible Recovery Version API 即時提供，請依官方授權規範使用。
    </p>
    <p class="copyright">
      原文資料來源：OSHB / WLC / SBLGNT / MorphGNT（開放授權）
    </p>
  </div>
</footer>

<style>
  .site-footer {
    border-top: 1px solid var(--color-border);
    padding: 1.5rem 0;
    margin-top: 3rem;
    font-size: var(--font-xs);
    color: var(--color-text-muted);
    text-align: center;
  }
  .attribution { margin-bottom: 0.3rem; }
</style>
```

- [ ] **Step 5: 建立 BaseLayout.astro**

建立 `web/src/layouts/BaseLayout.astro`：

```astro
---
import Header from '../components/static/Header.astro';
import Footer from '../components/static/Footer.astro';
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = '聖經恢復本原文字義解析工具' } = Astro.props;
const fullTitle = `${title} | 聖經原文解析`;
---

<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  </head>
  <body>
    <Header />
    <main class="container">
      <slot />
    </main>
    <Footer />
    <script is:inline>
      // 防閃爍：在 HTML 解析時立即套用 theme 和 font scale
      (function() {
        var theme = localStorage.getItem('theme');
        if (theme) document.documentElement.setAttribute('data-theme', theme);
        else if (window.matchMedia('(prefers-color-scheme: dark)').matches)
          document.documentElement.setAttribute('data-theme', 'dark');

        var scale = localStorage.getItem('fontScale');
        if (scale) document.documentElement.setAttribute('data-font-scale', scale);
      })();
    </script>
  </body>
</html>
```

- [ ] **Step 6: 更新首頁佔位**

覆寫 `web/src/pages/index.astro`：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="首頁">
  <section style="padding: 3rem 0; text-align: center;">
    <h1>聖經恢復本原文字義解析</h1>
    <p style="margin-top: 1rem; color: var(--color-text-secondary); font-size: var(--font-lg);">
      搜尋功能將在 Plan 2 實作
    </p>
  </section>
</BaseLayout>
```

- [ ] **Step 7: 驗證 dev server 可正常顯示**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx astro dev --port 4321 &
sleep 3
curl -s http://localhost:4321/bible-recovery-analyzer/ | head -20
kill %1
```

Expected: HTML 輸出包含 `聖經恢復本原文字義解析` 和 `data-theme` script。

- [ ] **Step 8: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/layouts/ web/src/components/ web/src/pages/index.astro
git commit -m "feat(web): add BaseLayout, Header, Footer, FontSizeControl, ThemeToggle"
```

---

### Task 11: 靜態頁面 — /books 書卷總覽

**Files:**
- Create: `web/src/components/static/BookGrid.astro`
- Create: `web/src/pages/books.astro`

- [ ] **Step 1: 建立 BookGrid.astro**

建立 `web/src/components/static/BookGrid.astro`：

```astro
---
import bookMapData from '../../data/bookMap.json';

type BookEntry = { osis: string; english: string; zh: string; aliases: string[] };
const books = bookMapData as BookEntry[];

const ot = books.filter(b => ['Gen', 'Exod', 'Ps'].includes(b.osis));
const nt = books.filter(b => !['Gen', 'Exod', 'Ps'].includes(b.osis));
---

<section class="book-grid-section">
  <h2>舊約（已收錄）</h2>
  <div class="book-grid">
    {ot.map(book => (
      <div class="book-card card">
        <span class="book-zh">{book.zh}</span>
        <span class="book-en">{book.english}</span>
        <span class="book-osis mono">{book.osis}</span>
      </div>
    ))}
  </div>

  <h2>新約</h2>
  <div class="book-grid">
    {nt.map(book => (
      <div class="book-card card">
        <span class="book-zh">{book.zh}</span>
        <span class="book-en">{book.english}</span>
        <span class="book-osis mono">{book.osis}</span>
      </div>
    ))}
  </div>
</section>

<style>
  .book-grid-section h2 {
    margin: 2rem 0 1rem;
    font-size: var(--font-xl);
  }
  .book-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.8rem;
  }
  .book-card {
    text-align: center;
    padding: 1rem;
  }
  .book-zh {
    display: block;
    font-size: var(--font-lg);
    font-weight: 700;
  }
  .book-en {
    display: block;
    font-size: var(--font-sm);
    color: var(--color-text-secondary);
  }
  .book-osis {
    display: block;
    font-size: var(--font-xs);
    color: var(--color-text-muted);
    margin-top: 0.3rem;
  }
</style>
```

- [ ] **Step 2: 建立 books.astro 頁面**

建立 `web/src/pages/books.astro`：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import BookGrid from '../components/static/BookGrid.astro';
---

<BaseLayout title="書卷總覽" description="聖經 66 卷書 OSIS / 英文 / 中文 / 別名對照表">
  <h1 style="margin: 2rem 0 0;">書卷總覽</h1>
  <p style="color: var(--color-text-secondary); margin-bottom: 1rem;">
    目前收錄 30 卷書。完整 66 卷將於後續階段補齊。
  </p>
  <BookGrid />
</BaseLayout>
```

- [ ] **Step 3: 驗證 build 包含 books 頁面**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx astro build && ls dist/books/
```

Expected: 產出 `dist/books/index.html`。

- [ ] **Step 4: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/components/static/BookGrid.astro web/src/pages/books.astro
git commit -m "feat(web): add /books static page with book grid"
```

---

### Task 12: 靜態頁面 — /legend 分析碼圖例

**Files:**
- Create: `web/src/components/static/LegendTable.astro`
- Create: `web/src/pages/legend.astro`

- [ ] **Step 1: 建立 LegendTable.astro**

建立 `web/src/components/static/LegendTable.astro`：

```astro
---
import codesData from '../../data/analyticalCodes.json';

const { analyticalCodeLegend, abbreviationLegend, grammarNotes } = codesData as {
  analyticalCodeLegend: Record<string, string>;
  abbreviationLegend: Record<string, string>;
  grammarNotes: Record<string, string>;
};
---

<section>
  <h2>分析碼圖例</h2>
  <table class="legend-table">
    <thead>
      <tr><th>代碼</th><th>說明</th></tr>
    </thead>
    <tbody>
      {Object.entries(analyticalCodeLegend).map(([code, desc]) => (
        <tr>
          <td class="mono">{code}</td>
          <td>{desc}</td>
        </tr>
      ))}
    </tbody>
  </table>

  <h2 style="margin-top: 2rem;">縮寫說明</h2>
  <table class="legend-table">
    <thead>
      <tr><th>項目</th><th>說明</th></tr>
    </thead>
    <tbody>
      {Object.entries(abbreviationLegend).map(([key, desc]) => (
        <tr>
          <td class="mono">{key}</td>
          <td>{desc}</td>
        </tr>
      ))}
    </tbody>
  </table>

  <h2 style="margin-top: 2rem;">文法使用注記</h2>
  <ul class="grammar-notes">
    {Object.entries(grammarNotes).map(([key, note]) => (
      <li><strong>{key}:</strong> {note}</li>
    ))}
  </ul>
</section>

<style>
  .legend-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
    font-size: var(--font-sm);
  }
  .legend-table th, .legend-table td {
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
  }
  .legend-table th {
    background: var(--color-surface);
    font-family: var(--font-sans);
    font-weight: 700;
  }
  .legend-table tr:hover td {
    background: var(--color-surface-hover);
  }
  .grammar-notes {
    margin-top: 1rem;
    padding-left: 1.5rem;
    font-size: var(--font-sm);
    line-height: 1.8;
  }
  .grammar-notes li {
    margin-bottom: 0.5rem;
  }
</style>
```

- [ ] **Step 2: 建立 legend.astro 頁面**

建立 `web/src/pages/legend.astro`：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import LegendTable from '../components/static/LegendTable.astro';
---

<BaseLayout title="分析碼圖例" description="原文分析碼、縮寫、文法注記完整對照表">
  <h1 style="margin: 2rem 0 0;">分析碼圖例</h1>
  <LegendTable />
</BaseLayout>
```

- [ ] **Step 3: 驗證 build**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx astro build && ls dist/legend/
```

Expected: 產出 `dist/legend/index.html`。

- [ ] **Step 4: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/components/static/LegendTable.astro web/src/pages/legend.astro
git commit -m "feat(web): add /legend static page with analytical code tables"
```

---

### Task 13: 靜態頁面 — /lexicon 與 /lexicon/[id]

**Files:**
- Create: `web/src/pages/lexicon/index.astro`
- Create: `web/src/pages/lexicon/[id].astro`

- [ ] **Step 1: 建立 lexicon/index.astro**

建立 `web/src/pages/lexicon/index.astro`：

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import lexiconData from '../../data/lexicon.json';

type LexiconEntry = {
  strongs: string; lemma: string; language: string;
  transliteration: string; short_definition: string; literal_gloss_en: string;
  pronunciation_bopomofo: string;
};
const entries = (lexiconData as LexiconEntry[]).sort((a, b) => a.strongs.localeCompare(b.strongs));
const base = import.meta.env.BASE_URL;
---

<BaseLayout title="原文字典" description="Strong's 編號字典索引">
  <h1 style="margin: 2rem 0 1rem;">原文字典</h1>
  <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">
    目前收錄 {entries.length} 筆條目（MVP 資料）。
  </p>
  <div class="lexicon-grid">
    {entries.map(entry => (
      <a href={`${base}lexicon/${entry.strongs}`} class="card lexicon-card">
        <span class="strongs mono">{entry.strongs}</span>
        <span class="lemma" lang={entry.language === 'Hebrew' ? 'he' : 'grc'}
              dir={entry.language === 'Hebrew' ? 'rtl' : 'ltr'}>
          {entry.lemma}
        </span>
        <span class="gloss">{entry.literal_gloss_en} — {entry.short_definition}</span>
      </a>
    ))}
  </div>
</BaseLayout>

<style>
  .lexicon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  .lexicon-card {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    text-decoration: none;
    color: var(--color-text);
  }
  .strongs {
    font-size: var(--font-sm);
    color: var(--color-text-muted);
  }
  .lemma {
    font-size: var(--font-xl);
  }
  .gloss {
    font-size: var(--font-sm);
    color: var(--color-text-secondary);
  }
</style>
```

- [ ] **Step 2: 建立 lexicon/[id].astro（靜態預渲染）**

建立 `web/src/pages/lexicon/[id].astro`：

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import lexiconData from '../../data/lexicon.json';

type LexiconEntry = {
  strongs: string; normalized_strongs: string; lemma: string; language: string;
  transliteration: string; pronunciation_bopomofo: string;
  short_definition: string; literal_gloss_en: string;
  common_inflections: string[]; analytical_notes: string[];
};

const entries = lexiconData as LexiconEntry[];

export function getStaticPaths() {
  return (lexiconData as LexiconEntry[]).map(e => ({
    params: { id: e.strongs },
  }));
}

const { id } = Astro.params;
const entry = entries.find(e => e.strongs === id)!;
const langTag = entry.language === 'Hebrew' ? 'he' : 'grc';
const langDir = entry.language === 'Hebrew' ? 'rtl' : 'ltr';
---

<BaseLayout
  title={`${entry.lemma} (${entry.strongs})`}
  description={`Strong's ${entry.strongs} ${entry.lemma}: ${entry.short_definition}`}
>
  <article style="margin: 2rem 0;">
    <h1>
      <span lang={langTag} dir={langDir}>{entry.lemma}</span>
      <span class="mono" style="font-size: var(--font-lg); color: var(--color-text-muted); margin-left: 0.5rem;">
        {entry.strongs}
      </span>
    </h1>

    <div class="detail-grid">
      <div class="card">
        <h3>基本資訊</h3>
        <dl>
          <dt>語言</dt><dd>{entry.language}</dd>
          <dt>音譯</dt><dd>{entry.transliteration}</dd>
          <dt>注音</dt><dd>{entry.pronunciation_bopomofo}</dd>
          <dt>簡義</dt><dd>{entry.short_definition}</dd>
          <dt>英文 Gloss</dt><dd>{entry.literal_gloss_en}</dd>
        </dl>
      </div>

      <div class="card">
        <h3>常見變形</h3>
        <ul>
          {entry.common_inflections.map(inf => <li class="mono">{inf}</li>)}
        </ul>
      </div>

      <div class="card">
        <h3>分析注記</h3>
        <ul>
          {entry.analytical_notes.map(note => <li>{note}</li>)}
        </ul>
      </div>
    </div>
  </article>

  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": entry.transliteration,
    "description": entry.short_definition,
    "inDefinedTermSet": {
      "@type": "DefinedTermSet",
      "name": "Strong's Concordance"
    },
    "identifier": entry.strongs,
    "inLanguage": langTag,
  })} />
</BaseLayout>

<style>
  h1 { margin-bottom: 1.5rem; }
  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  .detail-grid h3 {
    font-size: var(--font-base);
    margin-bottom: 0.8rem;
    color: var(--color-primary);
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.4rem 1rem;
    font-size: var(--font-sm);
  }
  dt {
    font-weight: 700;
    color: var(--color-text-secondary);
  }
  ul {
    padding-left: 1.2rem;
    font-size: var(--font-sm);
  }
  li { margin-bottom: 0.3rem; }
</style>
```

- [ ] **Step 3: 驗證 build 產出所有 lexicon 頁面**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx astro build && ls dist/lexicon/
```

Expected: 產出 `index.html` 和 8 個子目錄（G2064, G2316, G3056, G3361, G3756, H430, H1961, H7225），各含 `index.html`。

- [ ] **Step 4: 驗證結構化資料在 HTML 中**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
grep -o 'DefinedTerm' dist/lexicon/G3056/index.html
```

Expected: 輸出 `DefinedTerm`。

- [ ] **Step 5: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/pages/lexicon/
git commit -m "feat(web): add /lexicon list and /lexicon/[id] pages with structured data"
```

---

### Task 14: 靜態頁面 — /resources 事工資源

**Files:**
- Create: `web/src/components/static/ResourceList.astro`
- Create: `web/src/pages/resources.astro`

- [ ] **Step 1: 建立 ResourceList.astro**

建立 `web/src/components/static/ResourceList.astro`：

```astro
---
const resources = [
  {
    title: 'Living Stream Ministry Publications Catalog',
    kind: 'affirmation_negation',
    language: 'zh/en',
    url: 'https://www.lsm.org/',
    note: '用於查核《肯定與否定》系列授權與可取得版本（需人工確認可用性）。',
  },
  {
    title: 'Taiwan Gospel Book Room',
    kind: 'affirmation_negation',
    language: 'zh',
    url: 'https://www.twgbr.org.tw/',
    note: '可查詢書籍目錄與購買資訊；是否有全文公開需逐篇確認。',
  },
  {
    title: 'Sefaria Hebrew Bible (study reference)',
    kind: 'hebrew_resource',
    language: 'en/he',
    url: 'https://www.sefaria.org/texts/Tanakh',
    note: '可作希伯來文研究輔助資源（非恢復本）。',
  },
  {
    title: 'STEP Bible',
    kind: 'hebrew_resource',
    language: 'en/he/el',
    url: 'https://www.stepbible.org/',
    note: '可作 OT/NT 原文詞形查考輔助資源。',
  },
];

const kindLabels: Record<string, string> = {
  affirmation_negation: '肯定與否定',
  hebrew_resource: '原文研究',
  other: '其他',
};
---

<div class="resource-list">
  {resources.map(r => (
    <div class="card resource-card">
      <div class="resource-header">
        <span class="resource-kind">{kindLabels[r.kind] ?? r.kind}</span>
        <span class="resource-lang mono">{r.language}</span>
      </div>
      <h3><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></h3>
      <p class="resource-note">{r.note}</p>
    </div>
  ))}
</div>

<style>
  .resource-list {
    display: grid;
    gap: 1rem;
  }
  .resource-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  .resource-kind {
    font-size: var(--font-xs);
    color: var(--color-accent);
    font-weight: 700;
    font-family: var(--font-sans);
  }
  .resource-lang {
    font-size: var(--font-xs);
    color: var(--color-text-muted);
  }
  .resource-card h3 {
    font-size: var(--font-base);
    margin-bottom: 0.4rem;
  }
  .resource-card h3 a {
    color: var(--color-primary);
  }
  .resource-note {
    font-size: var(--font-sm);
    color: var(--color-text-secondary);
  }
</style>
```

- [ ] **Step 2: 建立 resources.astro 頁面**

建立 `web/src/pages/resources.astro`：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import ResourceList from '../components/static/ResourceList.astro';
---

<BaseLayout title="事工資源" description="聖經原文研究與恢復本相關資源索引">
  <h1 style="margin: 2rem 0 1rem;">事工資源索引</h1>
  <ResourceList />
</BaseLayout>
```

- [ ] **Step 3: 驗證 build**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx astro build && ls dist/resources/
```

Expected: 產出 `dist/resources/index.html`。

- [ ] **Step 4: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/src/components/static/ResourceList.astro web/src/pages/resources.astro
git commit -m "feat(web): add /resources static page"
```

---

### Task 15: 全部測試 + 完整 Build 驗證

**Files:** 無新增，驗證現有所有檔案。

- [ ] **Step 1: 執行所有單元測試**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx vitest run
```

Expected: 全部 PASS（reference: 6, strongs: 7, analyticalCodes: 5, pronunciation: 4, analyzer: 7, search: 6 = 共 35 tests）。

- [ ] **Step 2: 完整 Astro build**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
npx astro build
```

Expected: Build 成功，無 warning。

- [ ] **Step 3: 驗證所有頁面產出**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer/web
find dist -name 'index.html' | sort
```

Expected output:
```
dist/books/index.html
dist/index.html
dist/legend/index.html
dist/lexicon/G2064/index.html
dist/lexicon/G2316/index.html
dist/lexicon/G3056/index.html
dist/lexicon/G3361/index.html
dist/lexicon/G3756/index.html
dist/lexicon/H1961/index.html
dist/lexicon/H430/index.html
dist/lexicon/H7225/index.html
dist/lexicon/index.html
dist/resources/index.html
```

共 13 個 HTML 頁面。

- [ ] **Step 4: 驗證 HTML 包含 lang 屬性**

```bash
grep -c 'lang="he"' /Users/lightman/weiqi.kids/bible-recovery-analyzer/web/dist/lexicon/H430/index.html
grep -c 'lang="grc"' /Users/lightman/weiqi.kids/bible-recovery-analyzer/web/dist/lexicon/G3056/index.html
```

Expected: 兩者皆 >= 1。

- [ ] **Step 5: 最終 Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add -A web/
git commit -m "feat(web): Plan 1 complete — foundation with 6 lib modules, 35 tests, 13 static pages"
```

---

### Task 16: README.md — 開發環境、維護標準、運作流程、套件清單

**Files:**
- Create: `web/README.md`

- [ ] **Step 1: 建立 README.md**

建立 `web/README.md`：

````markdown
# 聖經恢復本原文字義解析 — 前端 (Astro + React Islands)

## 專案概述

純靜態前端，部署於 GitHub Pages。將現有 FastAPI 後端的功能 100% 網頁化：
- 靜態資料（token, lexicon, 書卷表, 分析碼）嵌入為 JSON
- 純計算邏輯以 TypeScript 在瀏覽器端實作
- 恢復本經文透過 Cloudflare Workers 代理呼叫 LSM API

設計文件：`docs/superpowers/specs/2026-05-06-github-pages-frontend-design.md`

---

## 技術棧

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Astro | 5.x | Islands 架構，靜態生成 |
| 互動 | React | 19.x | Islands hydration |
| 視覺化 | D3.js | 7.x | 圖表 |
| 動畫 | Motion | 12.x | 神蹟特效 (`motion/react`) |
| 粒子 | tsparticles | 3.x | 光粒子聚合 |
| Lottie | lottie-react | 2.x | 精細動畫 |
| 音效 | Howler.js | 2.x | 環境音樂 |
| 程序化音效 | Web Audio API | 原生 | 互動音效 |
| 樣式 | CSS Modules + OKLCH | — | Design tokens |
| 測試 | Vitest | — | 單元測試 |
| 字體 | Noto Serif/Sans TC, Ezra SIL, GentiumPlus | Google Fonts + self-host | 中文 + 原文 |

---

## 開發環境

### 系統需求

- Node.js >= 22
- npm >= 10

### 安裝

```bash
cd web
npm install
```

### 本地開發

```bash
npm run dev          # 啟動 dev server (http://localhost:4321)
```

### 測試

```bash
npm test             # 執行所有單元測試 (Vitest)
npm run test:watch   # 監控模式
```

### Build

```bash
npm run build        # 產出靜態檔案到 dist/
npm run preview      # 預覽 build 結果
```

---

## 目錄結構

```
web/
├── astro.config.mjs          # Astro 配置（site, base, integrations）
├── vitest.config.ts           # Vitest 測試配置
├── public/
│   ├── audio/                 # 環境音樂檔案
│   ├── fonts/                 # self-host 字體 (Ezra SIL, GentiumPlus)
│   └── lottie/                # Lottie 動畫 JSON
├── src/
│   ├── layouts/               # Astro 版面
│   │   └── BaseLayout.astro
│   ├── pages/                 # 路由頁面
│   ├── components/
│   │   ├── islands/           # React Islands（需 hydration 的互動元件）
│   │   └── static/            # Astro 純靜態元件（零 JS）
│   ├── data/                  # 靜態 JSON 資料
│   ├── effects/               # 視覺特效模組
│   ├── audio/                 # 音樂/音效控制模組
│   ├── lib/                   # 移植自 Python 的 TypeScript 邏輯
│   └── styles/                # CSS tokens + 全域樣式
└── tests/                     # 單元測試
```

---

## 資料來源

| 檔案 | 來源 | 內容 |
|------|------|------|
| `src/data/tokens.json` | `seed_data.py` | 10 筆原文 token（MVP） |
| `src/data/lexicon.json` | `seed_data.py` | 8 筆 Strong's lexicon（MVP） |
| `src/data/bookMap.json` | `book_map.py` | 30 卷書對照表 |
| `src/data/analyticalCodes.json` | `analytical_codes.py` | 分析碼圖例 + 文法注記 |

資料由 Python 腳本從後端 `bible_recovery_analyzer/` 匯出。更新流程：

```bash
cd bible_recovery_analyzer
python -c "from scripts.seed_data import ...; ..."  # 見 Plan 1 Task 2
```

---

## TypeScript 模組（src/lib/）

| 模組 | 對應 Python | 功能 |
|------|------------|------|
| `reference.ts` | `services/reference.py` | `normalizeRef()`, `splitOsisRange()` |
| `strongs.ts` | `services/strongs.py` | `normalizeStrongs()` |
| `analyticalCodes.ts` | `services/analytical_codes.py` | `parseAnalyticalCode()` |
| `pronunciation.ts` | `services/pronunciation.py` | `transliterationToZhuyinLike()` |
| `analyzer.ts` | `services/analyzer.py` | 本地 token/lexicon 查詢 |
| `search.ts` | `services/analyzer.py` | 全文跨欄位搜尋 |
| `lsmApi.ts` | `services/recovery/providers.py` | 透過 Worker 呼叫 LSM API |

---

## 頁面路由

| 路由 | 頁面 | 類型 |
|------|------|------|
| `/` | 首頁 | 靜態 + Islands |
| `/study` | 研經主頁 | Islands |
| `/books` | 書卷總覽 | 純靜態 |
| `/legend` | 分析碼圖例 | 純靜態 |
| `/lexicon` | 字典列表 | 靜態 + Islands |
| `/lexicon/[id]` | 個別 Strong's | 預渲染 |
| `/resources` | 事工資源 | 純靜態 |

---

## Design Tokens

- 色彩系統：OKLCH 暖色系，見 `src/styles/tokens.css`
- 亮色 / 深色模式切換（`[data-theme="dark"]`）
- 字體大小三段（標準 20px / 大 26px / 特大 32px），`[data-font-scale]`
- 原文字體額外放大（24px base）
- 所有使用者偏好存 `localStorage`

---

## 維護標準

### 程式碼規範

- TypeScript strict mode
- 所有 `src/lib/` 模組必須有對應的 `tests/lib/` 測試
- 新增 lib 模組前先寫測試（TDD）
- 禁止對外部 API 回傳內容使用 `dangerouslySetInnerHTML`
- 原文片段必須加 `lang` + `dir` 屬性（`lang="he" dir="rtl"`, `lang="grc"`）

### 無障礙

- 色彩對比度 WCAG AA >= 4.5:1（主要文字）
- 所有互動元素必須有 `aria-label`
- `prefers-reduced-motion: reduce` 時關閉動畫
- 字體大小三段可調

### 效能

- Islands hydration 策略：
  - `client:load` — 僅限首屏必要互動（SearchBox, AudioController）
  - `client:idle` — 非首屏互動（特效 Tier 1）
  - `client:visible` — 滾動到可見時（特效 Tier 2, D3 圖表）
  - `client:media` — 條件式（桌面專屬元件）
- 純靜態頁面（books, legend, resources）零 JS
- 字體 preload，音檔 prefetch

### Git 工作流

- 主分支：`main`
- 前端變更觸發 GitHub Actions 自動 build + deploy
- commit message 格式：`feat(web): ...` / `fix(web): ...` / `test(web): ...`

---

## 部署

GitHub Actions 自動部署到 GitHub Pages。

觸發條件：push 到 `main` 且 `web/**` 有變更。

流程：`npm ci` → `npm run build` → deploy `dist/` 到 Pages。

詳見 `.github/workflows/deploy.yml`（Plan 4 實作）。

---

## 相關文件

- 設計文件：`docs/superpowers/specs/2026-05-06-github-pages-frontend-design.md`
- Plan 1（基礎）：`docs/superpowers/plans/2026-05-06-plan1-foundation.md`
- Plan 2（互動）：待建立
- Plan 3（特效 + 音樂）：待建立
- Plan 4（D3 + SEO + 部署）：待建立
- 後端 API：`bible_recovery_analyzer/README.md`
````

- [ ] **Step 2: Commit**

```bash
cd /Users/lightman/weiqi.kids/bible-recovery-analyzer
git add web/README.md
git commit -m "docs(web): add comprehensive README with dev environment, standards, and workflow"
```

---

## Plan 1 完成條件

- [ ] Astro 專案可正常 `build` 且產出 13 個靜態 HTML 頁面
- [ ] 6 個 TypeScript lib 模組全部有對應測試，共 35 tests 全 PASS
- [ ] 4 個靜態 JSON 資料檔正確載入
- [ ] OKLCH design tokens 含亮色/深色模式完整覆蓋
- [ ] FontSizeControl 三段切換 + ThemeToggle 手動切換，偏好存 localStorage
- [ ] 所有頁面含正確的 `lang` + `dir` 屬性
- [ ] Lexicon 頁面含 `DefinedTerm` 結構化資料
- [ ] 響應式佈局基礎就緒（container, grid, 斷點）
- [ ] `web/README.md` 包含完整的開發環境、維護標準、運作流程、套件清單
