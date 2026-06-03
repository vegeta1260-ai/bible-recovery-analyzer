#!/usr/bin/env python3
"""一次性：把 Joel / Mal 的 token 章節由「OSHB 希伯來版本」重對映為「恢復本（英文慣例）版本」。

緣由：OSHB(WLC) 用希伯來分章（Joel 4 章、Mal 3 章），但恢復本（LSM）與中文慣例用
Joel 3 章、Mal 4 章。逐章頁由 token 產生，若不對映，頁面章號會與恢復本錯位，
runtime 恢復本層也對不上。本腳本依標準對映修正這 2 卷（其餘 64 卷不受影響）。

標準對映（已用 token 節數與 LSM 回傳節數雙向驗證）：
  Joel: Heb 1→恢1, Heb 2(1-27)→恢2(1-27), Heb 3(1-5)→恢2(28-32), Heb 4(1-21)→恢3(1-21)
  Mal : Heb 1→恢1, Heb 2→恢2, Heb 3(1-18)→恢3(1-18), Heb 3(19-24)→恢4(1-6)

冪等：若偵測到已是恢復本形式則跳過（Joel 無 ch4 / Mal 有 ch4）。
用法：cd web && python3 scripts/remap-joel-mal-versification.py
"""
import json
from pathlib import Path

TOK = Path(__file__).resolve().parents[1] / "public" / "data" / "tokens"


def chapters(tokens):
    return {t["r"].split(".")[1] for t in tokens if t.get("r")}


def remap_joel(tokens):
    if "4" not in chapters(tokens):
        return False  # 已是恢復本形式
    for t in tokens:
        r = t.get("r")
        if not r:
            continue
        _, c, v = r.split(".")
        v = int(v)
        if c == "3":      # Heb 3:1-5 → 恢復本 2:28-32
            t["r"] = f"Joel.2.{27 + v}"
        elif c == "4":    # Heb 4:1-21 → 恢復本 3:1-21
            t["r"] = f"Joel.3.{v}"
    return True


def remap_mal(tokens):
    if "4" in chapters(tokens):
        return False  # 已是恢復本形式
    for t in tokens:
        r = t.get("r")
        if not r:
            continue
        _, c, v = r.split(".")
        v = int(v)
        if c == "3" and v >= 19:   # Heb 3:19-24 → 恢復本 4:1-6
            t["r"] = f"Mal.4.{v - 18}"
    return True


def sort_key(t):
    p = t.get("r", "").split(".")
    return (int(p[1]) if len(p) > 2 else 0, int(p[2]) if len(p) > 2 else 0, t.get("o", 0))


def run(name, fn):
    f = TOK / f"{name}.json"
    tokens = json.loads(f.read_text("utf-8"))
    if not fn(tokens):
        print(f"  {name}: 已是恢復本章節，跳過")
        return
    tokens.sort(key=sort_key)
    f.write_text(json.dumps(tokens, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    chs = sorted(chapters(tokens), key=int)
    print(f"  {name}: 已重對映 → 章 {','.join(chs)}")


if __name__ == "__main__":
    run("Joel", remap_joel)
    run("Mal", remap_mal)
