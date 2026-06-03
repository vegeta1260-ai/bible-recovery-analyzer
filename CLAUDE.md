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

## 開發紀律

- **直接在 `main` 開發**（依 SOP，push main 即觸發部署），不需另開分支。
- **CI 有 gate**：push main → `npm test` → `npm run build` → `npm run test:smoke` → deploy，**任一失敗則不部署**（`.github/workflows/deploy-pages.yml`）。
- 改 `web/` 後，push 前建議本地先跑：`cd web && npm test && npm run build && npm run test:smoke`。
- 改動 token/憑證/版權相關行為前，先讀 `bible_recovery_analyzer/docs/lsm_api_preparation.md`。

## 文件導覽

- 根 `README.md` — 兩產品定位、共用資料、憑證處理差異
- `web/README.md` — 前端完整 SOP（含 9 條 SOP）、資料架構、Troubleshooting
- `bible_recovery_analyzer/README.md` — GPT Actions API、provider 架構、本機執行
