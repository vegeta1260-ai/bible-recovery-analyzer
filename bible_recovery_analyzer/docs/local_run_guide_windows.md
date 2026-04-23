# Local Run Guide (Windows)

> 優先路線：Windows + PowerShell + `mock` provider。

## 1) 前置需求
- Windows 10/11
- Python 3.11+（建議安裝時勾選 Add to PATH）
- PowerShell

## 2) 初始化
在 repo 子目錄 `bible_recovery_analyzer` 開 PowerShell：

```powershell
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
python scripts/seed_data.py
```

## 3) 設定 .env
確認 `.env` 至少有：
```env
RECOVERY_PROVIDER=mock
RECOVERY_API_KEY=
```

## 4) 啟動 API
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## 5) Smoke test（PowerShell）
```powershell
Invoke-RestMethod "http://127.0.0.1:8000/health"
Invoke-RestMethod "http://127.0.0.1:8000/provider-status"
Invoke-RestMethod "http://127.0.0.1:8000/verse?ref=John%201:1"
Invoke-RestMethod "http://127.0.0.1:8000/passage?ref=John%201:1-2"
Invoke-RestMethod "http://127.0.0.1:8000/interlinear?ref=John%201:1"
```

## 6) 自動驗證遷移完整性
```powershell
python scripts/verify_repo_integrity.py --write-report
```

## 7) 常見問題
- 若無法執行 `Activate.ps1`：
  ```powershell
  Set-ExecutionPolicy -Scope Process Bypass
  ```
- 若 `uvicorn` 找不到：請確認已啟用 `.venv`，並重新 `pip install -r requirements-dev.txt`。
