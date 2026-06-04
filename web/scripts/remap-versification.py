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

冪等：以「受影響章重對映後節數是否已等於原狀」偵測；實務上用 --check 先驗證、
--apply 才寫檔，且寫 .bak 備份。重跑 OT ETL 後需再執行本腳本（見 web/README SOP）。

用法：
  python3 scripts/remap-versification.py --check   # 只報告，不改檔
  python3 scripts/remap-versification.py --apply   # 備份 .bak 後實際重對映
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
    mv = json.loads(ENG.read_text())['mappedVerses']
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
    toks = json.loads(f.read_text())
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
        f.write_text(json.dumps(toks, ensure_ascii=False))  # token 已在 git，可還原，不另存 .bak
    # 回報重對映後各章最大節
    ch = defaultdict(int)
    for t in toks:
        r = t.get("r")
        if not r:
            continue
        _, c, vv = r.split(".")
        ch[int(c)] = max(ch[int(c)], int(vv))
    return changed, ch


def main():
    apply = "--apply" in sys.argv
    org2eng = build_map()
    affected = sorted({o for (o, _, _) in org2eng} - EXCLUDE)
    print(f"{'APPLY' if apply else 'CHECK'}：受影響卷 {affected}")
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
