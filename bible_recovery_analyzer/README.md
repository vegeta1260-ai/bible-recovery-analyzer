# 聖經恢復本及原文字義解析（FastAPI Prototype v0.4）

## 本輪重點
1. provider-based recovery 架構維持（`mock` / `lsm_api` / `web_fallback`）
2. 正式補完 LSM API provider（可配置 auth mode: header/query/none）
3. 可重複執行的遷移完整性驗證（`scripts/verify_repo_integrity.py`）
4. Local run / LSM API 接線 / Custom GPT readiness 文件補強

## Recovery Provider
- `mock`
- `lsm_api`
- `web_fallback`（測試性備援）

## 重要限制
- 不離線儲存 Recovery Version 全文
- web fallback 僅 runtime best-effort
- web fallback 僅供備援測試，不可視為正式授權整合
- 不要將 token / API key / secret 寫入 repo

## 快速啟動（mock）
```bash
bash scripts/start_local.sh
```

Windows PowerShell：
```powershell
.\scripts\start_local.ps1
```

## LSM API 模式
請先設定 `.env`：
```env
RECOVERY_PROVIDER=lsm_api
RECOVERY_API_BASE_URL=...
RECOVERY_API_TOKEN=...
RECOVERY_API_OUTPUT=json
RECOVERY_API_AUTH_MODE=header
```

## 遷移完整性驗證
```bash
python scripts/verify_repo_integrity.py --write-report
```

## 測試
```bash
make smoke
make test
```

## API
- `/health`
- `/provider-status`
- `/verse`
- `/passage`
- `/interlinear`
- `/word`
- `/strongs/{id}`
- `/lemma`
- `/search`
- `/legend`
- `/codes/{analytical_code}`
- `/books`
- `/morphology/search`
- `/resources`

## 文件導覽
- `docs/local_run_guide_general.md`
- `docs/local_run_guide_windows.md`
- `docs/local_run_with_lsm_api_windows.md`
- `docs/lsm_api_integration.md`
- `docs/custom_gpt_ready_checklist.md`
- `docs/custom_gpt_next_steps.md`
- `docs/migration_verification_report.md`（由 verify script 產生）
