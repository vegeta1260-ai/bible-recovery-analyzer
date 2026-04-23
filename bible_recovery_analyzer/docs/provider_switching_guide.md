# Provider Switching Guide

## 支援 provider
- `mock`
- `lsm_api`
- `web_fallback`

## 核心環境變數
- `RECOVERY_PROVIDER=mock|lsm_api|web_fallback`
- `RECOVERY_API_AUTH_MODE=bearer|header|query|none`
- `RECOVERY_API_TOKEN`（建議）或 `RECOVERY_API_KEY`（相容）
- `RECOVERY_API_AUTH_HEADER_NAME`（mode=header）
- `RECOVERY_API_AUTH_QUERY_PARAM`（mode=query）
- `SIMULATE_LSM_REJECTION=true|false`
- `RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM=true|false`
- `RECOVERY_WEB_BASE_URL`
- `RECOVERY_WEB_FETCH_ENABLED=true|false`
- `RECOVERY_WEB_USER_AGENT`
- `RECOVERY_WEB_TIMEOUT_SECONDS`

## 啟動示例
### Mock mode
```bash
RECOVERY_PROVIDER=mock uvicorn app.main:app --reload --port 8000
```

### LSM API with bearer token
```bash
RECOVERY_PROVIDER=lsm_api \
RECOVERY_API_AUTH_MODE=bearer \
RECOVERY_API_TOKEN=YOUR_TOKEN \
uvicorn app.main:app --reload --port 8000
```

### LSM API with custom header auth
```bash
RECOVERY_PROVIDER=lsm_api \
RECOVERY_API_AUTH_MODE=header \
RECOVERY_API_AUTH_HEADER_NAME=X-API-TOKEN \
RECOVERY_API_TOKEN=YOUR_TOKEN \
uvicorn app.main:app --reload --port 8000
```

### 模擬 LSM 拒絕 -> fallback
```bash
RECOVERY_PROVIDER=lsm_api \
SIMULATE_LSM_REJECTION=true \
RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM=true \
RECOVERY_WEB_FETCH_ENABLED=true \
RECOVERY_WEB_BASE_URL=https://example.org \
uvicorn app.main:app --reload --port 8000
```

## 驗證輸出欄位
- `source_provider`
- `source_status`
- `fallback_used`
- `attribution_source`
- `diagnostics`
