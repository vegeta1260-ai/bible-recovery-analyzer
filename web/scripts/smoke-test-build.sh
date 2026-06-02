#!/usr/bin/env bash
# Build 後本地煙霧測試 — 針對 dist/ 產物做檔案系統檢查（不打網路）。
# 目的：在 PR / push 前就攔下壞掉的 build，而不是等部署上線後才用 smoke-test-deployed.sh 發現。
# 用法: bash web/scripts/smoke-test-build.sh [dist_dir]
#   dist_dir 預設為本腳本旁的 ../dist
# 搭配: npm run build 後執行；CI 可在 deploy 步驟前加入此檢查。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="${1:-$SCRIPT_DIR/../dist}"
PASS=0
FAIL=0

if [ ! -d "$DIST" ]; then
  echo "✗ dist 目錄不存在: $DIST"
  echo "  請先執行: npm run build"
  exit 1
fi

# 檔案存在
check_file() {
  local name="$1" rel="$2"
  if [ -f "$DIST/$rel" ]; then
    echo "  PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name — 檔案不存在: $rel"
    FAIL=$((FAIL + 1))
  fi
}

# 檔案內含指定字串
check_grep() {
  local name="$1" rel="$2" pattern="$3"
  if [ -f "$DIST/$rel" ] && grep -q "$pattern" "$DIST/$rel"; then
    echo "  PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name — 在 $rel 找不到 '$pattern'"
    FAIL=$((FAIL + 1))
  fi
}

# JSON 陣列／物件筆數 >= 下限
check_json_count() {
  local name="$1" rel="$2" min_count="$3" count
  count=$(python3 -c "import sys,json; print(len(json.load(open('$DIST/$rel'))))" 2>/dev/null || echo "0")
  if [ "$count" -ge "$min_count" ]; then
    echo "  PASS  $name ($count >= $min_count)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name ($count < $min_count)"
    FAIL=$((FAIL + 1))
  fi
}

# 數值 >= 下限（用於頁數總量不變式）
check_min() {
  local name="$1" actual="$2" min_count="$3"
  if [ "$actual" -ge "$min_count" ]; then
    echo "  PASS  $name ($actual >= $min_count)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name ($actual < $min_count)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Build 煙霧測試: $DIST ==="
echo ""

echo "[1] 頁面產出"
check_file "首頁" "index.html"
check_file "研經" "study/index.html"
check_file "書卷" "books/index.html"
check_file "圖例" "legend/index.html"
check_file "字典列表" "lexicon/index.html"
check_file "資源" "resources/index.html"
echo ""

echo "[2] Lexicon 預渲染頁面"
check_file "G1 lexicon" "lexicon/G1/index.html"
check_file "H1 lexicon" "lexicon/H1/index.html"
echo ""

echo "[3] 頁數總量不變式（防 getStaticPaths 靜默壞掉）"
TOTAL_PAGES=$(find "$DIST" -name 'index.html' | wc -l | tr -d ' ')
check_min "HTML 總頁數" "$TOTAL_PAGES" 14000
echo ""

echo "[4] 靜態 JSON 資料（按書卷動態載入的 token；lexicon 為 build 時嵌入，不在 public）"
check_json_count "NT tokens (John)" "data/tokens/John.json" 15000
check_json_count "OT tokens (Gen)" "data/tokens/Gen.json" 20000
echo ""

echo "[5] SEO meta tags（首頁）"
check_grep "title" "index.html" "<title>"
check_grep "og:title" "index.html" "og:title"
check_grep "twitter:card" "index.html" "twitter:card"
check_grep "canonical" "index.html" "canonical"
check_grep "lang=zh-Hant" "index.html" 'lang="zh-Hant"'
echo ""

echo "[6] Lexicon 頁面 SEO"
check_grep "G1 JSON-LD" "lexicon/G1/index.html" "DefinedTerm"
check_grep "G1 lang=grc" "lexicon/G1/index.html" 'lang="grc"'
echo ""

echo "[7] 導覽連結含正確 base path"
check_grep "study 連結" "index.html" 'href="/bible-recovery-analyzer/study"'
check_grep "books 連結" "index.html" 'href="/bible-recovery-analyzer/books"'
check_grep "lexicon 連結" "index.html" 'href="/bible-recovery-analyzer/lexicon"'
echo ""

echo "[8] Islands 元件參照"
check_grep "SearchBox" "index.html" "SearchBox"
check_grep "AudioController" "index.html" "AudioController"
echo ""

echo "[9] 靜態資源與音檔"
check_file "OG image" "og-default.png"
check_file "favicon" "favicon.ico"
check_file "ambient-default.mp3" "audio/ambient-default.mp3"
check_file "ambient-gospel.mp3" "audio/ambient-gospel.mp3"
echo ""

echo "=== 結果: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
