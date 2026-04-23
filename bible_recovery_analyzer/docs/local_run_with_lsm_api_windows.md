# Local Run with LSM API (Windows)

## 1) 準備
在 `bible_recovery_analyzer` 目錄開 PowerShell：

```powershell
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
python scripts/seed_data.py
```

## 2) 修改 `.env`
至少填：
```env
RECOVERY_PROVIDER=lsm_api
RECOVERY_API_BASE_URL=請填官方 API URL
RECOVERY_API_TOKEN=請填 token
RECOVERY_API_OUTPUT=json
RECOVERY_API_AUTH_MODE=header
RECOVERY_API_AUTH_HEADER=Authorization
RECOVERY_API_AUTH_HEADER_PREFIX=Bearer 
```

若官方要求 query token：
```env
RECOVERY_API_AUTH_MODE=query
RECOVERY_API_AUTH_QUERY_PARAM=token
```

## 3) 啟動
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## 4) 最小 smoke test
```powershell
Invoke-RestMethod "http://127.0.0.1:8000/health"
Invoke-RestMethod "http://127.0.0.1:8000/provider-status"
Invoke-RestMethod "http://127.0.0.1:8000/verse?ref=John%201:1"
Invoke-RestMethod "http://127.0.0.1:8000/passage?ref=John%201:1-14"
```

## 5) 若失敗時檢查
1. token 是否填在 `.env`（不要 commit）
2. `RECOVERY_API_AUTH_MODE` 是否符合官方要求
3. `RECOVERY_API_AUTH_HEADER` 或 `RECOVERY_API_AUTH_QUERY_PARAM` 名稱是否正確
4. `RECOVERY_API_REF_PARAM` 是否要改成官方定義（預設 `String`）
