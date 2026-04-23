#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

if [[ ! -d .venv ]]; then
  python -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
python scripts/seed_data.py

export RECOVERY_PROVIDER=${RECOVERY_PROVIDER:-mock}
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
