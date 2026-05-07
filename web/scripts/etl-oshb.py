#!/usr/bin/env python3
"""
ETL: OSHB (Open Scriptures Hebrew Bible) → per-book token JSON files.

Input:  /tmp/morphhb/wlc/*.xml
Output: web/public/data/tokens/{Book}.json
"""

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

OSHB_DIR = Path("/tmp/morphhb/wlc")
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "public" / "data" / "tokens"

NS = {"osis": "http://www.bibletechnologies.net/2003/OSIS/namespace"}

# OSIS book names from filenames
OT_BOOKS = [
    "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth",
    "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth",
    "Job", "Ps", "Prov", "Eccl", "Song",
    "Isa", "Jer", "Lam", "Ezek", "Dan",
    "Hos", "Joel", "Amos", "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal",
]

# OSHB morph code prefix → POS
POS_MAP = {
    "HN": "noun", "HV": "verb", "HA": "adjective", "HR": "preposition",
    "HC": "conjunction", "HD": "article", "HP": "pronoun", "HT": "particle",
    "HI": "interjection", "HS": "suffix",
    "AN": "noun", "AV": "verb",  # Aramaic
}

CODE_ABBREV = {
    "nominative": "NOM", "genitive": "GEN", "dative": "DAT",
    "accusative": "ACC", "construct": "CST", "absolute": "ABS",
    "singular": "SG", "plural": "PL", "dual": "DL",
    "masculine": "MASC", "feminine": "FEM", "common": "COM",
    "perfect": "PERF", "imperfect": "IMPF", "imperative": "IMP",
    "infinitive": "INF", "participle": "PTCP",
    "qal": "QAL", "niphal": "NIPH", "piel": "PIEL", "pual": "PUAL",
    "hiphil": "HIPH", "hophal": "HOPH", "hithpael": "HITH",
}

STEM_MAP = {
    "q": "qal", "N": "niphal", "p": "piel", "P": "pual",
    "h": "hiphil", "H": "hophal", "t": "hithpael",
    "o": "polel", "O": "polal", "r": "hithpolel",
    "D": "piel", "K": "pual",  # Aramaic stems
}

PERSON_MAP = {"1": "1", "2": "2", "3": "3"}
GENDER_MAP = {"m": "masculine", "f": "feminine", "c": "common"}
NUMBER_MAP = {"s": "singular", "p": "plural", "d": "dual"}
STATE_MAP = {"c": "construct", "a": "absolute"}
TENSE_MAP = {
    "p": "perfect", "q": "sequential-perfect",
    "i": "imperfect", "w": "sequential-imperfect",
    "h": "cohortative", "j": "jussive",
    "v": "imperative", "r": "participle-active",
    "s": "participle-passive", "a": "infinitive-absolute",
    "c": "infinitive-construct",
}


def parse_oshb_morph(morph: str) -> tuple[str, dict]:
    """Parse OSHB morphology code like 'HNcfsa' into (pos_name, features)."""
    if not morph or len(morph) < 2:
        return ("unknown", {})

    lang_pos = morph[:2]
    pos_name = POS_MAP.get(lang_pos, morph[:2].lower())
    features = {}
    rest = morph[2:]

    if lang_pos in ("HV", "AV") and len(rest) >= 1:
        # Verb: stem, tense, person, gender, number, state
        if rest[0] in STEM_MAP:
            features["stem"] = STEM_MAP[rest[0]]
        if len(rest) > 1 and rest[1] in TENSE_MAP:
            features["tense"] = TENSE_MAP[rest[1]]
        if len(rest) > 2 and rest[2] in PERSON_MAP:
            features["person"] = PERSON_MAP[rest[2]]
        if len(rest) > 3 and rest[3] in GENDER_MAP:
            features["gender"] = GENDER_MAP[rest[3]]
        if len(rest) > 4 and rest[4] in NUMBER_MAP:
            features["number"] = NUMBER_MAP[rest[4]]
    else:
        # Non-verb: type, gender, number, state
        for ch in rest:
            if ch in GENDER_MAP and "gender" not in features:
                features["gender"] = GENDER_MAP[ch]
            elif ch in NUMBER_MAP and "number" not in features:
                features["number"] = NUMBER_MAP[ch]
            elif ch in STATE_MAP and "state" not in features:
                features["state"] = STATE_MAP[ch]

    return (pos_name, features)


def build_analytical_code(pos_name: str, features: dict) -> str:
    parts = [pos_name[0].upper() if pos_name else "?"]
    order = ["state", "number", "gender", "person", "tense", "stem"]
    for key in order:
        val = features.get(key, "")
        if val and val in CODE_ABBREV:
            parts.append(CODE_ABBREV[val])
        elif val:
            parts.append(val.upper()[:4])
    return "-".join(parts)


def process_xml(filepath: Path, book_osis: str) -> list[dict]:
    tokens = []
    tree = ET.parse(filepath)
    root = tree.getroot()

    for verse_el in root.iter(f"{{{NS['osis']}}}verse"):
        osis_id = verse_el.get("osisID", "")
        if not osis_id:
            continue
        # osisID format: "Gen.1.1"
        verse_ref = osis_id.replace(" ", ".")
        token_order = 0

        for w_el in verse_el.iter(f"{{{NS['osis']}}}w"):
            token_order += 1
            surface = w_el.text or ""
            surface = surface.strip()
            if not surface:
                continue

            lemma_raw = w_el.get("lemma", "")
            morph_raw = w_el.get("morph", "")

            # Extract Strong's from lemma attribute (e.g. "7225" or "c/7225")
            strongs = ""
            lemma_nums = re.findall(r"(\d+)", lemma_raw)
            if lemma_nums:
                strongs = f"H{lemma_nums[0]}"

            pos_name, features = parse_oshb_morph(morph_raw)
            analytical_code = build_analytical_code(pos_name, features)

            # Normalized form: strip cantillation/vowel marks for a rough normalized version
            normalized = re.sub(r'[\u0591-\u05C7]', '', surface)

            tokens.append({
                "verse_ref": verse_ref,
                "token_order": token_order,
                "surface_form": surface,
                "normalized_form": normalized,
                "lemma": surface,  # OSHB doesn't have separate lemma easily; use surface
                "strongs_primary": strongs,
                "strongs_secondary": None,
                "analytical_code_raw": analytical_code,
                "part_of_speech": pos_name,
                "morphology_features": features,
                "literal_gloss_en": "",
                "translation_note_zh": "",
                "recovery_alignment_note": "",
                "pronunciation_transliteration": "",
                "pronunciation_bopomofo": "",
                "source_layer": "OSHB|WLC",
                "verse_usage": "",
                "grammar_explanation": "",
                "is_ot_quote": False,
            })

    return tokens


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0

    for book in OT_BOOKS:
        xml_file = OSHB_DIR / f"{book}.xml"
        if not xml_file.exists():
            print(f"  skip {book} (file not found)")
            continue

        tokens = process_xml(xml_file, book)
        out_path = OUTPUT_DIR / f"{book}.json"
        out_path.write_text(json.dumps(tokens, ensure_ascii=False), encoding="utf-8")

        size_kb = out_path.stat().st_size / 1024
        print(f"  {book:8s} {len(tokens):6d} tokens  {size_kb:7.0f} KB")
        total += len(tokens)

    print(f"\nTotal: {total} OT tokens")


if __name__ == "__main__":
    main()
