# Future Recovery Runtime Integration

## 目前狀態
- `RECOVERY_API_MOCK_MODE=true` 時使用 mock runtime text。
- 回應保留 attribution。

## 正式切換步驟
1. 將 `RECOVERY_API_MOCK_MODE=false`
2. 設定 `RECOVERY_API_BASE_URL`, `RECOVERY_API_KEY`
3. 啟用 request logging（不可記錄正文）
4. 設定快取策略：只能快取 metadata，不快取 Recovery 本文
5. 新增 API 錯誤降級行為（例如 timeout fallback 提示）

## 合規檢查清單
- DB 無 Recovery 本文欄位
- Fixture 無 Recovery 本文
- Test snapshots 無 Recovery 本文
- 回傳皆帶版權聲明
