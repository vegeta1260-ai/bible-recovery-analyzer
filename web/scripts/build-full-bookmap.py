#!/usr/bin/env python3
"""Build complete 66-book bookMap.json with Chinese names and aliases."""

import json
from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / "src" / "data" / "bookMap.json"

BOOKS = [
    # OT
    ("Gen", "Genesis", "創世記", ["創", "創世記", "gen", "genesis"]),
    ("Exod", "Exodus", "出埃及記", ["出", "出埃及記", "exod", "exodus"]),
    ("Lev", "Leviticus", "利未記", ["利", "利未記", "lev", "leviticus"]),
    ("Num", "Numbers", "民數記", ["民", "民數記", "num", "numbers"]),
    ("Deut", "Deuteronomy", "申命記", ["申", "申命記", "deut", "deuteronomy"]),
    ("Josh", "Joshua", "約書亞記", ["書", "約書亞記", "josh", "joshua"]),
    ("Judg", "Judges", "士師記", ["士", "士師記", "judg", "judges"]),
    ("Ruth", "Ruth", "路得記", ["得", "路得記", "ruth"]),
    ("1Sam", "1 Samuel", "撒母耳記上", ["撒上", "撒母耳記上", "1sam", "1 sam", "1samuel"]),
    ("2Sam", "2 Samuel", "撒母耳記下", ["撒下", "撒母耳記下", "2sam", "2 sam", "2samuel"]),
    ("1Kgs", "1 Kings", "列王紀上", ["王上", "列王紀上", "1kgs", "1 kgs", "1kings"]),
    ("2Kgs", "2 Kings", "列王紀下", ["王下", "列王紀下", "2kgs", "2 kgs", "2kings"]),
    ("1Chr", "1 Chronicles", "歷代志上", ["代上", "歷代志上", "1chr", "1 chr", "1chronicles"]),
    ("2Chr", "2 Chronicles", "歷代志下", ["代下", "歷代志下", "2chr", "2 chr", "2chronicles"]),
    ("Ezra", "Ezra", "以斯拉記", ["拉", "以斯拉記", "ezra"]),
    ("Neh", "Nehemiah", "尼希米記", ["尼", "尼希米記", "neh", "nehemiah"]),
    ("Esth", "Esther", "以斯帖記", ["帖", "以斯帖記", "esth", "esther"]),
    ("Job", "Job", "約伯記", ["伯", "約伯記", "job"]),
    ("Ps", "Psalms", "詩篇", ["詩", "詩篇", "ps", "psalm", "psalms"]),
    ("Prov", "Proverbs", "箴言", ["箴", "箴言", "prov", "proverbs"]),
    ("Eccl", "Ecclesiastes", "傳道書", ["傳", "傳道書", "eccl", "ecclesiastes"]),
    ("Song", "Song of Solomon", "雅歌", ["歌", "雅歌", "song", "songofsolomon"]),
    ("Isa", "Isaiah", "以賽亞書", ["賽", "以賽亞書", "isa", "isaiah"]),
    ("Jer", "Jeremiah", "耶利米書", ["耶", "耶利米書", "jer", "jeremiah"]),
    ("Lam", "Lamentations", "耶利米哀歌", ["哀", "耶利米哀歌", "lam", "lamentations"]),
    ("Ezek", "Ezekiel", "以西結書", ["結", "以西結書", "ezek", "ezekiel"]),
    ("Dan", "Daniel", "但以理書", ["但", "但以理書", "dan", "daniel"]),
    ("Hos", "Hosea", "何西阿書", ["何", "何西阿書", "hos", "hosea"]),
    ("Joel", "Joel", "約珥書", ["珥", "約珥書", "joel"]),
    ("Amos", "Amos", "阿摩司書", ["摩", "阿摩司書", "amos"]),
    ("Obad", "Obadiah", "俄巴底亞書", ["俄", "俄巴底亞書", "obad", "obadiah"]),
    ("Jonah", "Jonah", "約拿書", ["拿", "約拿書", "jonah"]),
    ("Mic", "Micah", "彌迦書", ["彌", "彌迦書", "mic", "micah"]),
    ("Nah", "Nahum", "那鴻書", ["鴻", "那鴻書", "nah", "nahum"]),
    ("Hab", "Habakkuk", "哈巴谷書", ["哈", "哈巴谷書", "hab", "habakkuk"]),
    ("Zeph", "Zephaniah", "西番雅書", ["番", "西番雅書", "zeph", "zephaniah"]),
    ("Hag", "Haggai", "哈該書", ["該", "哈該書", "hag", "haggai"]),
    ("Zech", "Zechariah", "撒迦利亞書", ["亞", "撒迦利亞書", "zech", "zechariah"]),
    ("Mal", "Malachi", "瑪拉基書", ["瑪", "瑪拉基書", "mal", "malachi"]),
    # NT
    ("Matt", "Matthew", "馬太福音", ["太", "馬太", "matt", "matthew"]),
    ("Mark", "Mark", "馬可福音", ["可", "馬可", "mark"]),
    ("Luke", "Luke", "路加福音", ["路", "路加", "luke"]),
    ("John", "John", "約翰福音", ["約", "約翰", "john"]),
    ("Acts", "Acts", "使徒行傳", ["徒", "使徒行傳", "acts"]),
    ("Rom", "Romans", "羅馬書", ["羅", "rom", "romans"]),
    ("1Cor", "1 Corinthians", "哥林多前書", ["林前", "1cor", "1 cor", "1corinthians"]),
    ("2Cor", "2 Corinthians", "哥林多後書", ["林後", "2cor", "2 cor", "2corinthians"]),
    ("Gal", "Galatians", "加拉太書", ["加", "gal", "galatians"]),
    ("Eph", "Ephesians", "以弗所書", ["弗", "eph", "ephesians"]),
    ("Phil", "Philippians", "腓立比書", ["腓", "phil", "philippians"]),
    ("Col", "Colossians", "歌羅西書", ["西", "col", "colossians"]),
    ("1Thess", "1 Thessalonians", "帖撒羅尼迦前書", ["帖前", "1thess", "1 thess"]),
    ("2Thess", "2 Thessalonians", "帖撒羅尼迦後書", ["帖後", "2thess", "2 thess"]),
    ("1Tim", "1 Timothy", "提摩太前書", ["提前", "1tim", "1 tim"]),
    ("2Tim", "2 Timothy", "提摩太後書", ["提後", "2tim", "2 tim"]),
    ("Titus", "Titus", "提多書", ["多", "titus"]),
    ("Phlm", "Philemon", "腓利門書", ["門", "phlm", "philemon"]),
    ("Heb", "Hebrews", "希伯來書", ["來", "heb", "hebrews"]),
    ("Jas", "James", "雅各書", ["雅", "jas", "james"]),
    ("1Pet", "1 Peter", "彼得前書", ["彼前", "1pet", "1 pet"]),
    ("2Pet", "2 Peter", "彼得後書", ["彼後", "2pet", "2 pet"]),
    ("1John", "1 John", "約翰一書", ["約一", "1john", "1 john"]),
    ("2John", "2 John", "約翰二書", ["約二", "2john", "2 john"]),
    ("3John", "3 John", "約翰三書", ["約三", "3john", "3 john"]),
    ("Jude", "Jude", "猶大書", ["猶", "jude"]),
    ("Rev", "Revelation", "啟示錄", ["啟", "啟示錄", "rev", "revelation"]),
]


def main():
    rows = [{"osis": o, "english": e, "zh": z, "aliases": a} for o, e, z, a in BOOKS]
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Written {len(rows)} books to {OUTPUT}")


if __name__ == "__main__":
    main()
