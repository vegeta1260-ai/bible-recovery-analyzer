#!/usr/bin/env python3
"""推廣版 versification remap：把受影響卷的 token 章節由原文（OSHB/WLC、MorphGNT）系統
重對映為恢復本（英文慣例）系統，使逐章頁的章節結構與 runtime 恢復本層對齊。

對映來源：Copenhagen-Alliance 標準 eng.json（scripts/eng-versification.json），
其 mappedVerses 為「英文 ref → 原文 ref」，本腳本反轉成「原文→英文」逐節對映。

範圍與排除：
- 套用：eng.json 涵蓋、且本專案 token 為原文分節的舊約卷。
- 排除 Ps（詩篇題注改由 ChapterRecovery 的 offset 處理，不動 token）。
- 排除 Joel/Mal（已由 remap-joel-mal-versification.py 處理；本腳本不重複）。
- 排除新約（eng.json 未涵蓋；Acts/Rom/2Cor/John 等希臘文差異另議）。
- Num 25:19 為 WLC 特有（eng.json 未列），以 EXTRA_MAP 手動補。

冪等：以跨卷「指紋章」最大節號偵測是否已是恢復本分節（Gen.31=55 且 Gen.32=32、
Jonah.1=17 且 Jonah.2=10、Nah.1=15 且 Nah.2=13），已套用則整體 SKIP——對映多數成鏈
（如原文 Gen 32:2-33→英 32:1-32），二次套用會把節號再位移一次、損毀資料，故必須守門。
--apply 不另存 .bak：token 已在 git，可還原（與其他 remap 腳本一致）。
重跑 OT ETL 後需再執行本腳本（見 web/README SOP）。

用法：
  python3 scripts/remap-versification.py --check   # 只報告（含「疑似已套用」偵測），不改檔
  python3 scripts/remap-versification.py --apply   # 實際重對映；偵測已套用則 SKIP
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOK = ROOT / "public" / "data" / "tokens"
ENG = ROOT / "scripts" / "eng-versification.json"

USFM2OSIS = {
    'GEN': 'Gen', 'EXO': 'Exod', 'LEV': 'Lev', 'NUM': 'Num', 'DEU': 'Deut',
    '1SA': '1Sam', '2SA': '2Sam', '1KI': '1Kgs', '2KI': '2Kgs',
    '1CH': '1Chr', '2CH': '2Chr', 'NEH': 'Neh', 'JOB': 'Job',
    'ECC': 'Eccl', 'SNG': 'Song', 'ISA': 'Isa', 'JER': 'Jer', 'EZK': 'Ezek',
    'DAN': 'Dan', 'HOS': 'Hos', 'JON': 'Jonah', 'MIC': 'Mic', 'NAM': 'Nah', 'ZEC': 'Zech',
}
# 排除：詩篇（offset 處理）、Joel/Mal（已 remap）、新約（另議）
EXCLUDE = {'Ps', 'Joel', 'Mal'}
# WLC 特有、eng.json 未列的手動補充（原文 → 英文）
EXTRA_MAP = {('Num', '25', '19'): ('Num', '26', '1')}
# 冪等指紋：恢復本分節下指紋章的最大節號（由 eng.json 對映推得）。
# 原文分節時為 Gen.31=54/32=33、Jonah.1=16/2=11、Nah.1=14/2=14，兩態不重疊 → 可安全判別。
FINGERPRINTS = [
    ('Gen', {31: 55, 32: 32}),
    ('Jonah', {1: 17, 2: 10}),
    ('Nah', {1: 15, 2: 13}),
]


def expand(ref):
    """'NUM 17:1-15' / 'NUM 16:36' / 'GEN 31:55' → [(osis,ch,vs), ...]"""
    bk, rest = ref.split(' ', 1)
    osis = USFM2OSIS.get(bk)
    if not osis:
        return []
    out = []
    for part in rest.split(','):
        if ':' not in part:
            continue
        ch, vs = part.split(':')
        if '-' in vs:
            a, b = vs.split('-')
            for v in range(int(a), int(b) + 1):
                out.append((osis, ch, str(v)))
        else:
            out.append((osis, ch, vs))
    return out


def build_map():
    mv = json.loads(ENG.read_text(encoding="utf-8"))['mappedVerses']
    org2eng = {}
    for eng_ref, org_ref in mv.items():          # key = 英文, value = 原文
        el, ol = expand(eng_ref), expand(org_ref)
        if el and ol and len(el) == len(ol):
            for o, e in zip(ol, el):
                org2eng[o] = e
    org2eng.update(EXTRA_MAP)
    return org2eng


def remap_book(osis, org2eng, apply):
    f = TOK / f"{osis}.json"
    if not f.exists():
        return None
    toks = json.loads(f.read_text(encoding="utf-8"))
    changed = 0
    for t in toks:
        r = t.get("r")
        if not r:
            continue
        o, c, v = r.split(".")
        ne = org2eng.get((o, c, v))
        if ne:
            t["r"] = f"{ne[0]}.{ne[1]}.{ne[2]}"
            changed += 1
    if apply and changed:
        # token 已在 git，可還原，不另存 .bak；separators 與 compress-tokens.py 一致，避免膨脹
        f.write_text(json.dumps(toks, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    # 回報重對映後各章最大節
    ch = defaultdict(int)
    for t in toks:
        r = t.get("r")
        if not r:
            continue
        _, c, vv = r.split(".")
        ch[int(c)] = max(ch[int(c)], int(vv))
    return changed, ch


def max_verse_by_chapter(osis):
    f = TOK / f"{osis}.json"
    if not f.exists():
        return None
    ch = defaultdict(int)
    for t in json.loads(f.read_text(encoding="utf-8")):
        r = t.get("r")
        if not r:
            continue
        _, c, v = r.split(".")
        ch[int(c)] = max(ch[int(c)], int(v))
    return ch


def already_applied():
    """冪等守門：指紋卷全數符合恢復本分節才判定已套用；任一卷不符即視為原文分節。"""
    checked = 0
    for osis, expect in FINGERPRINTS:
        ch = max_verse_by_chapter(osis)
        if ch is None:
            continue
        checked += 1
        if any(ch.get(c) != v for c, v in expect.items()):
            return False
    return checked > 0


def guard_key_style():
    """key-style 防呆：長 key token（ETL 直出、未經 compress-tokens.py）沒有 'r' 欄，
    本腳本會靜默 no-op 並誤報成功 → 抽第一卷第一筆偵測，長 key 即 abort。"""
    for f in sorted(TOK.glob("*.json")):
        toks = json.loads(f.read_text(encoding="utf-8"))
        if toks and isinstance(toks[0], dict) and "verse_ref" in toks[0]:
            sys.exit(f"錯誤：{f.name} 為長 key token（含 verse_ref），請先跑 compress-tokens.py 再執行本腳本")
        return


def main():
    apply = "--apply" in sys.argv
    guard_key_style()
    org2eng = build_map()
    affected = sorted({o for (o, _, _) in org2eng} - EXCLUDE)
    print(f"{'APPLY' if apply else 'CHECK'}：受影響卷 {affected}")
    if already_applied():
        # 對映成鏈，二次套用會把節號再位移 → 無論 --check/--apply 一律整體 SKIP
        print("SKIP：指紋章（Gen.31/32、Jonah.1/2、Nah.1/2）已符合恢復本分節，疑似已套用，不做任何變更")
        return
    total = 0
    for osis in affected:
        res = remap_book(osis, org2eng, apply)
        if res is None:
            print(f"  {osis}: 無 token 檔，略過")
            continue
        changed, _ = res
        total += changed
        print(f"  {osis}: 重對映 {changed} 個 token")
    print(f"{'已重對映（token 在 git，可還原）' if apply else '（--check 未改檔）'}，共 {total} 個 token")


if __name__ == "__main__":
    main()
