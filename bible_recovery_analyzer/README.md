# 聖經恢復本及原文字義解析（FastAPI Prototype v0.3）

## 本輪重點
1. 安全備份（git + 檔案副本）
2. Provider-based recovery 架構
3. LSM 無憑證時的 web fallback 測試流程
4. 可重現環境與測試流程補強

## Recovery Provider
- `mock`
- `lsm_api`
- `web_fallback`（測試性備援）

## 重要限制
- 不離線儲存 Recovery Version 全文
- web fallback 僅 runtime best-effort
- web fallback 僅供備援測試，不可視為正式授權整合

## 主要環境變數
```bash
RECOVERY_PROVIDER=mock|lsm_api|web_fallback
RECOVERY_API_BASE_URL=
RECOVERY_API_KEY=
RECOVERY_RETRY_ATTEMPTS=2
SIMULATE_LSM_REJECTION=false
RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM=true

RECOVERY_WEB_BASE_URL=
RECOVERY_WEB_FETCH_ENABLED=false
RECOVERY_WEB_USER_AGENT="BibleRecoveryAnalyzer/0.3"
RECOVERY_WEB_TIMEOUT_SECONDS=10
RECOVERY_WEB_ROUTE_TEMPLATE="verse/{ref}"
RECOVERY_WEB_SELECTOR=
RECOVERY_WEB_EXTRACT_MARKER_START=
RECOVERY_WEB_EXTRACT_MARKER_END=
RECOVERY_WEB_MAX_CHARS=600
```

## 快速啟動
```bash
bash scripts/bootstrap_env.sh
source .venv/bin/activate
make run
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

## 無 LSM 憑證展示指令
```bash
# mock
RECOVERY_PROVIDER=mock uvicorn app.main:app --reload --port 8000

# web fallback
RECOVERY_PROVIDER=web_fallback \
RECOVERY_WEB_FETCH_ENABLED=true \
RECOVERY_WEB_BASE_URL=https://example.org \
RECOVERY_WEB_SELECTOR='John.1.1' \
uvicorn app.main:app --reload --port 8000

# 模擬 lsm 拒絕 -> fallback
RECOVERY_PROVIDER=lsm_api \
SIMULATE_LSM_REJECTION=true \
RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM=true \
RECOVERY_WEB_FETCH_ENABLED=true \
RECOVERY_WEB_BASE_URL=https://example.org \
uvicorn app.main:app --reload --port 8000
```

## 文件導覽
- `docs/backup_and_restore.md`
- `docs/provider_switching_guide.md`
- `docs/web_fallback_design.md`
- `docs/no_lsm_credential_test_plan.md`
- `docs/testing_and_validation.md`
