#!/usr/bin/env bash
# 部署後煙霧測試 — 驗證上線後所有關鍵功能正常
# 用法: bash web/scripts/smoke-test-deployed.sh [base_url]

set -euo pipefail

BASE="${1:-https://bible.weiqi.kids}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expect="$3"
  local actual
  actual=$(curl -s "$url" | head -c 50000)
  if echo "$actual" | grep -q "$expect"; then
    echo "  PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name — expected '$expect' not found"
    FAIL=$((FAIL + 1))
  fi
}

check_status() {
  local name="$1"
  local url="$2"
  local status
  status=$(curl -sI "$url" | head -1 | grep -oE '[0-9]{3}')
  if [ "$status" = "200" ]; then
    echo "  PASS  $name (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name (HTTP $status)"
    FAIL=$((FAIL + 1))
  fi
}

check_json_count() {
  local name="$1"
  local url="$2"
  local min_count="$3"
  local count
  count=$(curl -s "$url" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  if [ "$count" -ge "$min_count" ]; then
    echo "  PASS  $name ($count entries >= $min_count)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name ($count entries < $min_count)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== 煙霧測試: $BASE ==="
echo ""

echo "[1] 頁面可存取"
check_status "首頁" "$BASE/"
# 佔位頁回歸 gate：主機初始佔位頁含 "awaiting first deploy"，首頁絕不可出現（曾發生部署落空、線上仍是佔位頁）
if curl -s "$BASE/" | head -c 50000 | grep -qi "awaiting first deploy"; then
  echo "  FAIL  首頁仍是主機佔位頁（含 'awaiting first deploy'）"
  FAIL=$((FAIL + 1))
else
  echo "  PASS  首頁非佔位頁"
  PASS=$((PASS + 1))
fi
check_status "研經" "$BASE/study/"
check_status "書卷" "$BASE/books/"
check_status "圖例" "$BASE/legend/"
check_status "字典列表" "$BASE/lexicon/"
check_status "資源" "$BASE/resources/"
echo ""

echo "[2] Lexicon 頁面（預渲染）"
check_status "G1 lexicon" "$BASE/lexicon/G1/"
check_status "H1 lexicon" "$BASE/lexicon/H1/"
echo ""

echo "[3] 靜態 JSON 資料"
check_json_count "NT tokens (John)" "$BASE/data/tokens/John.json" 15000
check_json_count "OT tokens (Gen)" "$BASE/data/tokens/Gen.json" 20000
echo ""

echo "[4] SEO meta tags"
check "首頁 title" "$BASE/" "<title>"
check "首頁 og:title" "$BASE/" 'og:title'
check "首頁 twitter:card" "$BASE/" 'twitter:card'
check "首頁 canonical" "$BASE/" 'canonical'
check "首頁 lang=zh-Hant" "$BASE/" 'lang=\"zh-Hant\"'
echo ""

echo "[5] Lexicon 頁面 SEO"
check "G1 JSON-LD" "$BASE/lexicon/G1/" "DefinedTerm"
check "G1 lang=grc" "$BASE/lexicon/G1/" 'lang=\"grc\"'
echo ""

echo "[6] 靜態資源"
check_status "OG image" "$BASE/og-default.png"
check_status "favicon" "$BASE/favicon.ico"
echo ""

echo "[7] JS bundles"
check "SearchBox JS 存在" "$BASE/" "SearchBox"
check "AudioController JS 存在" "$BASE/" "AudioController"
echo ""

echo "[8] 導覽連結"
check "study 連結正確" "$BASE/" 'href=\"/study\"'
check "books 連結正確" "$BASE/" 'href=\"/books\"'
check "lexicon 連結正確" "$BASE/" 'href=\"/lexicon\"'
echo ""

echo "[9] LSM API (直接測試)"
LSM_RESPONSE=$(curl -s "https://api.lsm.org/recver/txo.php?String=John+1:1&Out=json" -H "Authorization: Basic $(echo -n 'ai.vegeta1260.biblerecoveryanalyzer:web_9972c275-24f4-4720-bd42-8b5c0d9c6fd7' | base64)")
if echo "$LSM_RESPONSE" | grep -q '"text"'; then
  echo "  PASS  LSM API auth 有效，回傳經文"
  PASS=$((PASS + 1))
else
  echo "  FAIL  LSM API auth 失敗或無經文"
  FAIL=$((FAIL + 1))
fi
echo ""

echo "[10] 音檔（public/audio 現存兩支）"
check_status "ambient-chant.mp3" "$BASE/audio/ambient-chant.mp3"
check_status "ambient-rorate.mp3" "$BASE/audio/ambient-rorate.mp3"
echo ""

echo "=== 結果: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
