# No-LSM-Credential Test Plan

## 目標
在沒有 `RECOVERY_API_KEY` 的情況下驗證系統可診斷、可降級、可展示。

## 測試矩陣
1. `RECOVERY_PROVIDER=mock` -> 應成功
2. `RECOVERY_PROVIDER=lsm_api` + no key -> 應失敗或 fallback（依開關）
3. `SIMULATE_LSM_REJECTION=true` + fallback enabled -> 應切到 web_fallback
4. `RECOVERY_PROVIDER=web_fallback` + missing base URL -> 應回可診斷錯誤
5. `RECOVERY_PROVIDER=web_fallback` + fake adapter success（測試）-> 應回 provider=web_fallback

## API 展示端點
- `/verse?ref=約1:1`
- `/passage?ref=John1:1-5`
- `/interlinear?ref=John1:1`
- `/provider-status`

## 驗證重點
- 回應含 `source_provider/source_status/fallback_used/diagnostics`
- 錯誤不可默默吞掉
