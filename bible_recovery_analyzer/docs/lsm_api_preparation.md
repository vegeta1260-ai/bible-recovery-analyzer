# LSM API 接線預備（可直接重套在最新 main）

## 已完成能力
目前 `lsm_api provider` 已支援：
- 可配置授權模式（`bearer` / `header` / `query` / `none`）
- token 與 key 兩種來源（優先 `RECOVERY_API_TOKEN`，再退回 `RECOVERY_API_KEY`）
- 多型回應解析（`text`, `verseText`, `recovery_text`, `data.text`, `data.verseText`）
- timeout / retry / auth denied / not found
- 可透過 manager 轉接 `web_fallback`

## 正式接線需要的環境變數
- `RECOVERY_PROVIDER=lsm_api`
- `RECOVERY_API_BASE_URL`
- `RECOVERY_API_AUTH_MODE=bearer|header|query|none`
- `RECOVERY_API_TOKEN`（建議）或 `RECOVERY_API_KEY`（相容舊設定）
- `RECOVERY_API_AUTH_HEADER_NAME`（auth mode=header 時使用）
- `RECOVERY_API_AUTH_QUERY_PARAM`（auth mode=query 時使用）
- `RECOVERY_API_TIMEOUT`
- `RECOVERY_RETRY_ATTEMPTS`
- `RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM`

> `RECOVERY_API_TOKEN` / `RECOVERY_API_KEY` 必須由使用者在本機或部署環境手動填入，不可寫死在 repo。

## 使用者需要手動填寫的 .env 欄位
- `RECOVERY_API_BASE_URL`
- `RECOVERY_API_AUTH_MODE`
- `RECOVERY_API_TOKEN`（若不用 token，則填 `RECOVERY_API_KEY`）
- 若 mode=header：`RECOVERY_API_AUTH_HEADER_NAME`
- 若 mode=query：`RECOVERY_API_AUTH_QUERY_PARAM`
- 若需 fallback：`RECOVERY_WEB_*` 相關欄位

## 等憑證後才可做的測試
- 真實授權測試（401/403）
- 實際 payload mapping 驗證（確認正式 API 欄位對應）
- 壓力與穩定性（retry/timeout）

## 安全要求
- 禁止把 API key / token / secret 寫進 repo。
- CI/CD 使用 secret manager 或部署平台環境變數注入。
