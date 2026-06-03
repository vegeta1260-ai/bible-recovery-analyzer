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


def is_already_compressed(tokens: list) -> bool:
    """已壓縮的 token 用短 key（'r'），原始 token 用長 key（'verse_ref'）。
    本函式讓壓縮可重複執行（idempotent）：偵測已壓縮就跳過，絕不二次壓縮。

    曾發生事故：腳本原地覆寫、且 glob 掃全部檔，再跑一次會把短 key 當原始讀，
    t.get('verse_ref') 全變 None → token 歸零（雙壓）。此守門即為根除該情況。"""
    for tok in tokens:
        if isinstance(tok, dict):
            return "verse_ref" not in tok
    return False  # 空陣列：視為未壓縮，照常處理（結果仍為空）


def main():
    total_before = 0
    total_after = 0
    skipped = 0

    for f in sorted(TOKEN_DIR.glob("*.json")):
        tokens = json.loads(f.read_text("utf-8"))
        if is_already_compressed(tokens):
            print(f"  {f.stem:8s} SKIP — 已壓縮（短 key），不二次壓縮")
            skipped += 1
            continue
        before = f.stat().st_size
        compressed = [compress_token(t) for t in tokens]
        out = json.dumps(compressed, ensure_ascii=False, separators=(",", ":"))
        f.write_text(out, encoding="utf-8")
        after = f.stat().st_size
        total_before += before
        total_after += after
        print(f"  {f.stem:8s} {before//1024:5d}KB → {after//1024:5d}KB  ({100*after//before:2d}%)")

    if skipped:
        print(f"\n跳過 {skipped} 個已壓縮檔（冪等保護）")
    if total_before:
        print(f"Total: {total_before//1024//1024}MB → {total_after//1024//1024}MB")


if __name__ == "__main__":
    main()
