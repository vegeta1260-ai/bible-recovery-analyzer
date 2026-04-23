# LSM API 接線預備（本輪只規劃，不正式接線）

## 現況評估
目前 `lsm_api provider` 架構已具備：
- provider 類別：`LsmApiRecoveryProvider`
- timeout / retry / auth denied / not found 錯誤處理
- 可與 `web_fallback` 串接成 fallback flow（由 manager 控制）

## 未來正式接線需要的環境變數
- `RECOVERY_PROVIDER=lsm_api`
- `RECOVERY_API_BASE_URL`
- `RECOVERY_API_KEY`
- `RECOVERY_API_TIMEOUT`
- `RECOVERY_RETRY_ATTEMPTS`
- `RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM`

> `RECOVERY_API_KEY` 必須由使用者在本機或部署環境手動填入，不可寫死在 repo。

## 使用者未來需要手動填寫的欄位
- `.env` 中的 `RECOVERY_API_BASE_URL`
- `.env` 中的 `RECOVERY_API_KEY`
- 若需 fallback，另外填 `RECOVERY_WEB_*` 相關欄位

## 等憑證後才可做的測試
- 真實授權測試（401/403 驗證）
- 真實資料內容一致性驗證（官方 API 回傳格式）
- 負載 / 穩定性測試（retry 與 timeout 設定）

## 安全要求
- 禁止把 API key / token / secret 寫進 repo。
- CI/CD 使用 secret manager 或部署平台環境變數注入。
