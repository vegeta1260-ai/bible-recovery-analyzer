# 聖經恢復本原文字義解析 — 前端 (Astro + React Islands)

## 專案概述

純靜態前端，部署於 GitHub Pages。聖經原文字義研究工具：
- **444,339 筆原文 token**（137,554 新約希臘文 + 306,785 舊約希伯來文），按書卷動態載入 + IndexedDB 快取
- **14,197 筆 Strong's 字典**（5,523 希臘文 + 8,674 希伯來文），每筆有獨立頁面含 JSON-LD
- **66 卷書完整對照表**（OSIS / 英文 / 中文 / 別名）
- 恢復本經文由前端直接呼叫 LSM API（Basic auth，已確認 CORS OK）
- 12 種視覺特效 + 5 風格環境音樂
- OKLCH 暖色系 + 動態字體 + 響應式 + 深色模式
- SEO/AEO：14,203 頁預渲染 HTML + JSON-LD + OG tags

線上網址：https://vegeta1260-ai.github.io/bible-recovery-analyzer/

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
| 程序化音效 | Web Audio API | 原生 | 翻頁聲、鐘聲（~3KB，無外部依賴） |
| 樣式 | CSS Modules + OKLCH | — | Design tokens，暖色系亮色/深色雙模式 |
| 測試 | Vitest | 4.x | 61 個單元測試 + 28 項部署煙霧測試 |
| 字體 | Noto Serif/Sans TC, Ezra SIL, GentiumPlus | Google Fonts + self-host | 中文 + 原文（SIL OFL 授權） |
| 外部 API | LSM Recovery Version API | — | 恢復本經文（Basic auth，CORS OK） |

---

## 已實作功能

### 核心互動
- **SearchBox** — 5 種搜尋模式（經文、字詞、lemma、全文搜尋、詞形搜尋）
- **VerseResult / PassageResult** — 單節/多節經文結果，含恢復本經文 + attribution
- **InterlinearView** — 四行逐字對照（原文、Strong's、分析碼、英文 gloss）+ 恢復本
- **TokenCard** — 23 欄位可展開/收合研究卡
- **漸進渲染** — 本地 token 先顯示（不等 LSM），LSM 回傳後光粒子動畫補上恢復本經文
- **按書卷動態載入** — 搜尋時只載入該書卷的 JSON（~1-3MB），IndexedDB 快取後秒開

### 視覺特效（12 種）
- 古卷展開、光粒子聚合文字、活水流動進度條
- 書卷級：創世之光、紅海分開、五旬節火焰、復活震動、生命樹、星空穹蒼、鴿子降臨
- MiracleEffectRouter 根據書卷/章節/語義自動選擇特效
- `prefers-reduced-motion: reduce` 時自動關閉

### 音樂系統
- Howler.js 環境音樂，依書卷類型自動切換（摩西五經→中東弦樂、詩篇→豎琴、福音書→弦樂、書信→鋼琴、啟示錄→管風琴合唱）
- Web Audio API 程序化音效（翻頁聲、搜尋完成鐘聲）
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
- 手機：搜尋框堆疊、TokenCard 單欄折疊、Interlinear 水平滑動、書卷格子 2 欄
- WCAG AA 色彩對比度、鍵盤操作、螢幕閱讀器支援

---

## 開發環境

### 系統需求

- Node.js >= 22
- npm >= 10
- Python 3（僅 ETL 腳本需要）

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
npm test             # 執行所有單元測試 (Vitest, 61 tests)
npm run test:watch   # 監控模式
```

### Build

```bash
npm run build        # 產出 14,203 頁靜態檔案到 dist/（約 30 秒）
npm run preview      # 預覽 build 結果
```

### 部署後煙霧測試

```bash
bash scripts/smoke-test-deployed.sh                              # 測試線上版本
bash scripts/smoke-test-deployed.sh https://your-domain.com/path  # 測試自訂 URL
```

驗證 28 項：頁面存取、JSON 資料、SEO tags、JSON-LD、JS bundles、導覽連結、LSM API、音檔。

---

## 目錄結構

```
web/
├── astro.config.mjs          # Astro 配置（site, base, integrations, vite alias）
├── vitest.config.ts           # Vitest 測試配置
├── public/
│   ├── audio/                 # 環境音樂 MP3（Pixabay 免費商用授權）
│   │   ├── ambient-pentateuch.mp3  # 摩西五經 — 中東弦樂
│   │   ├── ambient-wisdom.mp3      # 詩篇 — 豎琴
│   │   ├── ambient-gospel.mp3      # 福音書 — 弦樂四重奏
│   │   ├── ambient-apocalypse.mp3  # 啟示錄 — 管風琴合唱
│   │   └── ambient-default.mp3     # 預設/書信 — 安靜鋼琴
│   ├── data/
│   │   ├── tokens/            # 按書卷分割的原文 token JSON（66 檔）
│   │   │   ├── Gen.json       # 創世記 20,629 tokens
│   │   │   ├── John.json      # 約翰福音 15,438 tokens
│   │   │   └── ...            # 其餘 64 卷
│   │   └── lexicon.json       # 14,197 筆 Strong's 字典（動態載入用）
│   ├── fonts/                 # self-host 字體 (Ezra SIL, GentiumPlus)
│   ├── og-default.png         # OG 社群分享預覽圖
│   └── lottie/                # Lottie 動畫 JSON
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro   # 共用版面（SEO meta, OG tags, 防閃爍 script）
│   ├── pages/                 # 路由頁面（14,203 頁）
│   ├── components/
│   │   ├── islands/           # React Islands（12 個互動元件）
│   │   └── static/            # Astro 純靜態元件（6 個，零 JS）
│   ├── effects/               # 12 個視覺特效 React 元件
│   ├── audio/                 # 音樂/音效控制模組
│   ├── data/                  # Build 時嵌入的 JSON
│   │   ├── bookMap.json       # 66 卷書對照表
│   │   ├── lexicon.json       # 14,197 筆 Strong's（build 時用）
│   │   └── analyticalCodes.json # 分析碼圖例 + 文法注記
│   ├── lib/                   # 7 個 TypeScript 邏輯模組
│   └── styles/
│       ├── tokens.css         # OKLCH design tokens（亮色 + 深色）
│       └── global.css         # 全域樣式 + 響應式 + 手機版
├── scripts/
│   ├── etl-morphgnt.py        # MorphGNT → NT token JSON
│   ├── etl-oshb.py            # OSHB → OT token JSON
│   ├── compress-tokens.py     # 壓縮 token JSON（短 key + 去空欄位）
│   ├── build-full-bookmap.py  # 產生完整 66 卷 bookMap.json
│   ├── build-lexicon.py       # 產生完整 Strong's lexicon.json
│   ├── fill-gloss.py          # 從 lexicon 反查填入 token 英文 gloss
│   └── smoke-test-deployed.sh # 部署後 28 項煙霧測試
└── tests/                     # 61 個單元測試（9 test files）
```

---

## 資料架構

### 按書卷動態載入的 Token（public/data/tokens/）

| 資料 | 筆數 | 來源 | 載入方式 |
|------|------|------|---------|
| NT 希臘文 token | 137,554 | MorphGNT (SBLGNT) | 按書卷 fetch + IndexedDB 快取 |
| OT 希伯來文 token | 306,785 | OSHB (WLC) | 按書卷 fetch + IndexedDB 快取 |
| **合計** | **444,339** | | |

每個 token 含：surface_form, normalized_form, lemma, strongs, analytical_code, part_of_speech, morphology_features, literal_gloss_en 等欄位。

### Build 時嵌入的資料（src/data/）

| 檔案 | 筆數 | 說明 |
|------|------|------|
| `bookMap.json` | 66 | 完整 66 卷書（OSIS/英文/中文/別名） |
| `lexicon.json` | 14,197 | Strong's 字典（5,523 Greek + 8,674 Hebrew） |
| `analyticalCodes.json` | 35 codes | 分析碼圖例 + 縮寫 + 11 條文法注記 |

### 外部 API（runtime）

| API | URL | 認證 | CORS |
|-----|-----|------|------|
| LSM Recovery Version | `https://api.lsm.org/recver/txo.php` | Basic auth (APP_ID:TOKEN) | `Access-Control-Allow-Origin: *` |

前端直接呼叫，無需代理。含自動重試（1 次，間隔 2 秒）和錯誤降級。

---

## TypeScript 模組（src/lib/）

| 模組 | 功能 | 同步/非同步 |
|------|------|------------|
| `reference.ts` | `normalizeRef()`, `splitOsisRange()` — 經文引用解析 | 同步 |
| `strongs.ts` | `normalizeStrongs()` — Strong's 編號正規化 | 同步 |
| `analyticalCodes.ts` | `parseAnalyticalCode()` — 分析碼展開 | 同步 |
| `pronunciation.ts` | `transliterationToZhuyinLike()` — 音譯轉注音 | 同步 |
| `analyzer.ts` | `getVerseTokens()`, `lookupStrongs()`, `lookupWord()`, `lookupLemma()`, `loadBookTokens()` | 非同步（按書卷動態載入） |
| `search.ts` | `search()` — 全文跨欄位搜尋 | 非同步（遍歷所有書卷） |
| `lsmApi.ts` | `fetchRecoveryText()` — LSM API Basic auth 呼叫 | 非同步 |

---

## 頁面路由

| 路由 | 頁面 | 類型 | 頁數 |
|------|------|------|------|
| `/` | 首頁（搜尋 + 書卷入口 + ScrollUnfold） | 靜態 + Islands | 1 |
| `/study` | 研經主頁（SearchBox + D3 圖表） | Islands | 1 |
| `/books` | 書卷總覽（66 卷） | 純靜態（零 JS） | 1 |
| `/legend` | 分析碼圖例 | 純靜態（零 JS） | 1 |
| `/lexicon` | 字典列表 | 靜態 | 1 |
| `/lexicon/[id]` | 個別 Strong's（含 JSON-LD + D3） | 預渲染 | 14,197 |
| `/resources` | 事工資源 | 純靜態（零 JS） | 1 |
| **合計** | | | **14,203** |

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

### Token 載入策略

1. 搜尋「約1:1」→ fetch `/data/tokens/John.json`（~2.9MB，gzip ~900KB）
2. 解壓 compressed token → 展開為完整 Token 物件
3. 存入 IndexedDB，下次搜尋約翰福音直接從快取讀取
4. 同時 fetch LSM API 取恢復本經文（平行）

---

## 部署

### 自動部署流程

**push 到 `main` → GitHub Actions 自動 build → 推到 `gh-pages` 分支 → GitHub Pages 自動更新**

| 步驟 | 執行者 | 說明 |
|------|--------|------|
| 1. push 到 main | 開發者 | 任何檔案變更都會觸發 |
| 2. `npm install` | GitHub Actions | 在 CI 環境安裝依賴 |
| 3. `npm run build` | GitHub Actions | Astro build 14,203 頁（~30 秒） |
| 4. 推到 gh-pages | `peaceiris/actions-gh-pages` | 自動將 `dist/` 推到 `gh-pages` 分支 |
| 5. 發布 | GitHub Pages | 偵測 `gh-pages` 分支變更，自動發布 |

- Workflow 檔案：`.github/workflows/deploy-pages.yml`
- GitHub Pages 設定：Source = **Deploy from a branch**, Branch = **gh-pages / root**

### 部署驗證

```bash
bash web/scripts/smoke-test-deployed.sh
# 28 項檢查：頁面、資料、SEO、API、音檔
```

### 手動部署（備用）

```bash
cd web && npm run build
cd /tmp && rm -rf gh-deploy && mkdir gh-deploy && cd gh-deploy
git init -b gh-pages
cp -r /path/to/web/dist/* . && touch .nojekyll
git add -A && git commit -m "Deploy"
git remote add origin https://github.com/vegeta1260-ai/bible-recovery-analyzer.git
git push origin gh-pages --force
```

---

## 標準作業程序 (SOP)

### SOP 1：日常開發流程

```
1. 修改程式碼
2. 本地測試：npm test（61 tests）
3. 本地預覽：npm run dev → http://localhost:4321/bible-recovery-analyzer/
4. commit + push main
5. GitHub Actions 自動 build + deploy（~1 分鐘）
6. 煙霧測試：bash scripts/smoke-test-deployed.sh（28 項）
7. 確認線上：https://vegeta1260-ai.github.io/bible-recovery-analyzer/
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

### SOP 6：更新原文 Token 資料

```
1. 下載最新語料庫到 /tmp/：
   git clone --depth 1 https://github.com/morphgnt/sblgnt.git /tmp/sblgnt      # NT
   git clone --depth 1 https://github.com/openscriptures/morphhb.git /tmp/morphhb  # OT
2. 執行 ETL 腳本：
   python3 web/scripts/etl-morphgnt.py    # 產生 NT token JSON
   python3 web/scripts/etl-oshb.py        # 產生 OT token JSON
   python3 web/scripts/compress-tokens.py # 壓縮
   python3 web/scripts/fill-gloss.py      # 從 lexicon 填入英文 gloss
3. npm run build 確認
4. commit + push
```

### SOP 7：更新 Strong's 字典

```
1. 下載最新 Strong's 資料：
   git clone --depth 1 https://github.com/openscriptures/strongs.git /tmp/strongs
2. 執行腳本：
   python3 web/scripts/build-lexicon.py
3. 複製到 public/data/：
   cp web/src/data/lexicon.json web/public/data/lexicon.json
4. npm run build（會重新產生 14,197 個 lexicon 頁面）
5. commit + push
```

### SOP 8：新增 D3 圖表

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

### SOP 9：修改 Design Tokens（色彩/字體）

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
| `Invalid Version` | package-lock.json 中 sharp 可選依賴空版本 | Workflow 已設定 `rm -f package-lock.json && npm install` |
| `Module not found @/...` | Vite alias 未設定 | 確認 `astro.config.mjs` 有 `vite.resolve.alias` 指向 `src/` |
| Build timeout | 14,203 頁面 build 通常 30 秒 | 如超時檢查是否有無限迴圈的 getStaticPaths |

### 本地開發問題

| 問題 | 解法 |
|------|------|
| `npm test` 失敗 | 確認 `vitest.config.ts` 的 `@` alias 指向 `/src` |
| 原文字體不顯示 | 確認 `public/fonts/` 有 Ezra SIL / GentiumPlus woff2 檔案 |
| 音效沒聲音 | 瀏覽器要求使用者互動後才允許播放，需先點擊頁面 |
| 深色模式閃爍 | BaseLayout.astro 的 `<script is:inline>` 負責防閃爍 |
| Token 資料沒載入 | 確認 `public/data/tokens/` 有對應書卷 JSON |

### LSM API 問題

| 問題 | 解法 |
|------|------|
| 恢復本經文載入失敗 | `lsmApi.ts` 內建重試 1 次（2 秒），失敗顯示友善訊息 |
| 401/403 錯誤 | 檢查 `lsmApi.ts` 中的 APP_ID 和 TOKEN 是否有效 |
| CORS 錯誤 | LSM API 支援 `Access-Control-Allow-Origin: *`，出現 CORS 表示 LSM 端有變更 |

---

## 相關文件

- 設計文件：`docs/superpowers/specs/2026-05-06-github-pages-frontend-design.md`
- Plan 1（基礎）：`docs/superpowers/plans/2026-05-06-plan1-foundation.md`
- Plan 2（互動）：`docs/superpowers/plans/2026-05-06-plan2-interactive.md`
- Plan 3（特效 + 音樂）：`docs/superpowers/plans/2026-05-06-plan3-effects-audio.md`
- Plan 4（D3 + SEO + 部署）：`docs/superpowers/plans/2026-05-06-plan4-d3-seo-deploy.md`
- 後端 API：`bible_recovery_analyzer/README.md`
