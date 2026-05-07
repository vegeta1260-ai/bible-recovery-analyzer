#!/usr/bin/env python3
"""Build complete Strong's lexicon JSON from Open Scriptures data."""

import json
import re
from pathlib import Path

GREEK_JS = Path("/tmp/strongs/greek/strongs-greek-dictionary.js")
HEBREW_JS = Path("/tmp/strongs/hebrew/strongs-hebrew-dictionary.js")
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "data" / "lexicon.json"


def parse_strongs_js(filepath: Path) -> dict:
    """Extract JSON object from JS file (var name = {...};)."""
    text = filepath.read_text(encoding="utf-8")
    # Find the JSON object after "= "
    match = re.search(r'=\s*(\{.+\})\s*;', text, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find JSON in {filepath}")
    return json.loads(match.group(1))


def build_entry(strongs_id: str, data: dict, language: str) -> dict:
    lemma = data.get("lemma", "")
    translit = data.get("translit", "")
    strongs_def = data.get("strongs_def", "").strip()
    kjv_def = data.get("kjv_def", "").strip()

    # Use KJV def as short definition, strongs_def as longer
    short_def = kjv_def if kjv_def else strongs_def[:80]
    gloss = kjv_def.split(",")[0].strip() if kjv_def else strongs_def.split(",")[0].strip()

    # Clean up definitions
    short_def = short_def.lstrip(" -—")
    gloss = gloss.lstrip(" -—")

    return {
        "strongs": strongs_id,
        "normalized_strongs": strongs_id,
        "lemma": lemma,
        "language": language,
        "transliteration": translit,
        "pronunciation_bopomofo": "",
        "short_definition": short_def,
        "literal_gloss_en": gloss,
        "common_inflections": [],
        "analytical_notes": [],
    }


def main():
    entries = []

    # Greek
    greek = parse_strongs_js(GREEK_JS)
    for sid, data in greek.items():
        entries.append(build_entry(sid, data, "Greek"))

    # Hebrew
    hebrew = parse_strongs_js(HEBREW_JS)
    for sid, data in hebrew.items():
        entries.append(build_entry(sid, data, "Hebrew"))

    # Sort by ID
    entries.sort(key=lambda e: e["strongs"])

    OUTPUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Written {len(entries)} entries ({len(greek)} Greek + {len(hebrew)} Hebrew)")


if __name__ == "__main__":
    main()
