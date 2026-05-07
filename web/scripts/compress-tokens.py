#!/usr/bin/env python3
"""Compress per-book token JSON by removing empty fields and shortening keys."""

import json
from pathlib import Path

TOKEN_DIR = Path(__file__).resolve().parents[1] / "public" / "data" / "tokens"

# Short key mapping
KEY_MAP = {
    "verse_ref": "r",
    "token_order": "o",
    "surface_form": "s",
    "normalized_form": "n",
    "lemma": "l",
    "strongs_primary": "st",
    "strongs_secondary": "st2",
    "analytical_code_raw": "ac",
    "part_of_speech": "pos",
    "morphology_features": "mf",
    "literal_gloss_en": "ge",
    "translation_note_zh": "zh",
    "recovery_alignment_note": "ra",
    "pronunciation_transliteration": "tr",
    "pronunciation_bopomofo": "bp",
    "source_layer": "sl",
    "verse_usage": "vu",
    "grammar_explanation": "gx",
    "is_ot_quote": "oq",
}

# Fields to drop if empty/false/null
DROPPABLE = {"st", "st2", "ge", "zh", "ra", "tr", "bp", "vu", "gx", "oq", "sl"}


def compress_token(t: dict) -> dict:
    out = {}
    for long_key, short_key in KEY_MAP.items():
        val = t.get(long_key)
        if short_key in DROPPABLE and (not val or val is False):
            continue
        out[short_key] = val
    return out


def main():
    total_before = 0
    total_after = 0

    for f in sorted(TOKEN_DIR.glob("*.json")):
        before = f.stat().st_size
        tokens = json.loads(f.read_text("utf-8"))
        compressed = [compress_token(t) for t in tokens]
        out = json.dumps(compressed, ensure_ascii=False, separators=(",", ":"))
        f.write_text(out, encoding="utf-8")
        after = f.stat().st_size
        total_before += before
        total_after += after
        print(f"  {f.stem:8s} {before//1024:5d}KB → {after//1024:5d}KB  ({100*after//before:2d}%)")

    print(f"\nTotal: {total_before//1024//1024}MB → {total_after//1024//1024}MB")


if __name__ == "__main__":
    main()
