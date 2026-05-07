# 聖經恢復本及原文字義解析（FastAPI Prototype v0.3）

## 本輪重點
1. provider-based recovery 架構維持（`mock` / `lsm_api` / `web_fallback`）
2. 可重複執行的遷移完整性驗證（`scripts/verify_repo_integrity.py`）
3. 本機落地執行指引（General + Windows）
4. 後續 LSM API / Custom GPT 路線文件化（本輪不正式接線）

## Recovery Provider
- `mock`
- `lsm_api`
- `web_fallback`（測試性備援）

## 重要限制
- 不離線儲存 Recovery Version 全文
- web fallback 僅 runtime best-effort
- web fallback 僅供備援測試，不可視為正式授權整合
- 不要將 token / API key / secret 寫入 repo

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
- `docs/migration_verification_report.md`（由 verify script 產生）
- `docs/lsm_api_preparation.md`
- `docs/custom_gpt_next_steps.md`
- `docs/provider_switching_guide.md`
- `docs/no_lsm_credential_test_plan.md`
- `docs/testing_and_validation.md`


## 本輪重點（網站化與 MACULA）
- 新增 `/study` 聚合端點，可回傳 LSM recovery_text + MACULA original_text/interlinear/lexicon_summary。
- 新增 MACULA 匯入腳本：download/import greek/import hebrew/import all。
- GPTS prompt 整合暫緩，本輪先聚焦網站與雲端 API。
- 雲端測試重點：`pytest`、`/study?ref=John1:1`、`/study?ref=Gen1:1`。
