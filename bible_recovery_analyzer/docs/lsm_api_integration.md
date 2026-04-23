# LSM API Integration Guide

本文件為正式 `lsm_api` 串接指南（保留 mock / web_fallback 架構）。

## 1) 目標
- 正式透過 Text-only HTTP GET API 取回經文。
- 預設使用 `Out=json`，解析 `verses / message / copyright`。
- 保留 `detected / inputstring` 相容診斷資訊。

## 2) 必要 `.env` 欄位
```env
RECOVERY_PROVIDER=lsm_api
RECOVERY_API_BASE_URL=...
RECOVERY_API_TOKEN=...
RECOVERY_API_TIMEOUT=12
RECOVERY_API_OUTPUT=json
```

## 3) 選填欄位
```env
RECOVERY_API_LANG=
RECOVERY_API_REF_PARAM=String
RECOVERY_API_OUTPUT_PARAM=Out
RECOVERY_API_LANG_PARAM=Lang
```

## 4) 認證模式（可配置）
### Header mode
```env
RECOVERY_API_AUTH_MODE=header
RECOVERY_API_AUTH_HEADER=Authorization
RECOVERY_API_AUTH_HEADER_PREFIX=Bearer 
```

### Query mode
```env
RECOVERY_API_AUTH_MODE=query
RECOVERY_API_AUTH_QUERY_PARAM=token
```

### None mode（只有上游真的不需要 token 才可用）
```env
RECOVERY_API_AUTH_MODE=none
```

## 5) 相容性
- `RECOVERY_API_KEY` 仍可作為 `RECOVERY_API_TOKEN` 的舊別名。
- 若官方仍支援舊 `recver.php` 參數型式，可透過 `RECOVERY_API_REF_PARAM` / `RECOVERY_API_OUTPUT_PARAM` 調整，不把程式綁死單一路徑。

## 6) 診斷與安全
- diagnostics 會包含 `message / detected / inputstring`（若上游有回傳）。
- 不會把 token 放進 diagnostics/error message。
- 不可將 token 寫入 repo；請只放在 `.env` 或部署環境變數。
