from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import get_analyzer_service, get_recovery_client
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


@router.get("/health")
def health():
    return {"status": "ok", "service": "bible_recovery_analyzer"}


@router.get("/provider-status")
def provider_status(recovery=Depends(get_recovery_client)):
    return recovery.provider_status()


@router.get("/verse", response_model=VerseResponse)
async def verse(
    ref: str = Query(...),
    mode: ResponseMode = Query("standard"),
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


@router.get("/passage", response_model=PassageResponse)
async def passage(
    ref: str = Query(...),
    mode: ResponseMode = Query("detailed"),
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


@router.get("/interlinear", response_model=InterlinearResponse)
async def interlinear(ref: str, analyzer=Depends(get_analyzer_service), recovery=Depends(get_recovery_client)):
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


@router.get("/word")
def word(q: str, analyzer=Depends(get_analyzer_service)):
    return analyzer.lookup_word(q)


@router.get("/strongs/{sid}")
def strongs(sid: str, analyzer=Depends(get_analyzer_service)):
    out = analyzer.lookup_strongs(sid)
    if not out:
        raise HTTPException(status_code=404, detail="strongs not found")
    return out


@router.get("/lemma")
def lemma(lemma: str, analyzer=Depends(get_analyzer_service)):
    return analyzer.lookup_lemma(lemma)


@router.get("/search")
def search(q: str, analyzer=Depends(get_analyzer_service)):
    return analyzer.search(q)


@router.get("/legend", response_model=LegendResponse)
def legend(analyzer=Depends(get_analyzer_service)):
    return analyzer.legend()


@router.get("/codes/{analytical_code}")
def parse_code(analytical_code: str, analyzer=Depends(get_analyzer_service)):
    return analyzer.parse_code(analytical_code)


@router.get("/books")
def books(analyzer=Depends(get_analyzer_service)):
    return analyzer.legend().book_mappings


@router.get("/morphology/search", response_model=MorphologySearchResponse)
def morphology_search(q: str, analyzer=Depends(get_analyzer_service)):
    return analyzer.morphology_search(q)


@router.get("/resources", response_model=MinistryResourceResponse)
def resources(q: str = "affirmation", _analyzer=Depends(get_analyzer_service)):
    return {"query": q, "results": search_resources(q)}


@router.get("/study")
async def study(ref: str = Query(...), include_diagnostics: bool = True, max_verses: int = Query(50, ge=1, le=50), include_interlinear: bool = True, include_lexicon: bool = True, include_pronunciation: bool = True, include_translation_notes: bool = True, analyzer=Depends(get_analyzer_service), recovery=Depends(get_recovery_client)):
    osis_ref = normalize_ref(ref)
    refs = split_osis_range(osis_ref)
    requested = len(refs)
    refs = refs[:max_verses]
    truncated = requested > len(refs)
    verses=[]; warnings=[]
    for vr in refs:
        try:
            rr=await recovery.get_verse_text(vr)
            verses.append({"ref":vr,"text":rr.text})
            attribution=rr.attribution_source; provider=rr.source_provider; lsm=rr.source_status
        except RecoveryFetchError as err:
            warnings.append(err.reason)
    orig_tokens = analyzer.original_tokens(refs)
    orig_verses = {v.verse_ref:v for v in analyzer.original_verses(refs)}
    lang = orig_tokens[0].language if orig_tokens else 'unknown'
    src = orig_tokens[0].source if orig_tokens else ''
    interlinear=[]; lex_map={}
    for tkn in orig_tokens:
        if include_interlinear:
            interlinear.append({"surface_form":tkn.surface_form,"lemma":tkn.lemma,"strong_number_base":tkn.strong_number_base,"strong_number_extended":tkn.strong_number_extended,"analytical_code_raw":tkn.morph_code,"part_of_speech":tkn.part_of_speech,"case":tkn.case,"gender":tkn.gender,"number":tkn.number,"person":tkn.person,"tense":tkn.tense,"voice":tkn.voice,"mood":tkn.mood,"stem":tkn.stem,"state":tkn.state,"english_gloss":tkn.gloss_en,"chinese_literal_gloss":tkn.gloss_zh,"pronunciation_zhuyin":"" if not include_pronunciation else None,"transliteration":"" if not include_pronunciation else None,"special_notes":""})
        if include_lexicon and tkn.strong_number_base and tkn.strong_number_base not in lex_map:
            lex_map[tkn.strong_number_base] = {"strongs":tkn.strong_number_base,"lemma":tkn.lemma or '',"gloss":tkn.gloss_en or '',"short_definition":"","notes":""}
    original_text = ' '.join([orig_verses[r].original_text for r in refs if r in orig_verses]).strip()
    if not orig_tokens:
        warnings.append('original language data not imported')
    if truncated:
        warnings.append('Request exceeded 50 verses; only the first 50 verses were processed.')
    return {"reference":{"input":ref,"normalized":osis_ref,"requested_verse_count":requested,"processed_verse_count":len(refs),"truncated":truncated},"recovery_text":{"verses":verses,"inputstring":ref,"detected":"ref","message":"ok","copyright":attribution if verses else '',"attribution":attribution if verses else ''},"original_text":{"language":lang,"text":original_text,"source":src,"notes":"syntax tree not imported in phase 1"},"interlinear":interlinear,"lexicon_summary":list(lex_map.values()),"syntax_observations":{"subject":"","main_verb":"","objects":[],"prepositional_phrases":[],"participles":[],"article_structures":[],"special_grammar_notes":[]},"translation_support":{"literal_gloss_summary":"","recovery_translation_notes":"","comparison_notes":[]},"diagnostics":{"provider":provider if verses else 'unknown',"lsm_status":lsm if verses else 'unknown',"original_language_status":'ok' if orig_tokens else 'missing',"warnings":warnings if include_diagnostics else [],"missing_fields":[],"upstream_message":"","action_payload_note":""},"attribution":{"recovery_source":"LSM API","original_language_source":src or 'not_imported'}}
