#!/usr/bin/env python3
"""為 lexicon.json 每筆加 clean_gloss：把 Strong's/KJV 原始 gloss 大雜燴去噪成簡短可讀的字義。

原 short_definition 形如：'angels, [idiom] exceeding, God (gods)(-dess,-ly), [idiom](very) great, judges'
去除 [idiom]/[phrase] 等標記、括號補注、'X '（KJV 慣用語標記）後取前數個詞，得 'angels, exceeding, God, great'。

⚠️ 限制（誠實）：KJV gloss 的詞序未必以主要字義為先（如 H430 神排在 angels 之後），
   去噪只能讓「可讀」，無法保證「首詞即主義」。要主義精準需換詞典來源或 LLM 整理。
冪等：原地重算覆寫。輸出仍是 lexicon.json（新增/更新 clean_gloss 欄）。
"""
import json
import re
from pathlib import Path

LEXICON = Path(__file__).resolve().parents[1] / "src" / "data" / "lexicon.json"

# 人工校正：KJV gloss 詞序未必以主義為先（如 H430 神排在 angels 後、H3117 日不在前 4）。
# 對高頻/神學核心字提供精準簡義，覆蓋去噪結果。長尾仍用 clean()。
OVERRIDES = {
    # 舊約
    "H3068": "the LORD (Yahweh)", "H430": "God; gods", "H559": "to say",
    "H1961": "to be, become", "H6213": "to do, make", "H935": "to come, go in",
    "H4428": "king", "H3478": "Israel", "H776": "earth, land", "H3117": "day",
    "H376": "man", "H6440": "face, presence", "H1004": "house", "H5414": "to give",
    "H5971": "people", "H3027": "hand", "H1697": "word, thing", "H7200": "to see",
    "H1": "father", "H8085": "to hear, obey", "H1696": "to speak", "H1121": "son",
    "H2896": "good", "H7225": "beginning, first", "H1254": "to create",
    "H8064": "heavens, sky", "H4325": "water", "H5315": "soul, life",
    "H3820": "heart", "H6963": "voice, sound", "H7307": "spirit, wind, breath",
    "H3947": "to take", "H1980": "to walk, go", "H5650": "servant, slave",
    "H3478b": "Israel", "H6965": "to rise, stand", "H3045": "to know",
    # 新約
    "G2316": "God", "G2962": "Lord, master", "G2424": "Jesus", "G5547": "Christ, Messiah",
    "G1510": "to be", "G3004": "to say, speak", "G2064": "to come, go",
    "G1080": "to beget, be born", "G4151": "spirit, Spirit", "G26": "love",
    "G4102": "faith, belief", "G5485": "grace, favor", "G40": "holy", "G444": "man, human",
    "G2222": "life", "G2889": "world", "G3056": "word, the Word", "G4160": "to do, make",
    "G2192": "to have, hold", "G3708": "to see", "G1325": "to give", "G2532": "and, also",
    "G4982": "to save", "G266": "sin", "G3962": "father", "G5207": "son",
    "G3772": "heaven", "G1093": "earth, land", "G2570": "good, beautiful",
}


def clean(raw: str) -> str:
    if not raw:
        return ""
    s = raw
    s = re.sub(r"\[[^\]]*\]", " ", s)          # 去 [idiom] [phrase] 等
    s = re.sub(r"\([^)]*\)", " ", s)           # 去括號補注 (gods)(-dess,-ly)
    s = re.sub(r"\{[^}]*\}", " ", s)
    parts = re.split(r"[,;]", s)
    seen = []
    for p in parts:
        t = p.strip(" .-—")
        if not t:
            continue
        if t == "X" or t.startswith("X "):       # KJV 慣用語標記
            continue
        t = re.sub(r"\s+", " ", t)
        if t.lower() in (x.lower() for x in seen):
            continue
        seen.append(t)
        if len(seen) >= 4:
            break
    return ", ".join(seen)


def main():
    lex = json.loads(LEXICON.read_text(encoding="utf-8"))
    changed = 0
    empty = 0
    for e in lex:
        st = e.get("strongs", "")
        if st in OVERRIDES:
            cg = OVERRIDES[st]
        else:
            cg = clean(e.get("short_definition", ""))
            if not cg:
                cg = clean(e.get("literal_gloss_en", "")) or e.get("literal_gloss_en", "")
                if not cg:
                    empty += 1
        if e.get("clean_gloss") != cg:
            e["clean_gloss"] = cg
            changed += 1
    LEXICON.write_text(json.dumps(lex, ensure_ascii=False), encoding="utf-8")
    print(f"✓ {len(lex)} 筆，更新 clean_gloss {changed} 筆，無可清出者 {empty} 筆")
    # 抽樣
    m = {e["strongs"]: e for e in lex}
    for st in ["H430", "H2896", "G2316", "G26", "H3117"]:
        if st in m:
            print(f"  {st}: {m[st]['short_definition'][:40]!r} → {m[st]['clean_gloss']!r}")


if __name__ == "__main__":
    main()
