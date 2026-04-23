Param(
  [string]$Host = "127.0.0.1",
  [int]$Port = 8000
)

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

if (-not (Test-Path ".venv")) {
  python -m venv .venv
}

.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
python scripts/seed_data.py

if (-not $env:RECOVERY_PROVIDER) {
  $env:RECOVERY_PROVIDER = "mock"
}

uvicorn app.main:app --host $Host --port $Port --reload
