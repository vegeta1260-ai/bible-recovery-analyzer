# Provider Switching Guide

## 支援 provider
- `mock`
- `lsm_api`
- `web_fallback`

## 核心環境變數
- `RECOVERY_PROVIDER=mock|lsm_api|web_fallback`
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

### Web fallback mode
```bash
RECOVERY_PROVIDER=web_fallback \
RECOVERY_WEB_FETCH_ENABLED=true \
RECOVERY_WEB_BASE_URL=https://example.org \
RECOVERY_WEB_SELECTOR='John.1.1' \
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
