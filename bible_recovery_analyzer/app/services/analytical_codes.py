from __future__ import annotations

from app.models.schemas import AnalyticalCodeInfo

ANALYTICAL_CODE_LEGEND = {
    "N": "Noun / 名詞",
    "V": "Verb / 動詞",
    "A": "Adjective / 形容詞",
    "D": "Article / 冠詞",
    "P": "Pronoun / 代名詞",
    "R": "Preposition / 介系詞",
    "C": "Conjunction / 連接詞",
    "I": "Interjection / 感嘆詞",
    "X": "Crasis or Contracted form / 縮合型",
    "M/P": "Middle/Passive merged / 中被動合併",
    "NOM": "Nominative 主格",
    "GEN": "Genitive 屬格",
    "DAT": "Dative 與格",
    "ACC": "Accusative 受格",
    "VOC": "Vocative 呼格",
    "SG": "Singular 單數",
    "PL": "Plural 複數",
    "MASC": "Masculine 陽性",
    "FEM": "Feminine 陰性",
    "NEUT": "Neuter 中性",
    "1": "First person 第一人稱",
    "2": "Second person 第二人稱",
    "3": "Third person 第三人稱",
    "PRES": "Present 現在",
    "IMPF": "Imperfect 未完成過去",
    "AOR": "Aorist 簡單過去",
    "PERF": "Perfect 完成",
    "PLUP": "Pluperfect 過去完成",
    "FUT": "Future 將來",
    "IND": "Indicative 直說",
    "SUBJ": "Subjunctive 假設/虛擬",
    "IMP": "Imperative 命令",
    "OPT": "Optative 願望",
    "PTCP": "Participle 分詞",
    "INF": "Infinitive 不定詞",
}

ABBREVIATION_LEGEND = {
    "form_priority": "分析優先按形態(form)而非只按語用(function)",
    "function_exception": "在語法現象明確時可標示 function-based 例外",
    "ot_quote": "OT quote 在輸出層可標註 quotation marker",
}

GRAMMAR_NOTES = {
    "article": "定冠詞通常保持明確指向；不補英語不定冠詞 a/an。",
    "participle": "分詞優先以分詞語感處理，必要時附屬語境補充。",
    "infinitive": "不定詞可按『to + 動詞』或名詞化結構處理。",
    "historical_present": "歷史現在式可在翻譯註記標示敘事張力。",
    "imperfect_aorist_perfect": "imperfect/aorist/perfect 建議分別標示進行、整體事件、完成狀態傾向。",
    "adverbial_genitive": "副詞性屬格可加上關係詞提示。",
    "neuter_plural_singular_verb": "中性複數主語可對應單數動詞（希臘文慣用法）。",
    "improper_prepositions": "非典型介系詞/副詞可標註為語法例外。",
    "vocative": "呼格名詞宜保持呼語語氣。",
    "prononominal_adjective": "代名詞化形容詞可在 notes 顯示指代功能。",
    "hebrew_aramaic_in_greek": "希伯來/亞蘭借詞應保留語源說明。",
}


def parse_analytical_code(code: str) -> AnalyticalCodeInfo:
    parts = [p for p in code.replace("/", "-").split("-") if p]
    expanded = {p: ANALYTICAL_CODE_LEGEND.get(p, "unknown") for p in parts}
    if "M/P" in code:
        expanded["M/P"] = ANALYTICAL_CODE_LEGEND["M/P"]

    return AnalyticalCodeInfo(
        code=code,
        expanded=expanded,
        legend=ANALYTICAL_CODE_LEGEND,
        methodology_note=(
            "Code expansion follows form-first strategy; function-based overrides are flagged in grammar notes."
        ),
    )
