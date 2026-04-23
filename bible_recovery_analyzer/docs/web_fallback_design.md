# Web Fallback Design (Testing-only)

## 目的
在 LSM API 無 key / 拒絕 / 不可用時，提供最小 runtime 備援測試路徑。

## 重要限制
- 不繞過登入/權限
- 不批次爬取
- 不離線保存 Recovery 全文
- 僅 best-effort runtime fetch

## 可配置 adapter 欄位
- `RECOVERY_WEB_BASE_URL`
- `RECOVERY_WEB_ROUTE_TEMPLATE` (default: `verse/{ref}`)
- `RECOVERY_WEB_SELECTOR`
- `RECOVERY_WEB_EXTRACT_MARKER_START`
- `RECOVERY_WEB_EXTRACT_MARKER_END`
- `RECOVERY_WEB_MAX_CHARS`

## 目前 parser
- marker 擷取優先
- selector 字串次之
- 無法擷取則回傳可診斷錯誤

## 待補資訊
- 官方可用 URL
- HTML 結構與合法 selector
- Robots/ToS 合規審核結果

## 風險聲明
- 此來源僅供備援測試
- 結果準確性與穩定性不保證
- 不可視為正式授權整合
