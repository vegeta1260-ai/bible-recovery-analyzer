# 聖經恢復本及原文字義解析（FastAPI Prototype v0.3）

## 本輪重點
1. provider-based recovery 架構維持（`mock` / `lsm_api` / `web_fallback`）
2. 可重複執行的遷移完整性驗證（`scripts/verify_repo_integrity.py`）
3. 本機落地執行指引（General + Windows）
4. LSM API integration readiness（可配置 auth mode、token 支援、response parsing）
5. 後續 Custom GPT 路線文件化（本輪不正式接線）

## Recovery Provider
- `mock`
- `lsm_api`
- `web_fallback`（測試性備援）

## 重要限制
- 不離線儲存 Recovery Version 全文
- web fallback 僅 runtime best-effort
- web fallback 僅供備援測試，不可視為正式授權整合
- 不要將 token / API key / secret 寫入 repo
- LSM auth mode 支援 bearer/header/query/none（預設 bearer）

## 快速啟動（建議 mock）
```bash
bash scripts/start_local.sh
```

Windows PowerShell：
```powershell
.\scripts\start_local.ps1
```

## 遷移完整性驗證
```bash
python scripts/verify_repo_integrity.py --write-report
```

執行後會輸出：
- console JSON summary
- `docs/migration_verification_report.md`

## 測試
```bash
make smoke
make test
```

## LSM Live Auth and Study Smoke
Use local secrets only in `.env`; never commit `.env` or paste real tokens into docs, logs, diagnostics, commits, or PRs.

Recommended local LSM settings:
```env
RECOVERY_PROVIDER=lsm_api
RECOVERY_API_BASE_URL=https://api.lsm.org/recver/txo.php
RECOVERY_API_AUTH_MODE=basic
RECOVERY_API_APP_ID=<LSM_APP_ID>
RECOVERY_API_TOKEN=<LSM_TOKEN>
RECOVERY_API_REF_PARAM=String
RECOVERY_API_OUTPUT_PARAM=Out
RECOVERY_API_OUTPUT=json
```

Check which auth shape works without printing secrets:
```bash
python scripts/probe_lsm_api_auth.py
```

Run the live `/study` smoke for John 1:1:
```bash
python scripts/smoke_study_live.py
```

The smoke script skips cleanly when required local credentials are missing.

## API
- `/health`
- `/provider-status`
- `/study`（Custom GPT / GPT Actions 專家聚合端點）
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
- `docs/migration_verification_report.md`（由 verify script 產生）
- `docs/lsm_api_preparation.md`
- `docs/custom_gpt_next_steps.md`
- `docs/provider_switching_guide.md`
- `docs/no_lsm_credential_test_plan.md`
- `docs/testing_and_validation.md`


## GPT Actions 下一步
- 系統預設為完整專家模式（非 quick/standard/full 分流）。
- 建議優先呼叫 `/study`，其餘端點用於特定深挖。
- `.env` 新增可選安全欄位：`ACTION_AUTH_ENABLED`, `ACTION_AUTH_MODE`, `ACTION_API_KEY`。
- 本機測試後可用 Cloudflare Quick Tunnel 暴露 HTTPS 再接 GPT Actions。
