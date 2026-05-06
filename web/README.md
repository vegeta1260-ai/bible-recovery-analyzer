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
| 框架 | Astro | 6.x | Islands 架構，靜態生成 |
| 互動 | React | 19.x | Islands hydration |
| 視覺化 | D3.js | 7.x | 圖表（Plan 4） |
| 動畫 | Motion | 12.x | 神蹟特效（Plan 3），import from `motion/react` |
| 粒子 | tsparticles | 3.x | 光粒子聚合（Plan 3） |
| Lottie | lottie-react | 2.x | 精細動畫（Plan 3） |
| 音效 | Howler.js | 2.x | 環境音樂（Plan 3） |
| 程序化音效 | Web Audio API | 原生 | 互動音效（Plan 3） |
| 樣式 | CSS Modules + OKLCH | — | Design tokens |
| 測試 | Vitest | 4.x | 單元測試 |
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
│   ├── audio/                 # 環境音樂檔案（Plan 3）
│   ├── fonts/                 # self-host 字體 (Ezra SIL, GentiumPlus)
│   └── lottie/                # Lottie 動畫 JSON（Plan 3）
├── src/
│   ├── layouts/               # Astro 版面
│   │   └── BaseLayout.astro
│   ├── pages/                 # 路由頁面
│   ├── components/
│   │   ├── islands/           # React Islands（需 hydration 的互動元件）
│   │   └── static/            # Astro 純靜態元件（零 JS）
│   ├── data/                  # 靜態 JSON 資料
│   ├── effects/               # 視覺特效模組（Plan 3）
│   ├── audio/                 # 音樂/音效控制模組（Plan 3）
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

資料由 Python 腳本從後端 `bible_recovery_analyzer/` 匯出。

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
| `lsmApi.ts` | `services/recovery/providers.py` | 透過 Worker 呼叫 LSM API（Plan 2） |

---

## 頁面路由

| 路由 | 頁面 | 類型 |
|------|------|------|
| `/` | 首頁 | 靜態 + Islands |
| `/study` | 研經主頁 | Islands（Plan 2） |
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
