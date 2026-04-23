# Custom GPT / GPT Actions Ready Checklist

## 何時算可以接 GPT Actions
- [ ] `/health`、`/provider-status`、`/verse`、`/passage` 在目標環境穩定
- [ ] `openapi.yaml` 與實際 API 行為一致
- [ ] provider 策略明確（mock / lsm_api / fallback）
- [ ] attribution/copyright 流程已確認

## 還需要的條件
- [ ] 對外公開 HTTPS 網址
- [ ] 可匯入的 OpenAPI 文件
- [ ] 認證方案（API Key 或 OAuth）
- [ ] 觀測性（logs / error tracking / rate limit）

## GPT 與後端的關係
- GPT Actions 只負責以 OpenAPI 呼叫後端。
- 真正的資料來源、權限控制與 fallback 邏輯都在本後端。
- 後端 provider-based 架構可讓 GPT 端不需感知 mock/lsm_api/web_fallback 切換細節。
