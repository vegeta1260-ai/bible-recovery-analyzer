# 聖經恢復本及原文字義解析

以聖經**原文字義**（希臘文／希伯來文、Strong's、分析碼）結合**恢復本經文**的研經工具集。

本 repo 包含**兩個彼此獨立的活路線產品**，共用相同領域知識（恢復本＋原文字義），但**執行期零耦合** —— 兩者沒有任何 runtime 呼叫關係，可各自獨立開發、測試、部署。

| 產品 | 目錄 | 形態 | 服務對象 | 部署 |
|------|------|------|----------|------|
| **網頁研經工具** | [`web/`](web/) | Astro 靜態前端（React Islands） | 人（瀏覽器） | GitHub Pages（自動 CI） |
| **GPT Actions API** | [`bible_recovery_analyzer/`](bible_recovery_analyzer/) | FastAPI 服務 | ChatGPT Custom GPT / GPT Actions | 本機 / 自架（目前無 CI） |

> ⚠️ 兩者**不是**前後端關係。網頁前端直接呼叫 LSM API 取恢復本經文，**完全不經過** FastAPI；FastAPI 是另一條給 ChatGPT 呼叫的聚合 API。

---

## 1. 網頁研經工具（`web/`）

純靜態前端，部署於 GitHub Pages。

- **444,339 筆原文 token**（137,554 NT 希臘文 + 306,785 OT 希伯來文），按書卷動態載入 + IndexedDB 快取
- **14,197 筆 Strong's 字典**，每筆獨立頁面含 JSON-LD
- **1,189 個逐章研經落地頁**（`/study/[book]/[chapter]`）：靜態原文對照 + 本章導覽 + 本章概要 + 恢復本 runtime + JSON-LD
- **66 卷書完整對照表**（OSIS／英文／中文／別名）+ 每書卷 OG 分享卡
- 恢復本經文由前端直接呼叫 LSM API（Basic auth，CORS OK）
- 視覺特效 + 環境音樂 + OKLCH 暖色系 + 響應式 + 深色模式 + SEO/AEO 預渲染（15,392 頁 + sitemap）

線上網址：<https://vegeta1260-ai.github.io/bible-recovery-analyzer/>

技術棧：Astro 6 + React 19 + D3 7 + Vitest 4。

→ 詳見 [`web/README.md`](web/README.md)

```bash
cd web && npm install && npm run dev   # http://localhost:4321/bible-recovery-analyzer/
```

---

## 2. GPT Actions API（`bible_recovery_analyzer/`）

FastAPI 服務，供 ChatGPT Custom GPT / GPT Actions 呼叫的恢復本＋原文字義聚合 API。

- provider-based recovery 架構（`mock` / `lsm_api` / `web_fallback`）
- 主端點 `/study`（專家聚合），另有 `/verse`、`/passage`、`/interlinear`、`/word`、`/strongs/{id}`、`/search` 等
- OpenAPI 規格：[`bible_recovery_analyzer/openapi.yaml`](bible_recovery_analyzer/openapi.yaml)

技術棧：FastAPI + Pydantic 2 + httpx + SQLAlchemy。

→ 詳見 [`bible_recovery_analyzer/README.md`](bible_recovery_analyzer/README.md)

```bash
cd bible_recovery_analyzer && bash scripts/start_local.sh   # 建議先用 mock provider
```

---

## 共用資料來源

| 資料 | 版權 | 兩產品如何取得 |
|------|------|----------------|
| 原文 token（MorphGNT / OSHB）、Strong's | 公共領域 | 各自打包為靜態資料 |
| 恢復本中文經文 | **LSM（水流職事站）版權所有** | runtime 向 LSM API 認證後取得，**不離線儲存全文** |

> **LSM ≠ LLM**：LSM = Living Stream Ministry（水流職事站），恢復本聖經出版者，與語言模型無關。

### 憑證處理（兩產品不同）

- **網頁**：使用 LSM 針對網頁應用核發、設計即供瀏覽器端公開使用的 web token（`web_` 前綴），已確認可公開隨 bundle 上線。見 `web/src/lib/lsmApi.ts` 註解。
- **GPT API**：LSM 憑證一律走環境變數（`.env`），**禁止寫進 repo**。見 `bible_recovery_analyzer/docs/lsm_api_preparation.md`。

---

## 安全與機密

- 後端 `.env`、真實 LSM token、Action API key、含 secret 的 probe／smoke 輸出 —— **一律不得 commit**。
- 例外：網頁端的公開 web token 為 LSM 設計可公開者（見上）。
