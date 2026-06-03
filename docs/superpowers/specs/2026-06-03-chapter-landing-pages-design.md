# 逐章研經落地頁 + SEO/AEO 強化 — 設計

日期：2026-06-03
狀態：待用戶複審
範圍：`web/`（Astro 靜態前端）

## 背景與問題

實測發現：信徒最自然的搜尋是「一節/一章經文」（如「約翰福音3:16 恢復本」「羅馬書8 原文」），
但本站**沒有任何逐節/逐章的可索引靜態頁** —— 逐章研讀只活在 `/study?q=...` 的 client-side island，
query string 不是獨立可被搜尋引擎收錄的頁面。

```
GET /verse/John.3.16  → 404
GET /John.3.16        → 404
```

結果：站上已預渲染 14,197 個「字典頁」，卻缺了信徒最常搜的「經文頁」。這是人流斷在源頭。
另查：lexicon 頁 `<title>` 為 `ἀγάπη (G26) | 聖經原文解析`，以希臘文字形開頭，
華人信徒打不出、搜不到「agape 意思」「愛 希臘文」。

本設計以「逐章落地頁」為主軸，接住經文搜尋人流；並附帶一批已確認的 SEO/正確性快速修正。

## 版權紅線（貫穿全設計）

- 恢復本中文經文與**恢復本章首綱目**皆為 LSM 版權，**不可離線打包**進靜態頁。
- 凡「可被索引的靜態內容」一律限公共領域（原文 token、Strong's、自製導覽）。
- 恢復本經文一律 runtime 向 LSM API 取，不落地。
- B 概要為自製原創，**明令不得抄襲或貼近恢復本綱目**。

## 範圍總覽（三階段）

| 階段 | 內容 | 交付方式 |
|------|------|----------|
| Phase 0 | 快速修正（SEO/正確性） | 獨立 commit，與 Phase 1 平行 |
| Phase 1 | 逐章頁 A 全量（1,189 章，自動、可索引） | 主功能 |
| Phase 2 | B 概要平行生成（多個 Sonnet agent） | Phase 1 上線後立即執行 |

---

## Phase 0 — 快速修正（獨立 commit）

| # | 項目 | 內容 |
|---|------|------|
| 1 | sitemap + robots | 加 `@astrojs/sitemap` integration；`public/robots.txt` 指向 sitemap。涵蓋全部頁面（含逐章頁） |
| 2 | lsmApi 真退避 | `lsmApi.ts`：對 `5xx/429` 也重試（目前只 catch 網路例外）；重試間 `await sleep(2000)`（目前無延遲）；README/Troubleshooting 同步改成符合現況 |
| 3 | token 節流 | `fetchRecoveryText` 前端去重：同一 ref 短時間內不重打，純防呆保護公開 web token 配額 |
| 4 | Cloudflare Web Analytics | BaseLayout 加一段 beacon script（免費、無 cookie、無 server） |
| 5 | lexicon 標題改寫 | `lexicon/[id].astro` title 改為「transliteration + 中文 gloss 開頭」：`agape ἀγάπη — 愛（G26）`，讓字義搜尋搜得到 |
| 6 | h1 LCP 檢查 | 確認首頁 `<h1>` 在初始 HTML 即「可見」（非靠 `ScrollUnfold` JS 動畫才顯示）；若靠 JS，調整為初始可見、動畫僅錦上添花 |

Phase 0 各項皆有單元/煙霧測試覆蓋（見「測試」）。

---

## Phase 1 — 逐章研經落地頁（A 全量）

### 路由與頁面

- 網址：`/study/[book]/[chapter]`（例 `/study/John/3`），與既有 `/study` island 並存不衝突（Astro `study.astro` 與 `study/` 目錄可共存）。
- `book` 用 OSIS 代碼（與 `bookMap.json`、token 檔名一致）。
- 頁數：66 卷全部章數，約 1,189 頁。

### 三段式閱讀動線（已確認）

由上而下，符合信徒落地順序「確認章 → 抓重點 → 看資料 → 讀經文」：

1. **標題區**：H1「約翰福音 第3章 — 原文逐字解析」+ 分享鈕。
2. **B 本章概要（選填）**：3–4 行人話概要。有資料才顯示；無則略過，不開天窗。
3. **A 本章導覽地圖（預設收合，`▸ 點開`）**：研究工具抽屜，單純讀經者不被干擾。
4. **逐節經文（主體）**：逐節原文逐字對照（靜態）+ 恢復本經文（runtime 疊上）。

手機版同序、單欄；A 為折疊塊，不會洗版。

### A 導覽地圖內容（全部公共領域、build 時靜態烤入 → 可索引）

- 本章節數、希臘/希伯來文 token 數。
- **本章高頻原文關鍵字**（lemma + 中文 gloss + 出現次數）。
- **Strong's 熱點**（連到既有 `/lexicon/[id]`）。
- **相關經節**：與本章共享原文 lemma 的其他經節，**結果取 top-N 上限**（避免 build 爆量）。
- **逐節入口**：3:1 · 3:2 …（錨點）。

### 逐節原文對照

- 原文、Strong's、詞形、英文 gloss —— 皆公共領域，**build 時靜態烤入**（可索引，這是 SEO 主要內容）。
- 恢復本中文：client island 於頁面載入後 fetch **整章一次**（`String=John.3`），用既有漸進渲染補上；套用 Phase 0 #3 節流。

### SEO / AEO

BaseLayout 現況：已具 og:title/description/type/url/image(1200×630)、twitter summary_large_image、canonical、每頁 `ogImage`/`canonicalUrl` props。缺口補強：

1. **JSON-LD（AEO 核心）**：BaseLayout 加 `head` 具名 slot（或 `jsonLd` prop）。逐章頁注入：
   - `BreadcrumbList`：首頁 › 書卷 › 約翰福音 › 第3章。
   - `Article`/`CreativeWork`：`about`=本章、`isPartOf`=書卷、`inLanguage`=zh-Hant、`keywords`=本章高頻原文字。
2. **`og:type` 改可覆寫**：目前硬寫 `website`；逐章頁傳 `article`。
3. **每章專屬 title + description（自動生成）**：description 含本章高頻字，吃中長尾搜尋。
4. **OG 縮圖：每書卷一張，共 66 張**：build 時用 `sharp`（已是相依）合成「書卷名 + 主題色」卡；該書各章共用。成本極低、分享看得出是哪卷。

### 資料流與 build

- 新增 ETL `scripts/build-chapter-index.py`：預先算每章高頻 lemma、Strong's 熱點，
  並建 `lemma → 經節` 索引供「相關經節」（結果設上限）。輸出靜態 JSON 供 build 取用。
- 新增 `scripts/build-og-images`（用 `sharp`）：產 66 張書卷 OG 卡到 `public/og/`。
- `study/[book]/[chapter].astro` 的 `getStaticPaths` 讀章索引 + 切該章 token，產 1,189 頁。

---

## Phase 2 — B 概要平行生成（Phase 1 上線後立即執行）

- **選填機制**：資料檔 `src/data/chapter-outlines/[Book].json`（key：章號 → 概要文字）。頁面有就顯示、沒有就只顯示 A。
- **平行執行**：用 `dispatching-parallel-agents`，派**多個 Sonnet agent**，每 agent 負責一批書卷。
- **受限 prompt（硬性約束）**：
  - 純描述性、神學中性、3–4 行。
  - **不得抄襲或貼近恢復本章首綱目**；僅依公版經文結構與原文資料撰寫。
  - 輸出寫進對應 `chapter-outlines/[Book].json`。
- **覆核**：產出後由用戶逐章覆核，可隨時增修。B 與 A 解耦，可分開迭代。

---

## 測試

- **單元測試**：
  - 章索引計算（高頻字、相關經節 top-N cap）。
  - `/study/[book]/[chapter]` URL 解析與 `getStaticPaths`。
  - B 選填 fallback（無 B 時頁面僅顯示 A）。
  - Phase 0：lsmApi 對 5xx/429 重試 + 延遲；fetchRecoveryText 去重。
- **build 後煙霧測試（`smoke-test-build.sh` 擴充）**：
  - 抽查逐章頁存在、含 H1 / JSON-LD（BreadcrumbList + Article）/ 逐節對照。
  - sitemap 含逐章頁；`public/og/` 66 張書卷 OG 存在；`robots.txt` 存在。
- **部署後煙霧測試（`smoke-test-deployed.sh`）**：
  - 抽幾章驗證線上可達 + LSM 整章經文 live。

---

## 風險與取捨

- **build 量 +1,189 頁**：逐節對照全靜態會增頁重與 build 時間；用 top-N cap 與只烤該章 token 控制。
  若 build 顯著變慢，退一步把逐節對照改 island 延遲載入（犧牲部分 SEO，非首選）。
- **相關經節跨全經料庫計算貴** → 預先建索引、結果設上限。
- **B 神學品質** → 受限 prompt（中性 + 版權約束）+ 用戶逐章覆核把關。
- **OG 66 張**：成本極低；日後若要升級每章 1,189 張，路徑乾淨（換 build script 即可）。

## 非目標（本輪不做）

- 英文 / i18n（已決議擱置）。
- 逐節（單節）獨立頁（本輪做逐章級）。
- B 概要的全量 AI 生成審核流程自動化（人工覆核即可）。
