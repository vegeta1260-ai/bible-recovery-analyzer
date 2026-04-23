# Custom GPT / GPT Actions 下一步規劃（本輪只規劃）

## 後端何時算可接 GPT Actions
建議達成以下條件後再接：
1. 本機 smoke test 穩定（`/health`, `/provider-status`, `/verse`, `/passage`, `/interlinear`）
2. `openapi.yaml` 與實際 API route 一致
3. provider 策略固定（預設 mock、正式環境再切換）

## 還需要的條件
- 可公開存取的 HTTPS URL（例如 cloud run / app service / vm + reverse proxy）
- OpenAPI 文件可由 GPT Actions 匯入
- 認證方案（無認證僅限內部測試；正式建議 API key / OAuth）
- 日誌與限流策略（避免濫用）

## 本機先跑通後的推薦順序
1. 將服務部署到一個 HTTPS endpoint
2. 確認 `/openapi.json` 或 `openapi.yaml` 可被外部讀取
3. 在 Custom GPT 中新增 Action，匯入 OpenAPI
4. 先綁定 `mock` provider 做聯調
5. 待 LSM 憑證就緒後，再切換到 `lsm_api` 並重跑整套測試

## 本輪不做事項
- 不直接實作 GPT Actions
- 不接真實憑證
- 不調整既有 provider-based 主架構
