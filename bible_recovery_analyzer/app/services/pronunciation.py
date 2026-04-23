HEBREW_RULES = {
    "sh": "ㄕ",
    "ts": "ㄘ",
    "ch": "ㄏ",
    "ʾ": "ㄚ",
    "ă": "ㄚ",
    "ā": "ㄚ",
    "e": "ㄝ",
    "ē": "ㄟ",
    "i": "ㄧ",
    "î": "ㄧ",
    "o": "ㄛ",
    "ō": "ㄡ",
    "u": "ㄨ",
    "û": "ㄨ",
    "b": "ㄅ",
    "g": "ㄍ",
    "d": "ㄉ",
    "h": "ㄏ",
    "w": "ㄨ",
    "z": "ㄗ",
    "y": "ㄧ",
    "k": "ㄎ",
    "l": "ㄌ",
    "m": "ㄇ",
    "n": "ㄋ",
    "p": "ㄆ",
    "r": "ㄖ",
    "s": "ㄙ",
    "t": "ㄊ",
}

GREEK_RULES = {
    "th": "ㄙ",
    "ph": "ㄈ",
    "ch": "ㄎ",
    "ps": "ㄆㄙ",
    "ou": "ㄨ",
    "ai": "ㄞ",
    "ei": "ㄟ",
    "oi": "ㄛㄧ",
    "a": "ㄚ",
    "e": "ㄝ",
    "ē": "ㄟ",
    "i": "ㄧ",
    "o": "ㄛ",
    "u": "ㄨ",
    "b": "ㄅ",
    "g": "ㄍ",
    "d": "ㄉ",
    "z": "ㄗ",
    "k": "ㄎ",
    "l": "ㄌ",
    "m": "ㄇ",
    "n": "ㄋ",
    "p": "ㄆ",
    "r": "ㄖ",
    "s": "ㄙ",
    "t": "ㄊ",
    "x": "ㄎㄙ",
}


def transliteration_to_zhuyin_like(text: str, language: str) -> str:
    rules = HEBREW_RULES if language.lower() == "hebrew" else GREEK_RULES
    out = text.lower()
    for source, target in sorted(rules.items(), key=lambda kv: len(kv[0]), reverse=True):
        out = out.replace(source, target)
    return out
