#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${1:-http://127.0.0.1:8000}

echo "== /health =="
curl -fsS "$BASE_URL/health" | jq .

echo "== /provider-status =="
curl -fsS "$BASE_URL/provider-status" | jq .

echo "== /verse?ref=John 1:1 =="
curl -fsS "$BASE_URL/verse?ref=John%201:1" | jq .

echo "== /passage?ref=John 1:1-14 =="
curl -fsS "$BASE_URL/passage?ref=John%201:1-14" | jq .
