# 專案規則：聖經恢復本及原文字義解析

承全域 `~/CLAUDE.md`。本檔只放此專案特定、且**容易踩錯**的維護重點，細節指向各 README。

## 專案定位（最常被誤解，先讀）

本 repo 是**兩個彼此獨立、執行期零耦合的產品**，共用領域知識但無 runtime 呼叫關係：

- `web/` — Astro 靜態前端（給人用），部署 GitHub Pages，**直連 LSM API** 取恢復本經文
- `bible_recovery_analyzer/` — FastAPI 服務，給 **ChatGPT Custom GPT / GPT Actions** 用的聚合 API

⚠️ **兩者不是前後端關係**。前端完全不呼叫 FastAPI。不要假設「web 是前端、FastAPI 是它的後端」。
→ 全貌見根目錄 `README.md`。

## 維護踩雷（已驗證會絆倒人）

- **LSM ≠ LLM**：LSM = Living Stream Ministry（水流職事站），恢復本聖經出版者，**與語言模型無關**。
- **`web/src/lib/lsmApi.ts` 內的 token 是刻意公開的**：LSM 針對網頁核發的 `web_` 公開 token，設計即供瀏覽器端使用。**不要當成洩漏去「修」或輪換**。純靜態站無 server 可代理，憑證落在 client 是預期取捨。
  - 但後端 `bible_recovery_analyzer/` 的 LSM 憑證走 `.env`、**禁止寫進 repo** —— 此規則只適用後端。
- **恢復本經文有 LSM 版權，不可離線打包**，一律 runtime 向 LSM API 取。
- **lexicon 只有 `web/src/data/lexicon.json` 一份來源**（build 時嵌入頁面）。**不要**再複製一份到 `web/public/`（舊的 public 副本是無人載入的死檔，已移除）。
- **push 偶爾撞 `Connection closed by 198.18.0.42 port 22`**（本機 VPN/zero-trust 攔 SSH）：非權限/repo 問題，重試幾次即可。
- **token JSON「筆數對但內容全 null」是已發生過的事故**：`web/scripts/compress-tokens.py` 原地覆寫且無防呆，重複執行會把短 key 當原始讀（`t.get("verse_ref")` → None），整批 token 歸零（新約曾被雙壓成 `{"r":null,...}`，舊約倖免）。腳本已改為冪等（偵測短 key 即 SKIP）；`smoke-test-build.sh` 已加「有效內容」gate（只計 `r` 非空者）。**驗 token 一律看「有效筆數」，別只看 `len()`。**
- **OG 書卷卡（`web/public/og/*.png`，66 張）由 `web/scripts/build-og-images.mjs` 在「本機 macOS」產出後 commit**：CJK 靠 macOS 系統字型（resvg）。CI 是 ubuntu、**無中文字型**，所以**絕不可**把產圖加進 `npm build`，否則中文變豆腐。改書名/配色 → 本機 `node scripts/build-og-images.mjs` 重跑 → commit PNG。
- **原文↔恢復本 versification（分章/分節）差異已做 token 重對映**：OSHB(WLC)/MorphGNT 與恢復本（英文慣例）的分章分節邊界不同，否則逐章頁 slot 會與 runtime 恢復本錯位。兩支腳本（皆冪等、token 在 git 可還原）：
  - `web/scripts/remap-joel-mal-versification.py`：Joel/Mal 章層級（Joel 希伯來 4 章→恢 3 章、Mal 反之）。
  - `web/scripts/remap-versification.py`：**節層級，涵蓋 24 卷**（Gen/Exod/Lev/Num/Deut/撒上下/王上下/代上下/Neh/Job/Eccl/Song/Isa/Jer/Ezek/Dan/Hos/Jonah/Mic/Nah/Zech），依 `web/scripts/eng-versification.json`（Copenhagen-Alliance 權威表）把 token 章節重對映為恢復本系統。排除詩篇（題注改由 ChapterRecovery 的 offset 處理，見 `web/src/data/versification.json`）、Joel/Mal（上一支處理）、新約（eng.json 未涵蓋；Acts19/Rom16/2Cor13/John7 等希臘文差異仍待處理）。Num25:19 為 WLC 特有、表中未列，腳本內 EXTRA_MAP 手動補。
  - ⚠️ **重跑 OT ETL（`etl-oshb.py`）會讓這些卷退回原文分節 → 之後必須「兩支 remap 都再跑一次」**。驗證：`node web/scripts/scan-versification.mjs` 後 `versification.json` 的 review 應只剩新約 4 章（其餘為詩篇 offset 62 + 3John merge）。
- **Strong's 出現索引（`web/src/data/strongs-occurrences.json`）由 token 衍生**：`web/scripts/build-strongs-occurrences.py` 掃 `public/data/tokens/*.json` 算出「每個 Strong's → 出現章節」，供字典頁靜態列「出現於」連回逐章頁（entity graph / SEO 互鏈，避免 14k 字典頁變爬蟲死路）。冪等可重跑。⚠️ **與 versification remap 同類：重跑任何 token ETL／remap 後，須再跑這支腳本**（章節若改變，索引才正確）。smoke 有 gate（`lexicon/H7225`→`study/Gen/1`、`lexicon/G26`→`study/Matt/24`）。
- **舊約 token lemma 由 Strong's 反查 lexicon 正規化**：OSHB ETL 存入的 `l` 是含 cantillation 的指向形（非字典原形）。`backfill-ot-lemma.py` 令 `l = lexicon[st].lemma`（乾淨字典形），讓原文導覽 chips 與 lemma 搜尋一致。冪等。⚠️ 重跑 OT ETL 後需再跑。surface 仍在 `s`。
- **lexicon 字義去噪（`clean_gloss` 欄）**：`clean-lexicon-gloss.py` 把 Strong's/KJV gloss 大雜燴去 `[idiom]`/括號/`X` 標記取前數詞，並對 ~60 個高頻核心字人工校正詞序（KJV 詞序未必主義在前，如 H430 神原排 angels 後）。字典頁／關鍵字 prose 顯示用此欄。冪等，原地更新 lexicon.json。
- **字典頁「各書卷出現分布」為靜態圖**（非 client D3）：資料來自 `strongs-occurrences.json` 的 `bk`（per-book 次數）。原 `D3OccurrenceChart` 讀空的 `src/data/tokens.json`、每頁空白，已移除。（注意 SearchBox 內 LemmaFrequencyChart/AnalyticalCodePie/RelatedVersesNetwork 仍讀該空檔，為既有待修問題。）
- **字典索引分頁**：`/lexicon` 為輕量目錄（14k 卡曾塞一頁達 4.7MB），完整清單分於 `/lexicon/browse/[page]`（每頁 240 筆，依 H→G 編號排序）。
- **新約 Strong's 來自 ETL 內的 lemma 反查（非原始資料自帶）**：MorphGNT 不含 Strong's。`etl-morphgnt.py` 以字典原形（MorphGNT 第 7 欄）正規化後對 `lexicon.json` 的 G-lemma 反查補上 `strongs_primary`（命中 ~98.7%）。⚠️ **曾踩的雷：原 ETL 誤把第 6 欄（normalized，仍是屈折形如 γενέσεως）當 lemma**，導致新約 lemma 多為變化形、無法對 Strong's、lemma 搜尋失準；已修為第 7 欄（`γένεσις`）。重跑需 `/tmp/sblgnt/*-morphgnt.txt`（github morphgnt/sblgnt，137,554 行）。**舊約（OSHB）token 本就自帶 `st`，不經此反查。**
- **`og:image` 等資產 URL 必須含 base path**（站在 `/bible-recovery-analyzer/` 子路徑）：曾漏 base 導致分享卡圖 404。`BaseLayout` 已用 `siteUrl + base + ogImage` 組；smoke 有 gate。換自訂網域時連同 `astro.config.mjs` 的 `site`/`base`、`robots.txt`、OG 圖 URL 一起改。

## 開發紀律

- **直接在 `main` 開發**（依 SOP，push main 即觸發部署），不需另開分支。
- **CI 有 gate**：push main → `npm test` → `npm run build` → `npm run test:smoke` → deploy，**任一失敗則不部署**（`.github/workflows/deploy-pages.yml`）。smoke 已從 27 項擴到 51 項（含 token 有效內容、sitemap、逐章頁、og:image base、書卷卡入口）。
- **逐章研經落地頁**：`web/src/pages/study/[book]/[chapter].astro` 由 token 動態產 1,189 頁（靜態原文對照 + A 導覽 + B 概要 + 恢復本 runtime）。站內入口＝書卷卡（首頁 / `/books`）連該卷第 1 章。改 `getStaticPaths` 後務必 `npm run test:smoke` 確認頁數不掉。
- **Cloudflare Web Analytics**：build 讀 `PUBLIC_CF_BEACON_TOKEN`（GitHub repo variable），未設則不注入 beacon。CI 已接線（`deploy-pages.yml` build 步驟的 env）。
- 改 `web/` 後，push 前建議本地先跑：`cd web && npm test && npm run build && npm run test:smoke`。
- 改動 token/憑證/版權相關行為前，先讀 `bible_recovery_analyzer/docs/lsm_api_preparation.md`。

## 文件導覽

- 根 `README.md` — 兩產品定位、共用資料、憑證處理差異
- `web/README.md` — 前端完整 SOP、資料架構、逐章頁、OG 圖、sitemap、CF Analytics、Troubleshooting
- `bible_recovery_analyzer/README.md` — GPT Actions API、provider 架構、本機執行
