# Local Run Guide (General)

> 目標：在**不依賴正式 LSM API 憑證**的情況下，用 `mock` provider 先把 API 在本機跑起來。

## 1) 前置需求
- Python 3.11+
- Git
- 可用 shell（macOS/Linux bash 或 Windows PowerShell）

## 2) 建立環境
```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
python scripts/seed_data.py
```

## 3) 設定 provider（預設先用 mock）
在 `.env` 確認：
```env
RECOVERY_PROVIDER=mock
RECOVERY_API_AUTH_MODE=bearer
RECOVERY_API_TOKEN=
```

> 若切到 `lsm_api`，請手動填 `RECOVERY_API_BASE_URL` 與 token/key，不可硬編碼。

## 4) 啟動服務
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 5) 最小 smoke test
另開一個 terminal：
```bash
curl "http://127.0.0.1:8000/health"
curl "http://127.0.0.1:8000/provider-status"
curl "http://127.0.0.1:8000/verse?ref=John%201:1"
curl "http://127.0.0.1:8000/passage?ref=John%201:1-2"
curl "http://127.0.0.1:8000/interlinear?ref=John%201:1"
```

## 6) 一鍵驗證遷移完整性
```bash
python scripts/verify_repo_integrity.py --write-report
```

## 7) Docker（可選）
```bash
docker build -t bible-recovery-analyzer .
docker run --rm -p 8000:8000 --env-file .env bible-recovery-analyzer
```

> 注意：`web_fallback` 僅供測試備援；不視為正式授權資料源。
