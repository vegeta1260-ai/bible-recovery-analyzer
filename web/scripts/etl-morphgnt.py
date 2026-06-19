#!/usr/bin/env python3
"""
ETL: MorphGNT SBLGNT → per-book token JSON files.

Input:  /tmp/sblgnt/*.txt (MorphGNT tab-separated format)
Output: web/public/data/tokens/{Book}.json

MorphGNT format per line (space-separated, 7 欄):
  BBCCVV  POS  morphcode  text  word  normalized  lemma
  parts:  [0]    [1]   [2]      [3]   [4]    [5]       [6]
  ⚠️ 早期版本誤把 [5]（normalized，仍是變化形）當 lemma，導致新約 lemma 多為屈折形、
     無法對映 Strong's。正解：lemma = parts[6]（字典原形），normalized = parts[5]。
  Strong's：MorphGNT 本身不含，改以字典原形對 web/src/data/lexicon.json 的 G-lemma 反查（命中 ~98.5%）。

Morphcode positions (8 chars):
  0: person (1,2,3,-)
  1: tense (P,I,F,A,X,Y,-)
  2: voice (A,M,P,-)
  3: mood (I,D,S,O,N,P,-)
  4: case (N,G,D,A,V,-)
  5: number (S,P,-)
  6: gender (M,F,N,-)
  7: degree (C,S,-)
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

SBLGNT_DIR = Path("/tmp/sblgnt")
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "public" / "data" / "tokens"
LEXICON = Path(__file__).resolve().parents[1] / "src" / "data" / "lexicon.json"


def _norm_lemma(s: str) -> str:
    """正規化希臘文 lemma 以利對映 Strong's：去括號內可動字尾（如 οὕτω(ς)）、去標點、去重音、轉小寫。"""
    s = re.sub(r"\([^)]*\)", "", s)          # οὕτω(ς) → οὕτω
    s = re.sub(r"[\[\].,··;:’'\"]", "", s)
    nfd = unicodedata.normalize("NFD", s)
    s = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return unicodedata.normalize("NFC", s).lower()


def load_strongs_map() -> dict:
    """從 web/src/data/lexicon.json 建 正規化 G-lemma → Strong's 對映（新約用）。"""
    lex = json.loads(LEXICON.read_text(encoding="utf-8"))
    m = {}
    for e in lex:
        st = e.get("strongs", "")
        if st.startswith("G"):
            m.setdefault(_norm_lemma(e.get("lemma", "")), st)
    return m

# MorphGNT file number → OSIS book abbreviation
FILE_MAP = {
    "61": "Matt", "62": "Mark", "63": "Luke", "64": "John", "65": "Acts",
    "66": "Rom", "67": "1Cor", "68": "2Cor", "69": "Gal", "70": "Eph",
    "71": "Phil", "72": "Col", "73": "1Thess", "74": "2Thess",
    "75": "1Tim", "76": "2Tim", "77": "Titus", "78": "Phlm",
    "79": "Heb", "80": "Jas", "81": "1Pet", "82": "2Pet",
    "83": "1John", "84": "2John", "85": "3John", "86": "Jude", "87": "Rev",
}

POS_MAP = {
    "N-": "noun", "V-": "verb", "RA": "article", "A-": "adjective",
    "RP": "pronoun", "RR": "relative pronoun", "RD": "demonstrative pronoun",
    "RI": "interrogative pronoun", "RX": "indefinite pronoun",
    "P-": "preposition", "C-": "conjunction", "D-": "adverb",
    "I-": "interjection", "X-": "particle",
}

PERSON_MAP = {"1": "1", "2": "2", "3": "3"}
TENSE_MAP = {"P": "present", "I": "imperfect", "F": "future", "A": "aorist", "X": "perfect", "Y": "pluperfect"}
VOICE_MAP = {"A": "active", "M": "middle", "P": "passive"}
MOOD_MAP = {"I": "indicative", "D": "imperative", "S": "subjunctive", "O": "optative", "N": "infinitive", "P": "participle"}
CASE_MAP = {"N": "nominative", "G": "genitive", "D": "dative", "A": "accusative", "V": "vocative"}
NUMBER_MAP = {"S": "singular", "P": "plural"}
GENDER_MAP = {"M": "masculine", "F": "feminine", "N": "neuter"}

CODE_ABBREV = {
    "nominative": "NOM", "genitive": "GEN", "dative": "DAT",
    "accusative": "ACC", "vocative": "VOC",
    "singular": "SG", "plural": "PL",
    "masculine": "MASC", "feminine": "FEM", "neuter": "NEUT",
    "present": "PRES", "imperfect": "IMPF", "future": "FUT",
    "aorist": "AOR", "perfect": "PERF", "pluperfect": "PLUP",
    "indicative": "IND", "imperative": "IMP", "subjunctive": "SUBJ",
    "optative": "OPT", "infinitive": "INF", "participle": "PTCP",
    "active": "ACT", "middle": "MID", "passive": "PASS",
}


def parse_morphcode(pos_code: str, morphcode: str) -> dict:
    """Parse 8-char morphcode into structured features."""
    features = {}
    if len(morphcode) < 8:
        morphcode = morphcode.ljust(8, "-")

    if morphcode[0] in PERSON_MAP:
        features["person"] = PERSON_MAP[morphcode[0]]
    if morphcode[1] in TENSE_MAP:
        features["tense"] = TENSE_MAP[morphcode[1]]
    if morphcode[2] in VOICE_MAP:
        features["voice"] = VOICE_MAP[morphcode[2]]
    if morphcode[3] in MOOD_MAP:
        features["mood"] = MOOD_MAP[morphcode[3]]
    if morphcode[4] in CASE_MAP:
        features["case"] = CASE_MAP[morphcode[4]]
    if morphcode[5] in NUMBER_MAP:
        features["number"] = NUMBER_MAP[morphcode[5]]
    if morphcode[6] in GENDER_MAP:
        features["gender"] = GENDER_MAP[morphcode[6]]

    return features


def build_analytical_code(pos: str, features: dict) -> str:
    """Build analytical code like N-NOM-SG-MASC."""
    parts = [pos[0] if pos else "?"]
    order = ["case", "number", "gender", "person", "tense", "voice", "mood"]
    for key in order:
        val = features.get(key, "")
        if val and val in CODE_ABBREV:
            parts.append(CODE_ABBREV[val])
        elif val:
            parts.append(val.upper()[:4])
    return "-".join(parts)


def parse_verse_ref(code: str, book_osis: str) -> str:
    """Convert BBCCVV to OSIS ref like John.1.1."""
    chapter = int(code[2:4])
    verse = int(code[4:6])
    return f"{book_osis}.{chapter}.{verse}"


def process_file(filepath: Path, book_osis: str, strongs_map: dict) -> list[dict]:
    tokens = []
    current_ref = ""
    token_order = 0

    for line in filepath.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue

        parts = line.split()
        if len(parts) < 7:
            continue

        ref_code, pos_code, morphcode = parts[0], parts[1], parts[2]
        surface = parts[3].rstrip(",")
        normalized = parts[5]          # 真正的 normalized 形（變化形，含可動字尾正規化）
        lemma = parts[6]               # 字典原形（修正：原誤取 parts[5]）
        strongs_primary = strongs_map.get(_norm_lemma(lemma), "")

        verse_ref = parse_verse_ref(ref_code, book_osis)
        if verse_ref != current_ref:
            current_ref = verse_ref
            token_order = 0
        token_order += 1

        pos_name = POS_MAP.get(pos_code, pos_code.lower())
        features = parse_morphcode(pos_code, morphcode)
        analytical_code = build_analytical_code(pos_code, features)

        tokens.append({
            "verse_ref": verse_ref,
            "token_order": token_order,
            "surface_form": surface,
            "normalized_form": normalized,
            "lemma": lemma,
            "strongs_primary": strongs_primary,
            "strongs_secondary": None,
            "analytical_code_raw": analytical_code,
            "part_of_speech": pos_name,
            "morphology_features": features,
            "literal_gloss_en": "",
            "translation_note_zh": "",
            "recovery_alignment_note": "",
            "pronunciation_transliteration": "",
            "pronunciation_bopomofo": "",
            "source_layer": "SBLGNT|MorphGNT",
            "verse_usage": "",
            "grammar_explanation": "",
            "is_ot_quote": False,
        })

    return tokens


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    strongs_map = load_strongs_map()
    print(f"  載入 Strong's 對映表：{len(strongs_map)} 個 G-lemma")
    total = 0
    total_st = 0

    for txt_file in sorted(SBLGNT_DIR.glob("*-morphgnt.txt")):
        file_num = txt_file.name.split("-")[0]
        book_osis = FILE_MAP.get(file_num)
        if not book_osis:
            print(f"  skip {txt_file.name} (unknown book number {file_num})")
            continue

        tokens = process_file(txt_file, book_osis, strongs_map)
        out_path = OUTPUT_DIR / f"{book_osis}.json"
        out_path.write_text(json.dumps(tokens, ensure_ascii=False), encoding="utf-8")

        st_hit = sum(1 for t in tokens if t["strongs_primary"])
        size_kb = out_path.stat().st_size / 1024
        print(f"  {book_osis:8s} {len(tokens):6d} tokens  st {st_hit:6d}  {size_kb:7.0f} KB")
        total += len(tokens)
        total_st += st_hit

    print(f"\nTotal: {total} tokens across {len(FILE_MAP)} books；Strong's 命中 {total_st} ({total_st/total*100:.1f}%)")


if __name__ == "__main__":
    main()
