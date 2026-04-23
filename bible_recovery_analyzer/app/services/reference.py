import re

from app.data.book_map import BOOK_ALIASES


REF_PATTERN = re.compile(r"^([\u4e00-\u9fa5A-Za-z0-9 ]+)(\d+):(\d+)(?:-(\d+))?$")


def normalize_ref(ref: str) -> str:
    text = ref.strip()
    m = REF_PATTERN.match(text)
    if not m:
        raise ValueError("無法解析經文格式，請使用如 創1:1 或 John1:1-3")
    book_raw, chapter, verse_start, verse_end = m.groups()
    key = book_raw.replace(" ", "").lower()
    osis = BOOK_ALIASES.get(key)
    if not osis:
        raise ValueError(f"不支援的書卷：{book_raw}")
    if verse_end:
        return f"{osis}.{chapter}.{verse_start}-{verse_end}"
    return f"{osis}.{chapter}.{verse_start}"


def split_osis_range(osis_ref: str) -> list[str]:
    if "-" not in osis_ref:
        return [osis_ref]
    left, end = osis_ref.split("-")
    bcv = left.split(".")
    start = int(bcv[2])
    stop = int(end)
    return [f"{bcv[0]}.{bcv[1]}.{v}" for v in range(start, stop + 1)]
