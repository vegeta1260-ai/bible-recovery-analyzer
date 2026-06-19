#!/usr/bin/env python3
"""把舊約 token 的 lemma（短 key 'l'）改為字典原形（由 Strong's 反查 lexicon），去除標音/詞綴雜訊。

問題：OSHB ETL 存入的 'l' 是含 cantillation（te'amim）的指向形（如 בָּרָ֣א、בְּ/רֵאשִׁ֖ית），
      非字典原形，導致原文導覽 chips 雜亂、lemma 搜尋只能精確比對表面形。
解法：舊約 token 皆有正確 Strong's（'st'）；lexicon 的希伯來 lemma 已是乾淨字典形（無 cantillation）。
      故令 l = lexicon[st].lemma。surface 仍保留在 's'、normalized 在 'n'。
範圍：僅處理 st 以 'H' 開頭的 token（新約已於 etl-morphgnt 修正，不動）。
冪等：可重跑。⚠️ 重跑 OT ETL 後需再跑此腳本。
"""
import json
import glob
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKENS_DIR = os.path.join(ROOT, "public", "data", "tokens")
LEXICON = os.path.join(ROOT, "src", "data", "lexicon.json")

lex = {e["strongs"]: e["lemma"] for e in json.load(open(LEXICON, encoding="utf-8"))}

total_changed = 0
files_touched = 0
for fp in sorted(glob.glob(os.path.join(TOKENS_DIR, "*.json"))):
    toks = json.load(open(fp, encoding="utf-8"))
    changed = 0
    for t in toks:
        st = t.get("st")
        if st and st.startswith("H") and st in lex and t.get("l") != lex[st]:
            t["l"] = lex[st]
            changed += 1
    if changed:
        json.dump(toks, open(fp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        files_touched += 1
        total_changed += changed

print(f"✓ 更新 {total_changed} 個 OT token 的 lemma，跨 {files_touched} 卷")
