import re

STRONGS_CANONICAL = re.compile(r"^([GH])(\d{1,4})([A-Z]?)$")

SPECIAL_NORMALIZATION = {
    "G3056A": "G3056",
    "H430A": "H430",
}


def normalize_strongs(raw: str) -> str:
    text = raw.strip().upper().replace("’", "").replace("'", "")
    text = SPECIAL_NORMALIZATION.get(text, text)
    m = STRONGS_CANONICAL.match(text)
    if not m:
        raise ValueError(f"Invalid Strong's ID: {raw}")
    prefix, digits, suffix = m.groups()
    normalized = f"{prefix}{int(digits)}"
    return normalized if not suffix else f"{normalized}{suffix}"


def representative_lemma_key(lemma: str) -> str:
    return lemma.strip().lower()
