#!/usr/bin/env python3
"""產生 Strong's → 出現章節索引（給字典頁靜態反查連回逐章頁，建立 entity graph / crawl 互鏈）。

來源：web/public/data/tokens/*.json（逐卷 token，每筆有 r="Gen.1.1" 與 st="H7225"）。
輸出：web/src/data/strongs-occurrences.json，格式 { "H7225": {"n": 51, "ch": ["Gen.1", ...]}, ... }
  n  = 該 Strong's 的 token 總出現數
  ch = 去重後的出現章節（依正典書序、章號排序），供字典頁列「出現於」連回 /study/{osis}/{ch}

冪等：純讀 token 重算覆寫，可安全重跑。
⚠️ 與 versification remap 同類：重跑 OT/NT ETL（重產 token）後，須再跑這支腳本。
"""
import json
import glob
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKENS_DIR = os.path.join(ROOT, "public", "data", "tokens")
BOOKMAP = os.path.join(ROOT, "src", "data", "bookMap.json")
OUT = os.path.join(ROOT, "src", "data", "strongs-occurrences.json")

# 正典書序（bookMap 的順序）→ 用於章節排序
book_order = {b["osis"]: i for i, b in enumerate(json.load(open(BOOKMAP, encoding="utf-8")))}

counts = {}          # strongs -> 總出現次數
chapters = {}        # strongs -> set of "Osis.ch"

for fp in sorted(glob.glob(os.path.join(TOKENS_DIR, "*.json"))):
    for t in json.load(open(fp, encoding="utf-8")):
        st = t.get("st")
        ref = t.get("r")
        if not st or not ref:
            continue
        parts = ref.split(".")
        if len(parts) < 2:
            continue
        ch_ref = f"{parts[0]}.{parts[1]}"      # "Gen.1.1" -> "Gen.1"
        counts[st] = counts.get(st, 0) + 1
        chapters.setdefault(st, set()).add(ch_ref)


def sort_key(ch_ref):
    osis, ch = ch_ref.rsplit(".", 1)
    return (book_order.get(osis, 999), int(ch) if ch.isdigit() else 0)


out = {}
for st in counts:
    ch_sorted = sorted(chapters[st], key=sort_key)
    out[st] = {"n": counts[st], "ch": ch_sorted}

json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

# 摘要
total_pairs = sum(len(v["ch"]) for v in out.values())
print(f"✓ {len(out)} 個 Strong's，{total_pairs} 條 (strongs,章) 連結 → {os.path.relpath(OUT, ROOT)}")
print(f"  檔案大小：{os.path.getsize(OUT)/1024/1024:.2f} MB")
print(f"  範例 H7225: {out.get('H7225', {}).get('n')} 次 / {len(out.get('H7225', {}).get('ch', []))} 章")
