# Custom GPT / GPT Actions 下一步規劃（readiness 版）

## 後端何時算可接 GPT Actions
建議達成以下條件後再接：
1. 本機 smoke test 穩定（`/health`, `/provider-status`, `/verse`, `/passage`, `/interlinear`）
2. `openapi.yaml` 與實際 API route 一致
3. provider 策略固定（預設 `mock`；部署後依環境切換）
4. `lsm_api` 授權模式與 token 來源在部署文件中明確定義

## GPT Actions 接線前檢查清單
- 具公開 HTTPS endpoint（Cloud Run / App Service / VM+Reverse Proxy）
- `openapi.yaml` 可公開讀取
- 設定 API gateway / auth policy（至少 API key 或 OAuth）
- 記錄 rate limit / 觀測指標（延遲、錯誤率、fallback 比例）
- `.env` 不包含硬編碼 token，改由平台 secret 注入

## 建議 rollout 順序
1. 先以 `mock` provider 聯調 GPT Actions schema
2. 在 staging 使用 `lsm_api` + 測試 token 驗證授權流
3. 確認 response parsing 與 attribution 欄位符合預期
4. 再切 production token，並保留 fallback 開關

## 本輪不做事項
- 不直接實作 GPT Actions 前端配置
- 不提交任何真實憑證
- 不移除既有 provider/target/欄位
