# Testing and Validation

## 測試分層
- Pure unit tests: `tests/test_unit_core.py`
- Provider switching tests: `tests/test_provider_switching.py`
- Fallback behavior tests: `tests/test_provider_switching.py`
- API smoke tests: `tests/test_api.py` + `/health`
- Snapshot tests: `tests/snapshots/*` used by `tests/test_api.py`
- Offline-safe tests: unit/provider tests with monkeypatch and no network
- Optional integration tests: `tests/test_integration_optional.py` (`RUN_OPTIONAL_INTEGRATION=true` 才執行)

## 本地完整驗證（有網路可安裝依賴）
```bash
bash scripts/bootstrap_env.sh
source .venv/bin/activate
pytest
```

## Docker 驗證
```bash
docker build -t bible-recovery-analyzer .
docker run --rm -p 8000:8000 bible-recovery-analyzer
```

## 目前環境限制說明
若執行環境無法安裝 pip 套件，仍可先跑：
```bash
python -m py_compile $(rg --files -g '*.py')
```
完整 pytest 與 app 啟動請在可安裝依賴環境執行。
