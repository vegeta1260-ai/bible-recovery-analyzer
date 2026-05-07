#!/usr/bin/env python3
"""Fill literal_gloss_en in per-book token JSON using Strong's lexicon data."""

import json
from pathlib import Path

LEXICON_PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "lexicon.json"
TOKENS_DIR = Path(__file__).resolve().parents[1] / "public" / "data" / "tokens"

def main():
    lexicon = json.loads(LEXICON_PATH.read_text("utf-8"))
    gloss_map = {e["strongs"]: e["literal_gloss_en"] for e in lexicon if e.get("literal_gloss_en")}
    print(f"Loaded {len(gloss_map)} gloss entries from lexicon")

    total_filled = 0
    for f in sorted(TOKENS_DIR.glob("*.json")):
        tokens = json.loads(f.read_text("utf-8"))
        filled = 0
        for t in tokens:
            st = t.get("st", "")
            if st and not t.get("ge") and st in gloss_map:
                t["ge"] = gloss_map[st]
                filled += 1
        if filled > 0:
            f.write_text(json.dumps(tokens, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            total_filled += filled
        print(f"  {f.stem:8s} filled {filled} glosses")

    print(f"\nTotal filled: {total_filled}")

if __name__ == "__main__":
    main()
