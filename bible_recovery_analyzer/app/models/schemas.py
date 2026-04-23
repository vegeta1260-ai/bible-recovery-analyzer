from typing import Literal

from pydantic import BaseModel, Field

ResponseMode = Literal["standard", "detailed", "interlinear", "study_card", "compact"]


class Attribution(BaseModel):
    source: str
    copyright_notice: str
    fetched_via_live_api: bool = True


class LayeredLines(BaseModel):
    original_text_line: list[str]
    strongs_line: list[str]
    analytical_code_line: list[str]
    gloss_line: list[str]
    recovery_version_line: str


class TokenStudy(BaseModel):
    scripture_ref: str = Field(description="經文位置")
    token_order: int
    surface_form: str
    normalized_form: str
    lemma: str
    strongs_primary: str
    strongs_secondary: str | None = None
    analytical_code_raw: str
    analytical_code_expanded: dict[str, str]
    part_of_speech: str
    morphology_features: dict[str, str]
    literal_gloss_en: str
    basic_gloss: str
    translation_note_zh: str
    grammar_explanation: str
    verse_usage: str
    recovery_alignment_note: str
    pronunciation_transliteration: str
    pronunciation_bopomofo: str
    occurrence_summary: str
    related_verses: list[str]
    source_layer: str
    ot_quote_marker: bool = False


class VerseResponse(BaseModel):
    ref: str
    mode: ResponseMode
    interlinear: LayeredLines
    cards: list[TokenStudy]
    compact_summary: str
    source_provider: str
    source_status: str
    fallback_used: bool
    attribution_source: str
    diagnostics: list[str]
    attribution: Attribution


class PassageResponse(BaseModel):
    ref: str
    mode: ResponseMode
    verse_count: int
    verses: list[VerseResponse]
    passage_summary: str
    token_summary: dict[str, int]


class AnalyticalCodeInfo(BaseModel):
    code: str
    expanded: dict[str, str]
    legend: dict[str, str]
    methodology_note: str


class LexiconResponse(BaseModel):
    strongs: str
    normalized_strongs: str
    lemma: str
    language: str
    transliteration: str
    pronunciation_bopomofo: str
    short_definition: str
    literal_gloss_en: str
    occurrence_summary: str
    common_inflections: list[str]
    analytical_notes: list[str]
    sample_refs: list[str]
    recovery_translation_alignment_note: str


class SearchResponse(BaseModel):
    query: str
    refs: list[str]
    matched_lemmas: list[str]
    matched_strongs: list[str]


class BookMapItem(BaseModel):
    osis: str
    english: str
    zh: str
    aliases: list[str]


class LegendResponse(BaseModel):
    analytical_code_legend: dict[str, str]
    abbreviation_legend: dict[str, str]
    book_mappings: list[BookMapItem]
    usage_notes: list[str]


class MorphologySearchResponse(BaseModel):
    query: str
    count: int
    cards: list[TokenStudy]


class InterlinearResponse(BaseModel):
    ref: str
    mode: Literal["interlinear"] = "interlinear"
    lines: LayeredLines
    tokens: list[TokenStudy]
    source_provider: str
    source_status: str
    fallback_used: bool
    attribution_source: str
    diagnostics: list[str]
    attribution: Attribution


class MinistryResourceItem(BaseModel):
    title: str
    kind: Literal["affirmation_negation", "hebrew_resource", "other"]
    language: str
    url: str
    note: str


class MinistryResourceResponse(BaseModel):
    query: str
    results: list[MinistryResourceItem]
