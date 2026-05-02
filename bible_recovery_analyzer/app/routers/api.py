from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import get_analyzer_service, get_recovery_client, require_action_auth
from app.models.schemas import (
    InterlinearResponse,
    LegendResponse,
    MinistryResourceResponse,
    MorphologySearchResponse,
    PassageResponse,
    VerseResponse,
)
from app.services.ministry_resources import search_resources
from app.services.recovery.providers import RecoveryFetchError
from app.services.reference import normalize_ref, split_osis_range

router = APIRouter()

ResponseMode = Literal["standard", "detailed", "interlinear", "study_card", "compact"]


def _mk_attribution(copyright_notice: str) -> dict:
    return {
        "source": "LSM Text Only Holy Bible Recovery Version API",
        "copyright_notice": copyright_notice,
        "fetched_via_live_api": True,
    }


@router.get("/health", operation_id="get_health")
def health():
    return {"status": "ok", "service": "bible_recovery_analyzer"}


@router.get("/provider-status", operation_id="get_provider_status")
def provider_status(recovery=Depends(get_recovery_client)):
    return recovery.provider_status()


@router.get("/verse", response_model=VerseResponse, operation_id="get_verse")
async def verse(
    ref: str = Query(...),
    mode: ResponseMode = Query("standard"),
    _auth=Depends(require_action_auth),
    analyzer=Depends(get_analyzer_service),
    recovery=Depends(get_recovery_client),
):
    try:
        osis_ref = normalize_ref(ref)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if "-" in osis_ref:
        raise HTTPException(status_code=400, detail="/verse 僅支援單節，範圍請用 /passage")

    cards = analyzer.verse_cards(osis_ref)
    if not cards:
        raise HTTPException(status_code=404, detail=f"查無資料：{osis_ref}")

    try:
        recovery_result = await recovery.get_verse_text(osis_ref)
    except RecoveryFetchError as err:
        raise HTTPException(status_code=502, detail={
            "message": "recovery text provider failed",
            "source_provider": err.provider,
            "source_status": "error",
            "fallback_used": False,
            "diagnostics": [err.reason],
        }) from err

    interlinear = {
        "original_text_line": [c.surface_form for c in cards],
        "strongs_line": [c.strongs_primary if not c.strongs_secondary else f"{c.strongs_primary}|{c.strongs_secondary}" for c in cards],
        "analytical_code_line": [c.analytical_code_raw for c in cards],
        "gloss_line": [c.literal_gloss_en for c in cards],
        "recovery_version_line": recovery_result.text,
    }
    compact = " ".join([f"{c.surface_form}({c.strongs_primary})" for c in cards])

    if mode == "compact":
        cards = cards[:3]

    return {
        "ref": osis_ref,
        "mode": mode,
        "interlinear": interlinear,
        "cards": cards,
        "compact_summary": compact,
        "source_provider": recovery_result.source_provider,
        "source_status": recovery_result.source_status,
        "fallback_used": recovery_result.fallback_used,
        "attribution_source": recovery_result.attribution_source,
        "diagnostics": recovery_result.diagnostics,
        "attribution": _mk_attribution(recovery_result.attribution_source),
    }


@router.get("/passage", response_model=PassageResponse, operation_id="get_passage")
async def passage(
    ref: str = Query(...),
    mode: ResponseMode = Query("detailed"),
    _auth=Depends(require_action_auth),
    analyzer=Depends(get_analyzer_service),
    recovery=Depends(get_recovery_client),
):
    try:
        osis_ref = normalize_ref(ref)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    verse_refs = split_osis_range(osis_ref)
    results = []
    token_count = 0
    lemma_counter: dict[str, int] = {}

    for vr in verse_refs:
        cards = analyzer.verse_cards(vr)
        if not cards:
            continue
        token_count += len(cards)
        for c in cards:
            lemma_counter[c.lemma] = lemma_counter.get(c.lemma, 0) + 1
        try:
            recovery_result = await recovery.get_verse_text(vr)
        except RecoveryFetchError as err:
            raise HTTPException(status_code=502, detail={
                "message": "recovery provider failed during passage fetch",
                "ref": vr,
                "provider": err.provider,
                "diagnostics": [err.reason],
            }) from err
        results.append(
            {
                "ref": vr,
                "mode": mode,
                "interlinear": {
                    "original_text_line": [c.surface_form for c in cards],
                    "strongs_line": [c.strongs_primary for c in cards],
                    "analytical_code_line": [c.analytical_code_raw for c in cards],
                    "gloss_line": [c.literal_gloss_en for c in cards],
                    "recovery_version_line": recovery_result.text,
                },
                "cards": cards if mode != "compact" else cards[:2],
                "compact_summary": " ".join([c.surface_form for c in cards]),
                "source_provider": recovery_result.source_provider,
                "source_status": recovery_result.source_status,
                "fallback_used": recovery_result.fallback_used,
                "attribution_source": recovery_result.attribution_source,
                "diagnostics": recovery_result.diagnostics,
                "attribution": _mk_attribution(recovery_result.attribution_source),
            }
        )

    return {
        "ref": osis_ref,
        "mode": mode,
        "verse_count": len(results),
        "verses": results,
        "passage_summary": f"共 {len(results)} 節，{token_count} 個 token。",
        "token_summary": {"total_tokens": token_count, "distinct_lemmas": len(lemma_counter)},
    }


@router.get("/interlinear", response_model=InterlinearResponse, operation_id="get_interlinear")
async def interlinear(ref: str, _auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service), recovery=Depends(get_recovery_client)):
    osis_ref = normalize_ref(ref)
    if "-" in osis_ref:
        raise HTTPException(status_code=400, detail="/interlinear 僅支援單節")
    try:
        result = await recovery.get_verse_text(osis_ref)
    except RecoveryFetchError as err:
        raise HTTPException(status_code=502, detail={"provider": err.provider, "diagnostics": [err.reason]}) from err
    out = analyzer.get_interlinear(osis_ref, result.text, _mk_attribution(result.attribution_source))
    out.source_provider = result.source_provider
    out.source_status = result.source_status
    out.fallback_used = result.fallback_used
    out.attribution_source = result.attribution_source
    out.diagnostics = result.diagnostics
    return out


@router.get("/word", operation_id="get_word")
def word(q: str, _auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service)):
    return analyzer.lookup_word(q)


@router.get("/strongs/{sid}", operation_id="get_strongs")
def strongs(sid: str, _auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service)):
    out = analyzer.lookup_strongs(sid)
    if not out:
        raise HTTPException(status_code=404, detail="strongs not found")
    return out


@router.get("/lemma", operation_id="get_lemma")
def lemma(lemma: str, _auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service)):
    return analyzer.lookup_lemma(lemma)


@router.get("/search", operation_id="search_tokens")
def search(q: str, _auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service)):
    return analyzer.search(q)


@router.get("/legend", response_model=LegendResponse)
def legend(_auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service)):
    return analyzer.legend()


@router.get("/codes/{analytical_code}", operation_id="parse_analytical_code")
def parse_code(analytical_code: str, _auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service)):
    return analyzer.parse_code(analytical_code)


@router.get("/books", operation_id="get_books")
def books(_auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service)):
    return analyzer.legend().book_mappings


@router.get("/morphology/search", response_model=MorphologySearchResponse)
def morphology_search(q: str, _auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service)):
    return analyzer.morphology_search(q)


@router.get("/resources", response_model=MinistryResourceResponse)
def resources(q: str = "affirmation", _auth=Depends(require_action_auth), _analyzer=Depends(get_analyzer_service)):
    return {"query": q, "results": search_resources(q)}


@router.get("/study", operation_id="get_study_bundle", summary="Expert study bundle for GPT Actions", description="Preferred single-call endpoint for comprehensive study payload.")
async def study(ref: str = Query(...), include_diagnostics: bool = Query(True), max_verses: int = Query(50, ge=1, le=50), include_interlinear: bool = Query(True), include_lexicon: bool = Query(True), include_pronunciation: bool = Query(True), include_translation_notes: bool = Query(True), _auth=Depends(require_action_auth), analyzer=Depends(get_analyzer_service), recovery=Depends(get_recovery_client)):
    osis_ref = normalize_ref(ref)
    all_refs = split_osis_range(osis_ref)
    requested_count = len(all_refs)
    verse_refs = all_refs[:max_verses]
    truncated = requested_count > len(verse_refs)
    warnings, missing_fields, verses, interlinear = [], [], [], []
    lex_map = {}
    provider, lsm_status, attribution = "unknown", "unknown", ""
    for vr in verse_refs:
        cards = analyzer.verse_cards(vr)
        if not cards:
            missing_fields.append(f"missing token cards for {vr}")
            continue
        try:
            rr = await recovery.get_verse_text(vr)
        except RecoveryFetchError as err:
            warnings.append(f"recovery fetch failed at {vr}: {err.reason}")
            lsm_status = "error"
            continue
        provider, lsm_status, attribution = rr.source_provider, rr.source_status, rr.attribution_source
        verses.append({"ref": vr, "text": rr.text})
        for c in cards:
            if include_interlinear:
                interlinear.append({"surface_form": c.surface_form, "lemma": c.lemma, "strong_number_base": c.strongs_primary, "strong_number_extended": c.strongs_secondary or "", "analytical_code_raw": c.analytical_code_raw, "part_of_speech": c.part_of_speech, "case": c.morphology_features.get("case", ""), "gender": c.morphology_features.get("gender", ""), "number": c.morphology_features.get("number", ""), "person": c.morphology_features.get("person", ""), "tense": c.morphology_features.get("tense", ""), "voice": c.morphology_features.get("voice", ""), "mood": c.morphology_features.get("mood", ""), "is_crasis": False, "source_language": "unknown", "contextual_function": c.grammar_explanation, "english_gloss": c.literal_gloss_en, "chinese_literal_gloss": c.translation_note_zh if include_translation_notes else "", "pronunciation_zhuyin": c.pronunciation_bopomofo if include_pronunciation else "", "transliteration": c.pronunciation_transliteration if include_pronunciation else "", "special_notes": c.recovery_alignment_note})
            if include_lexicon and c.strongs_primary and c.strongs_primary not in lex_map:
                lex = analyzer.lookup_strongs(c.strongs_primary)
                if lex:
                    lex_map[c.strongs_primary] = {"strongs": lex.strongs, "lemma": lex.lemma, "gloss": lex.literal_gloss_en, "short_definition": lex.short_definition, "notes": "; ".join(lex.analytical_notes[:2])}
    if truncated:
        warnings.append("Request exceeded 50 verses; only the first 50 verses were processed.")
    action_payload_note = ""
    if len(str(interlinear)) + len(str(verses)) > 90000 and len(interlinear) > 400:
        interlinear = interlinear[:400]
        action_payload_note = "Interlinear rows truncated due to Action payload-size guardrail."
        warnings.append("Payload was compressed to reduce Action response size.")
    return {"reference": {"input": ref, "normalized": osis_ref, "requested_verse_count": requested_count, "processed_verse_count": len(verses), "truncated": truncated}, "recovery_text": {"verses": verses, "inputstring": ref, "detected": "verse_range", "message": "ok" if verses else "no verses resolved", "copyright": attribution, "attribution": attribution}, "original_text": {"language": "greek|hebrew|aramaic|unknown", "text": " ".join([x["surface_form"] for x in interlinear[:120]]), "source": "token database", "notes": "Aggregated from token layer."}, "interlinear": interlinear if include_interlinear else [], "lexicon_summary": list(lex_map.values()) if include_lexicon else [], "syntax_observations": {"subject": "", "main_verb": "", "objects": [], "prepositional_phrases": [], "participles": [], "article_structures": [], "special_grammar_notes": []}, "translation_support": {"literal_gloss_summary": " ; ".join(sorted({x["english_gloss"] for x in interlinear[:80] if x.get("english_gloss")})), "recovery_translation_notes": "Token-level translation notes included where available." if include_translation_notes else "disabled", "comparison_notes": []}, "diagnostics": {"provider": provider, "lsm_status": lsm_status, "warnings": warnings if include_diagnostics else [], "missing_fields": sorted(set(missing_fields)) if include_diagnostics else [], "upstream_message": "", "action_payload_note": action_payload_note}}
