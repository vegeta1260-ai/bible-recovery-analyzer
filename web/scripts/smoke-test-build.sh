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

# token 檔「有效內容」筆數 >= 下限（非只陣列長度）。
# 防的是 compress-tokens 雙壓事故：檔案筆數不變、但每筆變 {"r":null,...}，
# 舊的 check_json_count 只看長度會放行。此檢查只計 r 非空者。
check_valid_tokens() {
  local name="$1" rel="$2" min_count="$3" count
  count=$(python3 -c "import json; t=json.load(open('$DIST/$rel')); print(sum(1 for x in t if x.get('r')))" 2>/dev/null || echo "0")
  if [ "$count" -ge "$min_count" ]; then
    echo "  PASS  $name (有效 $count >= $min_count)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name (有效 $count < $min_count) — 疑似 token 歸零/雙壓"
    FAIL=$((FAIL + 1))
  fi
}

# 全部 token 檔有效筆數總量不變式（一次抓全經料庫歸零）。
check_total_valid_tokens() {
  local name="$1" min_count="$2" total
  total=$(python3 -c "
import json, glob, os
tot = 0
for f in glob.glob(os.path.join('$DIST', 'data', 'tokens', '*.json')):
    tot += sum(1 for x in json.load(open(f)) if x.get('r'))
print(tot)
" 2>/dev/null || echo "0")
  if [ "$total" -ge "$min_count" ]; then
    echo "  PASS  $name (全經有效 $total >= $min_count)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name (全經有效 $total < $min_count) — token 大規模歸零"
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
check_min "HTML 總頁數" "$TOTAL_PAGES" 15000
echo ""

echo "[3b] 逐章研經落地頁（/study/[book]/[chapter]）"
check_file "約翰福音3章頁" "study/John/3/index.html"
check_file "創世記1章頁" "study/Gen/1/index.html"
check_grep "逐章頁 H1" "study/John/3/index.html" "第3章"
check_grep "逐章頁 JSON-LD Breadcrumb" "study/John/3/index.html" "BreadcrumbList"
check_grep "逐章頁 og:type=article" "study/John/3/index.html" 'content="article"'
check_grep "逐章頁逐字對照" "study/John/3/index.html" "分析碼"
check_grep "逐章頁章次內鏈" "study/John/3/index.html" 'study/John/2"'
check_file "書卷 OG 卡 (John)" "og/John.png"
check_file "書卷 OG 卡 (Gen)" "og/Gen.png"
check_grep "逐章頁用書卷 OG 卡" "study/John/3/index.html" 'og/John.png'
CHAPTER_PAGES=$(find "$DIST/study" -mindepth 2 -name 'index.html' 2>/dev/null | wc -l | tr -d ' ')
check_min "逐章頁總數" "${CHAPTER_PAGES:-0}" 1000
echo ""

echo "[4] 靜態 JSON 資料（按書卷動態載入的 token；lexicon 為 build 時嵌入，不在 public）"
check_json_count "NT tokens (John) 筆數" "data/tokens/John.json" 15000
check_json_count "OT tokens (Gen) 筆數" "data/tokens/Gen.json" 20000
# 有效內容檢查（防雙壓歸零；筆數對但內容全 null 時，上面 check_json_count 會放行）
check_valid_tokens "NT tokens (John) 有效內容" "data/tokens/John.json" 15000
check_valid_tokens "NT tokens (Matt) 有效內容" "data/tokens/Matt.json" 18000
check_valid_tokens "OT tokens (Gen) 有效內容" "data/tokens/Gen.json" 20000
check_total_valid_tokens "全 66 卷 token 有效總量" 440000
echo ""

echo "[5] SEO meta tags（首頁）"
check_grep "title" "index.html" "<title>"
check_grep "og:title" "index.html" "og:title"
check_grep "twitter:card" "index.html" "twitter:card"
check_grep "canonical" "index.html" "canonical"
check_grep "lang=zh-Hant" "index.html" 'lang="zh-Hant"'
# og:image 必須含 base path（曾漏 base → 分享卡圖 404）
check_grep "og:image 含 base path" "index.html" 'og:image" content="https://vegeta1260-ai.github.io/bible-recovery-analyzer/'
echo ""

echo "[6] Lexicon 頁面 SEO"
check_grep "G1 JSON-LD" "lexicon/G1/index.html" "DefinedTerm"
check_grep "G1 lang=grc" "lexicon/G1/index.html" 'lang="grc"'
echo ""

echo "[7] 導覽連結含正確 base path"
check_grep "書卷卡連逐章頁(首頁)" "index.html" 'href="/bible-recovery-analyzer/study/John/1"'
check_grep "書卷卡連逐章頁(書卷頁)" "books/index.html" 'href="/bible-recovery-analyzer/study/Gen/1"'
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

echo "[10] SEO / sitemap / AEO 可發現性（不可缺漏）"
check_file "robots.txt" "robots.txt"
check_grep "robots 指向 sitemap" "robots.txt" "Sitemap:"
check_file "sitemap-index.xml" "sitemap-index.xml"
check_file "sitemap-0.xml" "sitemap-0.xml"
check_grep "sitemap 含 lexicon 頁" "sitemap-0.xml" "lexicon/G1"
SITEMAP_URLS=$(grep -o "<loc>" "$DIST/sitemap-0.xml" 2>/dev/null | wc -l | tr -d ' ')
check_min "sitemap URL 總數" "${SITEMAP_URLS:-0}" 15000
echo ""

echo "[11] 逐章頁配樂與恢復本島全覆蓋（缺任一頁則不部署）"
# 每個逐章頁（study/[book]/[chapter]/index.html）都應掛 ChapterMusic 島（背景配樂）
# 與恢復本 slot；用「含標記的頁數 >= 1189」確保 1,189 章全覆蓋，缺一頁即 FAIL。
STUDY_TOTAL=$(find "$DIST/study" -mindepth 2 -name index.html 2>/dev/null | wc -l | tr -d ' ')
MUSIC_PAGES=$(find "$DIST/study" -mindepth 2 -name index.html -exec grep -l 'data-chapter-music' {} \; 2>/dev/null | wc -l | tr -d ' ')
RECOVERY_PAGES=$(find "$DIST/study" -mindepth 2 -name index.html -exec grep -l 'recovery-slot' {} \; 2>/dev/null | wc -l | tr -d ' ')
echo "  (逐章頁總數 ${STUDY_TOTAL})"
check_min "逐章頁配樂島覆蓋" "${MUSIC_PAGES:-0}" 1189
check_min "逐章頁恢復本 slot 覆蓋" "${RECOVERY_PAGES:-0}" 1189
echo ""

echo "=== 結果: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
