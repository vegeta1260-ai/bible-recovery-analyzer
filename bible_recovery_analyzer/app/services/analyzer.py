from __future__ import annotations

from collections import Counter

from sqlalchemy import or_, select

from app.data.book_map import BOOK_ROWS
from app.models.db import LexiconEntry, OriginalToken, OriginalVerse, Token
from app.models.schemas import (
    AnalyticalCodeInfo,
    BookMapItem,
    InterlinearResponse,
    LayeredLines,
    LegendResponse,
    LexiconResponse,
    MorphologySearchResponse,
    SearchResponse,
    TokenStudy,
)
from app.services.analytical_codes import ABBREVIATION_LEGEND, ANALYTICAL_CODE_LEGEND, GRAMMAR_NOTES, parse_analytical_code
from app.services.strongs import normalize_strongs


class AnalyzerService:
    def __init__(self, session_factory):
        self.session_factory = session_factory

    def verse_cards(self, osis_ref: str) -> list[TokenStudy]:
        with self.session_factory() as db:
            rows = db.execute(select(Token).where(Token.verse_ref == osis_ref).order_by(Token.token_order)).scalars().all()
        cards = [self._row_to_card(r) for r in rows]
        self._inject_occurrence_summary(cards)
        return cards

    def get_interlinear(self, osis_ref: str, recovery_text: str, attribution: dict) -> InterlinearResponse:
        cards = self.verse_cards(osis_ref)
        lines = LayeredLines(
            original_text_line=[c.surface_form for c in cards],
            strongs_line=[c.strongs_primary if not c.strongs_secondary else f"{c.strongs_primary}|{c.strongs_secondary}" for c in cards],
            analytical_code_line=[c.analytical_code_raw for c in cards],
            gloss_line=[c.literal_gloss_en for c in cards],
            recovery_version_line=recovery_text,
        )
        return InterlinearResponse(ref=osis_ref, lines=lines, tokens=cards, source_provider="unknown", source_status="unknown", fallback_used=False, attribution_source="", diagnostics=[], attribution=attribution)

    def lookup_word(self, q: str) -> list[TokenStudy]:
        with self.session_factory() as db:
            rows = db.execute(
                select(Token)
                .where(
                    or_(
                        Token.surface_form == q,
                        Token.normalized_form == q,
                        Token.lemma == q,
                        Token.pronunciation_transliteration == q,
                    )
                )
                .order_by(Token.verse_ref, Token.token_order)
                .limit(80)
            ).scalars().all()
        cards = [self._row_to_card(r) for r in rows]
        self._inject_occurrence_summary(cards)
        return cards

    def lookup_strongs(self, strongs: str) -> LexiconResponse | None:
        sid = normalize_strongs(strongs)
        with self.session_factory() as db:
            lex = db.execute(
                select(LexiconEntry).where(LexiconEntry.normalized_strongs == sid)
            ).scalar_one_or_none()
            if not lex:
                return None
            refs = db.execute(
                select(Token.verse_ref)
                .where(
                    or_(Token.strongs_primary == sid, Token.strongs_secondary == sid)
                )
                .distinct()
                .limit(20)
            ).scalars().all()
            count = len(
                db.execute(
                    select(Token.id).where(
                        or_(Token.strongs_primary == sid, Token.strongs_secondary == sid)
                    )
                ).scalars().all()
            )
        return LexiconResponse(
            strongs=lex.strongs,
            normalized_strongs=lex.normalized_strongs,
            lemma=lex.lemma,
            language=lex.language,
            transliteration=lex.transliteration,
            pronunciation_bopomofo=lex.pronunciation_bopomofo,
            short_definition=lex.short_definition,
            literal_gloss_en=lex.literal_gloss_en,
            occurrence_summary=f"{sid} 於樣本資料出現 {count} 次",
            common_inflections=lex.common_inflections,
            analytical_notes=lex.analytical_notes,
            sample_refs=refs,
            recovery_translation_alignment_note="恢復本翻譯對應在正式 API 核准後可回填節級對照與註解。",
        )

    def lookup_lemma(self, lemma: str) -> list[TokenStudy]:
        with self.session_factory() as db:
            rows = db.execute(
                select(Token).where(Token.lemma == lemma).order_by(Token.verse_ref, Token.token_order).limit(80)
            ).scalars().all()
        cards = [self._row_to_card(r) for r in rows]
        self._inject_occurrence_summary(cards)
        return cards

    def search(self, q: str) -> SearchResponse:
        with self.session_factory() as db:
            rows = db.execute(
                select(Token).where(
                    or_(
                        Token.verse_ref.contains(q),
                        Token.surface_form.contains(q),
                        Token.lemma.contains(q),
                        Token.strongs_primary.contains(q.upper()),
                        Token.analytical_code_raw.contains(q.upper()),
                    )
                )
            ).scalars().all()
        return SearchResponse(
            query=q,
            refs=sorted({r.verse_ref for r in rows})[:100],
            matched_lemmas=sorted({r.lemma for r in rows})[:100],
            matched_strongs=sorted({r.strongs_primary for r in rows})[:100],
        )

    def parse_code(self, code: str) -> AnalyticalCodeInfo:
        return parse_analytical_code(code)

    def legend(self) -> LegendResponse:
        books = [BookMapItem(osis=osis, english=en, zh=zh, aliases=aliases) for osis, en, zh, aliases in BOOK_ROWS]
        return LegendResponse(
            analytical_code_legend=ANALYTICAL_CODE_LEGEND,
            abbreviation_legend=ABBREVIATION_LEGEND,
            book_mappings=books,
            usage_notes=list(GRAMMAR_NOTES.values()),
        )

    def morphology_search(self, q: str) -> MorphologySearchResponse:
        with self.session_factory() as db:
            rows = db.execute(
                select(Token)
                .where(
                    or_(
                        Token.analytical_code_raw.contains(q.upper()),
                        Token.part_of_speech.contains(q.lower()),
                    )
                )
                .limit(80)
            ).scalars().all()
        cards = [self._row_to_card(r) for r in rows]
        self._inject_occurrence_summary(cards)
        return MorphologySearchResponse(query=q, count=len(cards), cards=cards)


    def original_tokens(self, verse_refs: list[str]) -> list[OriginalToken]:
        with self.session_factory() as db:
            return db.execute(select(OriginalToken).where(OriginalToken.verse_ref.in_(verse_refs)).order_by(OriginalToken.verse_ref, OriginalToken.token_index)).scalars().all()

    def original_verses(self, verse_refs: list[str]) -> list[OriginalVerse]:
        with self.session_factory() as db:
            return db.execute(select(OriginalVerse).where(OriginalVerse.verse_ref.in_(verse_refs)).order_by(OriginalVerse.verse_ref)).scalars().all()
    @staticmethod
    def _row_to_card(row: Token) -> TokenStudy:
        return TokenStudy(
            scripture_ref=row.verse_ref,
            token_order=row.token_order,
            surface_form=row.surface_form,
            normalized_form=row.normalized_form,
            lemma=row.lemma,
            strongs_primary=row.strongs_primary,
            strongs_secondary=row.strongs_secondary,
            analytical_code_raw=row.analytical_code_raw,
            analytical_code_expanded=row.analytical_code_expanded,
            part_of_speech=row.part_of_speech,
            morphology_features=row.morphology_features,
            literal_gloss_en=row.literal_gloss_en,
            basic_gloss=row.literal_gloss_en,
            translation_note_zh=row.translation_note_zh,
            grammar_explanation=row.grammar_explanation,
            verse_usage=row.verse_usage,
            recovery_alignment_note=row.recovery_alignment_note,
            pronunciation_transliteration=row.pronunciation_transliteration,
            pronunciation_bopomofo=row.pronunciation_bopomofo,
            occurrence_summary="",
            related_verses=row.related_refs or [],
            source_layer=row.source_layer,
            ot_quote_marker=row.is_ot_quote,
        )

    def _inject_occurrence_summary(self, cards: list[TokenStudy]) -> None:
        if not cards:
            return
        with self.session_factory() as db:
            for card in cards:
                count = len(db.execute(select(Token.id).where(Token.lemma == card.lemma)).scalars().all())
                refs = db.execute(select(Token.verse_ref).where(Token.lemma == card.lemma).distinct().limit(10)).scalars().all()
                features = Counter(
                    db.execute(
                        select(Token.analytical_code_raw).where(Token.lemma == card.lemma).limit(40)
                    ).scalars().all()
                )
                top_feature = features.most_common(1)[0][0] if features else "N/A"
                card.occurrence_summary = (
                    f"lemma {card.lemma} 於樣本資料出現 {count} 次；常見碼 {top_feature}；例：{', '.join(refs)}"
                )
