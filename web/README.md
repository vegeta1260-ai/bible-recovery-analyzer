# 聖經恢復本原文字義解析 — 前端 (Astro + React Islands)

## 專案概述

純靜態前端，部署於 GitHub Pages。將現有 FastAPI 後端的功能網頁化：
- 靜態資料（token, lexicon, 書卷表, 分析碼）嵌入為 JSON，在瀏覽器端以 TypeScript 運算
- 恢復本經文由前端直接呼叫 LSM API（已確認支援 CORS `Access-Control-Allow-Origin: *`，無需代理）
- 12 種視覺特效 + 環境音樂系統
- OKLCH 暖色系 + 動態字體大小 + 響應式佈局 + 深色模式
- SEO/AEO 優化（結構化資料 JSON-LD、OG tags、預渲染靜態 HTML）

設計文件：`docs/superpowers/specs/2026-05-06-github-pages-frontend-design.md`

---

## 技術棧

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Astro | 6.x | Islands 架構，靜態生成 |
| 互動 | React | 19.x | Islands hydration |
| 視覺化 | D3.js | 7.x | 詞頻圖、分析碼分佈、經節網絡、出現統計 |
| 動畫 | Motion | 12.x | 神蹟特效，import from `motion/react` |
| 粒子 | tsparticles | 3.x | 光粒子聚合文字效果 |
| Lottie | lottie-react | 2.x | 精細動畫 |
| 音效 | Howler.js | 2.x | 環境音樂播放、書卷風格切換、淡入淡出 |
| 程序化音效 | Web Audio API | 原生 | 翻頁聲、鐘聲、環境 pad（~3KB，無外部依賴） |
| 樣式 | CSS Modules + OKLCH | — | Design tokens，暖色系亮色/深色雙模式 |
| 測試 | Vitest | 4.x | 65 個單元測試 |
| 字體 | Noto Serif/Sans TC, Ezra SIL, GentiumPlus | Google Fonts + self-host | 中文 + 原文（SIL OFL 授權） |
| 外部 API | LSM API | — | 恢復本經文（直接呼叫，已確認 CORS OK） |

---

## 已實作功能

### 核心互動
- **SearchBox** — 5 種搜尋模式（經文、字詞、lemma、全文搜尋、詞形搜尋）
- **VerseResult / PassageResult** — 單節/多節經文結果，含恢復本經文 + attribution
- **InterlinearView** — 四行逐字對照（原文、Strong's、分析碼、英文 gloss）+ 恢復本
- **TokenCard** — 23 欄位可展開/收合研究卡
- **漸進渲染** — 本地 token 資料先顯示（不等 LSM），LSM 回傳後光粒子動畫補上恢復本經文

### 視覺特效（12 種）
- 古卷展開、光粒子聚合文字、活水流動進度條
- 書卷級：創世之光、紅海分開、五旬節火焰、復活震動、生命樹、星空穹蒼、鴿子降臨
- MiracleEffectRouter 根據書卷/章節/語義自動選擇特效
- `prefers-reduced-motion: reduce` 時自動關閉

### 音樂系統
- Howler.js 環境音樂，依書卷類型自動切換（摩西五經→中東弦樂、詩篇→豎琴、福音書→弦樂、書信→鋼琴、啟示錄→管風琴合唱）
- Web Audio API 程序化音效（翻頁聲、搜尋完成鐘聲、環境 pad）
- AudioController：右上角控制器 + `M` 鍵快捷靜音 + `aria-live` 通知 + localStorage 記憶偏好
- 音效預設開啟，使用者首次點擊互動元素時觸發

### D3 視覺化（4 種）
- LemmaFrequencyChart — lemma 出現頻率長條圖
- AnalyticalCodePie — 分析碼/詞性分佈圓餅圖
- RelatedVersesNetwork — 共享 lemma 的經節網絡圖
- D3OccurrenceChart — 個別 Strong's 在各經卷的出現分佈

### 無障礙 & 響應式
- FontSizeControl 三段切換（標準 20px / 大 26px / 特大 32px）
- ThemeToggle 深色/亮色模式手動切換 + 自動偵測
- 手機：sticky 搜尋框、TokenCard 預設折疊、Interlinear 水平滑動、D3 圖表不載入改用純文字
- WCAG AA 色彩對比度、鍵盤操作、螢幕閱讀器支援

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
npm test             # 執行所有單元測試 (Vitest, 65 tests)
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
├── astro.config.mjs          # Astro 配置（site, base, integrations, vite alias）
├── vitest.config.ts           # Vitest 測試配置
├── public/
│   ├── audio/                 # 環境音樂 MP3（Pixabay 免費商用授權）
│   ├── fonts/                 # self-host 字體 (Ezra SIL, GentiumPlus)
│   └── lottie/                # Lottie 動畫 JSON
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro   # 共用版面（SEO meta, OG tags, 防閃爍 script）
│   ├── pages/
│   │   ├── index.astro        # 首頁（SearchBox + ScrollUnfold + BookGrid）
│   │   ├── study.astro        # 研經主頁（SearchBox island）
│   │   ├── books.astro        # 書卷總覽（純靜態）
│   │   ├── legend.astro       # 分析碼圖例（純靜態）
│   │   ├── lexicon/
│   │   │   ├── index.astro    # 字典列表
│   │   │   └── [id].astro     # 個別 Strong's（預渲染 + JSON-LD）
│   │   └── resources.astro    # 事工資源（純靜態）
│   ├── components/
│   │   ├── islands/           # React Islands（需 hydration）
│   │   │   ├── SearchBox.tsx          # 5 模式搜尋 + LSM API 呼叫
│   │   │   ├── VerseResult.tsx        # 單節結果 + 特效整合
│   │   │   ├── PassageResult.tsx      # 多節結果
│   │   │   ├── InterlinearView.tsx    # 四行逐字對照
│   │   │   ├── TokenCard.tsx          # 23 欄位研究卡
│   │   │   ├── FontSizeControl.tsx    # 字體三段切換
│   │   │   ├── ThemeToggle.tsx        # 深色模式切換
│   │   │   ├── AudioController.tsx    # 音樂控制 + M 鍵
│   │   │   ├── LemmaFrequencyChart.tsx    # D3 詞頻圖
│   │   │   ├── AnalyticalCodePie.tsx      # D3 分析碼圓餅
│   │   │   ├── RelatedVersesNetwork.tsx   # D3 經節網絡
│   │   │   └── D3OccurrenceChart.tsx      # D3 出現統計
│   │   └── static/            # Astro 純靜態元件（零 JS）
│   │       ├── Header.astro, Footer.astro
│   │       ├── BookGrid.astro, LegendTable.astro
│   │       ├── ResourceList.astro, SkeletonCard.astro
│   ├── effects/               # 12 個視覺特效 React 元件
│   │   ├── MiracleEffectRouter.tsx    # 觸發規則引擎
│   │   ├── ScrollUnfold.tsx, ParticleText.tsx, LivingWaterLoader.tsx
│   │   ├── GenesisLight.tsx, PartingWaters.tsx, PentecostFlames.tsx
│   │   ├── ResurrectionQuake.tsx, TreeOfLife.tsx
│   │   ├── CosmicFirmament.tsx, DoveDescending.tsx
│   ├── audio/                 # 音樂/音效控制模組
│   │   ├── audioStore.ts      # 開/關狀態 + localStorage
│   │   ├── musicManager.ts    # Howler.js 書卷風格切換
│   │   └── webAudioEffects.ts # Web Audio API 程序化音效
│   ├── data/                  # 靜態 JSON 資料
│   │   ├── tokens.json        # 10 筆原文 token（MVP）
│   │   ├── lexicon.json       # 8 筆 Strong's lexicon（MVP）
│   │   ├── bookMap.json       # 30 卷書對照表
│   │   └── analyticalCodes.json # 分析碼圖例 + 文法注記
│   ├── lib/                   # 移植自 Python 的 TypeScript 邏輯
│   └── styles/
│       ├── tokens.css         # OKLCH design tokens（亮色 + 深色）
│       └── global.css         # 全域樣式 + 元件樣式
└── tests/                     # 65 個單元測試（9 test files）
```

---

## 資料架構

### 靜態 JSON（build 時嵌入）

| 檔案 | 來源 | 內容 |
|------|------|------|
| `src/data/tokens.json` | `seed_data.py` | 10 筆原文 token（MVP），含 23 欄位 |
| `src/data/lexicon.json` | `seed_data.py` | 8 筆 Strong's lexicon（MVP） |
| `src/data/bookMap.json` | `book_map.py` | 30 卷書對照表（OSIS/英文/中文/別名） |
| `src/data/analyticalCodes.json` | `analytical_codes.py` | 35 個分析碼 + 縮寫 + 11 條文法注記 |

### 外部 API（runtime）

| API | URL | 用途 | CORS |
|-----|-----|------|------|
| LSM Recovery Version | `https://api.lsm.org/recver/txo.php` | 恢復本經文即時取得 | `Access-Control-Allow-Origin: *` ✓ |

前端直接呼叫，無需任何代理。含自動重試（1 次，間隔 2 秒）和錯誤降級（顯示友善訊息，interlinear/token card 不受影響）。

### 資料更新流程

資料由 Python 腳本從後端 `bible_recovery_analyzer/` 匯出：

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
| `analyzer.ts` | `services/analyzer.py` | 本地 token/lexicon 查詢（JSON 記憶體操作，非 DB） |
| `search.ts` | `services/analyzer.py` | 全文跨欄位搜尋（JSON 記憶體操作） |
| `lsmApi.ts` | `services/recovery/providers.py` | 直接呼叫 LSM API（含重試 + 錯誤處理） |

**注意：** 前端的 analyzer/search 操作的是靜態 JSON 陣列（記憶體），不是資料庫查詢。後端 Python 版本的 DB 效能問題（如 `_inject_occurrence_summary` 多次查詢）在前端不存在。

---

## 頁面路由

| 路由 | 頁面 | 類型 | 狀態 |
|------|------|------|------|
| `/` | 首頁（搜尋 + 書卷入口 + ScrollUnfold） | 靜態 + Islands | 已完成 |
| `/study` | 研經主頁（SearchBox + D3 圖表） | Islands | 已完成 |
| `/books` | 書卷總覽 | 純靜態（零 JS） | 已完成 |
| `/legend` | 分析碼圖例 | 純靜態（零 JS） | 已完成 |
| `/lexicon` | 字典列表 | 靜態 + Islands | 已完成 |
| `/lexicon/[id]` | 個別 Strong's（8 頁，含 JSON-LD + D3） | 預渲染 | 已完成 |
| `/resources` | 事工資源 | 純靜態（零 JS） | 已完成 |

共 14 個靜態 HTML 頁面。

---

## 效能策略

### Islands hydration 分層

| 策略 | 時機 | 用於 |
|------|------|------|
| `client:load` | 頁面載入立即 | SearchBox, AudioController, FontSizeControl, ThemeToggle |
| `client:idle` | 瀏覽器閒置時 | 特效 Tier 1（粒子、活水） |
| `client:visible` | 滾動進入視窗 | 特效 Tier 2（神蹟特效）、D3 圖表 |
| `client:media` | 符合 media query | 桌面專屬元件（手機不載入 D3） |
| 不標註 | 永不載入 JS | books, legend, resources 頁面 |

### 漸進渲染

1. HTML 靜態內容立即顯示（預渲染）
2. CSS 動畫啟動（骨架屏脈動，純 CSS）
3. SearchBox hydrate，可開始搜尋
4. 搜尋後：本地 token 資料先渲染 interlinear + token cards
5. LSM API 回傳後：光粒子動畫顯示恢復本經文
6. 背景載入特效引擎、D3 圖表

---

## Design Tokens

- 色彩系統：OKLCH 暖色系，見 `src/styles/tokens.css`
- 亮色 / 深色模式完整覆蓋（22 個 token 全部有深色版本）
- 切換方式：ThemeToggle 手動 + `prefers-color-scheme` 自動，localStorage 記憶
- 字體大小三段（標準 20px / 大 26px / 特大 32px），`[data-font-scale]`
- 原文字體額外放大（24px base）
- 語義色：希伯來文（暖紅棕）、希臘文（靛藍）、恢復本（沉穩綠）
- 特效色：火焰、活水、光芒、星空、粒子各有專屬 token

---

## 維護標準

### 程式碼規範

- TypeScript strict mode
- 所有 `src/lib/` 模組必須有對應的 `tests/lib/` 測試
- 新增 lib 模組前先寫測試（TDD）
- 禁止對任何外部 API 回傳內容使用 `dangerouslySetInnerHTML`
- 原文片段必須加 `lang` + `dir` 屬性（`lang="he" dir="rtl"`, `lang="grc"`）

### 無障礙

- 色彩對比度 WCAG AA >= 4.5:1（主要文字）
- 所有互動元素必須有 `aria-label`
- `prefers-reduced-motion: reduce` 時關閉所有粒子/震動/火焰特效
- 字體大小三段可調，原文字體額外放大
- 音樂狀態變更用 `aria-live="polite"` 通知螢幕閱讀器

### Git 工作流

- 主分支：`main`
- commit message 格式：`feat(web): ...` / `fix(web): ...` / `test(web): ...`
- 每次 push 到 `main` 自動觸發 build + deploy（見下方部署章節）

---

## 部署

### 自動部署流程

**push 到 `main` → GitHub Actions 自動 build → 推到 `gh-pages` 分支 → GitHub Pages 自動更新**

| 步驟 | 執行者 | 說明 |
|------|--------|------|
| 1. push 到 main | 開發者 | 任何檔案變更都會觸發 |
| 2. `npm install` | GitHub Actions | 在 CI 環境安裝依賴 |
| 3. `npm run build` | GitHub Actions | Astro build 產出 `web/dist/` |
| 4. 推到 gh-pages | `peaceiris/actions-gh-pages` | 自動將 `dist/` 內容推到 `gh-pages` 分支 |
| 5. 發布 | GitHub Pages | 偵測 `gh-pages` 分支變更，自動發布靜態檔案 |

- Workflow 檔案：`.github/workflows/deploy-pages.yml`
- GitHub Pages 設定：Source = **Deploy from a branch**, Branch = **gh-pages / root**
- 線上網址：https://vegeta1260-ai.github.io/bible-recovery-analyzer/

### 手動部署（備用）

如果 GitHub Actions 無法使用，可從本地手動部署：

```bash
cd web
npm run build
cd /tmp && rm -rf gh-deploy && mkdir gh-deploy && cd gh-deploy
git init -b gh-pages
cp -r /path/to/web/dist/* .
touch .nojekyll
git add -A && git commit -m "Deploy"
git remote add origin git@github.com:vegeta1260-ai/bible-recovery-analyzer.git
git push origin gh-pages --force
```

---

## 標準作業程序 (SOP)

### SOP 1：日常開發流程

```
1. 修改程式碼
2. 本地測試：npm test
3. 本地預覽：npm run dev → http://localhost:4321/bible-recovery-analyzer/
4. 確認沒問題後 commit + push main
5. GitHub Actions 自動 build + deploy（約 1 分鐘）
6. 確認線上：https://vegeta1260-ai.github.io/bible-recovery-analyzer/
```

### SOP 2：新增靜態頁面

```
1. 建立 web/src/pages/新頁面.astro
2. 引入 BaseLayout：
   ---
   import BaseLayout from '../layouts/BaseLayout.astro';
   ---
   <BaseLayout title="頁面標題" description="SEO 描述">
     <h1>內容</h1>
   </BaseLayout>
3. 如需導覽連結，在 web/src/components/static/Header.astro 的 navItems 加入
4. npm run build 確認頁面產出
5. commit + push
```

### SOP 3：新增 React Island 元件

```
1. 建立 web/src/components/islands/元件名.tsx
2. 在 .astro 頁面中引入，選擇正確的 hydrate 策略：
   - client:load — 首屏必要互動
   - client:idle — 非首屏
   - client:visible — 滾動到才載入
   - client:media="(min-width: 768px)" — 桌面專屬
3. 如果元件用到 @/ alias import，確認 astro.config.mjs 的 vite.resolve.alias 有設定
4. npm run build 確認 build 成功
5. commit + push
```

### SOP 4：新增視覺特效

```
1. 建立 web/src/effects/特效名.tsx（React 元件）
2. 元件開頭必須檢查 prefers-reduced-motion：
   const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if (prefersReducedMotion) return null;
3. 在 web/src/effects/MiracleEffectRouter.tsx 的 EFFECT_RULES 加入觸發規則
4. 使用 client:visible 延遲載入（Tier 2 特效）
5. 如有新的測試規則，更新 web/tests/lib/miracleEffects.test.ts
6. npm test && npm run build
7. commit + push
```

### SOP 5：新增/更換環境音樂

```
1. 從 Pixabay Music (https://pixabay.com/music/) 下載免費商用 MP3
2. 用 ffmpeg 壓縮為 64kbps mono（控制檔案大小）：
   ffmpeg -y -i 原檔.mp3 -b:a 64k -ac 1 web/public/audio/ambient-類型.mp3
3. 音檔命名規則：ambient-{類型}.mp3
   可用類型：pentateuch, history, wisdom, prophecy, gospel, epistle, apocalypse, default
4. 如需新增類型，更新 web/src/audio/musicManager.ts 的 TRACK_MAP 和 BOOK_TYPE_MAP
5. npm run build 確認音檔包含在 dist/audio/
6. commit + push（注意：大音檔會讓 push 變慢，建議壓縮後再推）
```

### SOP 6：更新靜態 JSON 資料

```
1. 在後端 bible_recovery_analyzer/ 修改 seed_data.py 或 book_map.py 等來源
2. 執行 Python 匯出腳本產生新的 JSON（見 Plan 1 Task 2 的腳本）
3. 將產出的 JSON 覆蓋到 web/src/data/ 對應檔案
4. 如有新增 lexicon 條目，確認 web/src/pages/lexicon/[id].astro 的 getStaticPaths() 會正確產生新頁面
5. npm test（確認 lib 模組的測試仍通過）
6. npm run build（確認新頁面產出）
7. commit + push
```

### SOP 7：新增 D3 圖表

```
1. 建立 web/src/components/islands/圖表名.tsx
2. 使用 useRef + useEffect 讓 D3 操作 SVG：
   const svgRef = useRef<SVGSVGElement>(null);
   useEffect(() => { d3.select(svgRef.current)...; }, [data]);
3. 配色使用暖色系 hex（D3/SVG 不支援 oklch）：
   #8B6914, #D4A017, #C4956A, #A0522D, #CD853F
4. 在頁面中使用 client:visible 或 client:idle 載入
5. 手機不載入：client:media="(min-width: 768px)"，手機改用純文字統計
6. npm run build
7. commit + push
```

### SOP 8：修改 Design Tokens（色彩/字體）

```
1. 編輯 web/src/styles/tokens.css
2. 亮色和深色模式都要同步修改（[data-theme="dark"] 區塊）
3. 確認文字/背景組合的 WCAG AA 對比度 >= 4.5:1
4. 特效色不需要滿足 AA，但主要文字色（text, text-secondary）必須滿足
5. npm run build && 用瀏覽器檢查亮色/深色模式
6. commit + push
```

---

## Troubleshooting

### GitHub Actions build 失敗

| 錯誤 | 原因 | 解法 |
|------|------|------|
| `Invalid Version` | package-lock.json 中 sharp 的可選依賴在非本地平台有空版本 | Workflow 已設定 `rm -f package-lock.json && npm install` 繞過 |
| `Module not found @/...` | Vite alias 未設定 | 確認 `astro.config.mjs` 有 `vite.resolve.alias` 指向 `src/` |
| Build timeout | 音檔太大（> 50MB） | 用 ffmpeg 壓縮音檔為 64kbps mono |

### 本地開發問題

| 問題 | 解法 |
|------|------|
| `npm test` 失敗 | 確認 `vitest.config.ts` 的 `@` alias 指向 `/src` |
| 原文字體不顯示 | 確認 `public/fonts/` 有 Ezra SIL / GentiumPlus woff2 檔案 |
| 音效沒聲音 | 瀏覽器要求使用者互動後才允許播放，需先點擊頁面任何元素 |
| 深色模式閃爍 | BaseLayout.astro 的 `<script is:inline>` 負責防閃爍，確認沒被移除 |

### LSM API 問題

| 問題 | 解法 |
|------|------|
| 恢復本經文載入失敗 | `lsmApi.ts` 已內建重試 1 次（間隔 2 秒），失敗後顯示友善訊息 |
| CORS 錯誤 | LSM API 支援 `Access-Control-Allow-Origin: *`，如果出現 CORS 錯誤表示 LSM 端有變更 |

---

## 資料擴充計畫

MVP 階段使用種子資料（10 token + 8 lexicon + 30 卷書）。後續擴充：

| 階段 | 資料目標 | 來源 | 影響 |
|------|---------|------|------|
| Phase 2 | 完整 66 卷書對照表 | 補齊 book_map.py | 所有書卷輸入可解析 |
| Phase 3 | 全量 NT token (~140,000) | 開源 MorphGNT / SBLGNT | 搜尋/統計/D3 有實用價值 |
| Phase 4 | 全量 OT token (~400,000) | 開源 OSHB / WLC | 完整 OT 覆蓋 |
| Phase 5 | 完整 Strong's lexicon (~8,700) | 開源 Strong's 資料 | 所有 Strong's 有獨立頁面 |

每個 Phase 獨立進行，不阻塞現有功能。依照 SOP 6 更新靜態 JSON 即可。

---

## 相關文件

- 設計文件：`docs/superpowers/specs/2026-05-06-github-pages-frontend-design.md`
- Plan 1（基礎）：`docs/superpowers/plans/2026-05-06-plan1-foundation.md`
- Plan 2（互動）：`docs/superpowers/plans/2026-05-06-plan2-interactive.md`
- Plan 3（特效 + 音樂）：`docs/superpowers/plans/2026-05-06-plan3-effects-audio.md`
- Plan 4（D3 + SEO + 部署）：`docs/superpowers/plans/2026-05-06-plan4-d3-seo-deploy.md`
- 後端 API：`bible_recovery_analyzer/README.md`
