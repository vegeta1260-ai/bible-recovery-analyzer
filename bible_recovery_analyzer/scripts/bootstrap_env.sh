#!/usr/bin/env bash
set -euo pipefail

python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
python scripts/seed_data.py

echo "Environment ready. Activate with: source .venv/bin/activate"
