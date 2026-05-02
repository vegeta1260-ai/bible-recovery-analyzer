from __future__ import annotations

import logging
from base64 import b64encode
from dataclasses import dataclass
from typing import Protocol

import httpx

from app.core.config import Settings
from app.data.book_map import OSIS_TO_EN

logger = logging.getLogger(__name__)


class RecoveryFetchError(Exception):
    def __init__(self, provider: str, reason: str, *, retriable: bool = True):
        super().__init__(f"{provider}: {reason}")
        self.provider = provider
        self.reason = reason
        self.retriable = retriable


@dataclass
class RecoveryProviderResult:
    text: str
    source_provider: str
    source_status: str
    fallback_used: bool
    attribution_source: str
    diagnostics: list[str]
    verses: list[dict[str, str]] | None = None
    inputstring: str = ""
    detected: str = ""
    message: str = ""
    copyright: str = ""
    search_type: str = ""


class RecoveryTextProvider(Protocol):
    name: str

    async def fetch(self, osis_ref: str, request_ref: str | None = None) -> RecoveryProviderResult:
        ...


class MockRecoveryProvider:
    name = "mock"

    def __init__(self, settings: Settings):
        self.settings = settings

    async def fetch(self, osis_ref: str, request_ref: str | None = None) -> RecoveryProviderResult:
        return RecoveryProviderResult(
            text=f"[MOCK] {osis_ref} 恢復本經文示意（正式環境請改為官方 API 即時回傳）",
            source_provider=self.name,
            source_status="ok",
            fallback_used=False,
            attribution_source=self.settings.default_recovery_attribution,
            diagnostics=["mock provider active"],
        )


class LsmApiRecoveryProvider:
    name = "lsm_api"

    def __init__(self, settings: Settings):
        self.settings = settings

    async def fetch(self, osis_ref: str, request_ref: str | None = None) -> RecoveryProviderResult:
        if self.settings.simulate_lsm_rejection:
            raise RecoveryFetchError(self.name, "simulated rejection enabled", retriable=True)

        headers, params, redacted_auth_hint = self._build_auth()
        params.update(self._build_request_params(osis_ref, request_ref))
        timeout = self.settings.recovery_api_timeout_seconds

        for attempt in range(1, self.settings.recovery_retry_attempts + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.get(self.settings.recovery_api_base_url, headers=headers, params=params)
                payload = self._load_json_response(resp, redacted_auth_hint)
                if resp.status_code in (401, 403) or self._looks_unauthorized(resp, payload):
                    raise RecoveryFetchError(
                        self.name,
                        self._response_diagnostics("auth denied by upstream", resp, redacted_auth_hint, payload),
                        retriable=True,
                    )
                if resp.status_code == 404:
                    raise RecoveryFetchError(
                        self.name,
                        self._response_diagnostics("verse not found from LSM API", resp, redacted_auth_hint, payload),
                        retriable=False,
                    )
                if resp.is_error:
                    raise RecoveryFetchError(
                        self.name,
                        self._response_diagnostics(f"HTTP {resp.status_code} from LSM API", resp, redacted_auth_hint, payload),
                        retriable=True,
                    )
                try:
                    parsed = self._parse_payload(payload)
                except RecoveryFetchError as exc:
                    raise RecoveryFetchError(
                        self.name,
                        self._response_diagnostics(exc.reason, resp, redacted_auth_hint, payload),
                        retriable=exc.retriable,
                    ) from exc
                return RecoveryProviderResult(
                    text=parsed["text"],
                    source_provider=self.name,
                    source_status="ok",
                    fallback_used=False,
                    attribution_source=parsed["attribution"],
                    diagnostics=[
                        f"lsm attempt {attempt} success",
                        f"auth mode={self.settings.recovery_api_auth_mode}",
                        redacted_auth_hint,
                        f"http_status={resp.status_code}",
                        f"content_type={resp.headers.get('content-type', '')}",
                        f"inputstring={parsed['inputstring']}",
                        f"detected={parsed['detected']}",
                        f"message={parsed['message']}",
                    ],
                    verses=parsed["verses"],
                    inputstring=parsed["inputstring"],
                    detected=parsed["detected"],
                    message=parsed["message"],
                    copyright=parsed["attribution"],
                    search_type=parsed["search_type"],
                )
            except RecoveryFetchError:
                raise
            except httpx.TimeoutException as exc:
                logger.warning("LSM provider timeout on attempt %s", attempt)
                if attempt >= self.settings.recovery_retry_attempts:
                    raise RecoveryFetchError(self.name, f"timeout after {attempt} attempts", retriable=True) from exc
            except httpx.HTTPError as exc:
                logger.warning("LSM provider HTTP error on attempt %s: %s", attempt, exc)
                if attempt >= self.settings.recovery_retry_attempts:
                    raise RecoveryFetchError(self.name, str(exc), retriable=True) from exc

        raise RecoveryFetchError(self.name, "unknown lsm provider failure", retriable=True)

    def _build_auth(self) -> tuple[dict[str, str], dict[str, str], str]:
        mode = self.settings.recovery_api_auth_mode
        token = self.settings.recovery_api_token or self.settings.recovery_api_key

        headers: dict[str, str] = {}
        params: dict[str, str] = {}

        if mode == "none":
            return headers, params, "auth=none"

        if not token:
            raise RecoveryFetchError(self.name, "missing RECOVERY_API_TOKEN / RECOVERY_API_KEY", retriable=True)

        if mode == "bearer":
            header_name = self.settings.recovery_api_auth_header_name.strip()
            headers[header_name] = f"Bearer {token}"
            return headers, params, f"auth=bearer ({header_name}, token present)"

        if mode == "header":
            header_name = self.settings.recovery_api_auth_header_name.strip()
            headers[header_name] = token
            return headers, params, f"auth=header ({header_name})"

        if mode == "query":
            query_param = self.settings.recovery_api_auth_query_param.strip()
            params[query_param] = token
            return headers, params, f"auth=query ({query_param})"

        if mode == "basic":
            app_id = self.settings.recovery_api_app_id.strip()
            if not app_id:
                raise RecoveryFetchError(self.name, "missing RECOVERY_API_APP_ID", retriable=True)
            credential = f"{app_id}:{token}".encode("utf-8")
            headers["Authorization"] = f"Basic {b64encode(credential).decode('ascii')}"
            return headers, params, "auth=basic (appid/token present)"

        raise RecoveryFetchError(self.name, f"unsupported auth mode: {mode}", retriable=False)

    def _build_request_params(self, osis_ref: str, request_ref: str | None = None) -> dict[str, str]:
        params: dict[str, str] = {}
        ref_param = self.settings.recovery_api_ref_param.strip() or "String"
        output_param = self.settings.recovery_api_output_param.strip() or "Out"
        output = self.settings.recovery_api_output.strip()
        input_mode = self.settings.recovery_api_input_mode.strip().lower()

        if input_mode == "osis":
            params[ref_param] = osis_ref
            params[self.settings.recovery_api_input_param.strip() or "In"] = "osis"
        else:
            params[ref_param] = self._to_lsm_default_ref(osis_ref, request_ref)

        if output:
            params[output_param] = output
        return params

    def _to_lsm_default_ref(self, osis_ref: str, request_ref: str | None = None) -> str:
        if request_ref and request_ref.strip() and " " in request_ref.strip():
            return " ".join(request_ref.strip().split())

        parts = osis_ref.split(".")
        if len(parts) < 3:
            return osis_ref
        book, chapter, verse = parts[0], parts[1], ".".join(parts[2:])
        book_name = OSIS_TO_EN.get(book, book)
        return f"{book_name} {chapter}:{verse}"

    def _load_json_response(self, resp: httpx.Response, redacted_auth_hint: str) -> dict:
        try:
            payload = resp.json()
        except ValueError as exc:
            raise RecoveryFetchError(
                self.name,
                self._response_diagnostics(f"invalid JSON payload: {exc}", resp, redacted_auth_hint),
                retriable=False,
            ) from exc
        if not isinstance(payload, dict):
            raise RecoveryFetchError(
                self.name,
                self._response_diagnostics("unexpected JSON payload type", resp, redacted_auth_hint),
                retriable=False,
            )
        return payload

    def _parse_payload(self, payload: dict) -> dict:
        verses: list[dict[str, str]] = []
        raw_verses = payload.get("verses")
        if isinstance(raw_verses, list):
            for item in raw_verses:
                if not isinstance(item, dict):
                    continue
                text = self._string_value(item.get("text"))
                if not text:
                    continue
                verse: dict[str, str] = {
                    "ref": self._string_value(item.get("ref")),
                    "text": text,
                }
                urlpfx = self._string_value(item.get("urlpfx"))
                if urlpfx:
                    verse["urlpfx"] = urlpfx
                verses.append(verse)

        text_candidates = [
            payload.get("text"),
            payload.get("verseText"),
            payload.get("recovery_text"),
            "\n".join(verse["text"] for verse in verses),
        ]
        data = payload.get("data")
        if isinstance(data, dict):
            text_candidates.extend([data.get("text"), data.get("verseText")])

        text = next((value.strip() for value in text_candidates if isinstance(value, str) and value.strip()), "")
        if not text:
            raise RecoveryFetchError(self.name, "missing text field in LSM API payload", retriable=False)

        attribution_candidates = [
            payload.get("copyright"),
            payload.get("attribution"),
        ]
        if isinstance(data, dict):
            attribution_candidates.append(data.get("attribution"))

        attribution = next(
            (value.strip() for value in attribution_candidates if isinstance(value, str) and value.strip()),
            self.settings.default_recovery_attribution,
        )

        return {
            "text": text,
            "attribution": attribution,
            "verses": verses,
            "inputstring": self._string_value(payload.get("inputstring")),
            "detected": self._string_value(payload.get("detected")),
            "message": self._string_value(payload.get("message")),
            "search_type": self._string_value(payload.get("searchType")),
        }

    def _response_diagnostics(
        self,
        reason: str,
        resp: httpx.Response,
        redacted_auth_hint: str,
        payload: dict | None = None,
    ) -> str:
        message = self._extract_message(payload) if payload else ""
        preview = self._safe_preview(resp.text)
        return (
            f"{reason}; "
            f"http_status={resp.status_code}; "
            f"content_type={resp.headers.get('content-type', '')}; "
            f"auth_mode={self.settings.recovery_api_auth_mode}; "
            f"header_name={self.settings.recovery_api_auth_header_name.strip() or 'Authorization'}; "
            f"{redacted_auth_hint}; "
            f"upstream_message={self._safe_text(message)}; "
            f"unauthorized_like={self._looks_unauthorized(resp, payload)}; "
            f"response_preview={preview}"
        )

    def _looks_unauthorized(self, resp: httpx.Response, payload: dict | None = None) -> bool:
        if resp.status_code in (401, 403):
            return True
        haystack = " ".join(
            [
                self._extract_message(payload) if payload else "",
                resp.text[:500],
            ]
        ).lower()
        return any(
            marker in haystack
            for marker in [
                "not authorized",
                "unauthorized",
                "authorization token",
                "auth denied",
                "access denied",
            ]
        )

    def _extract_message(self, payload: dict | None) -> str:
        if not isinstance(payload, dict):
            return ""
        return self._string_value(payload.get("message"))

    def _safe_preview(self, text: str) -> str:
        preview = " ".join(self._safe_text(text).split())
        return preview[:200]

    def _safe_text(self, text: str) -> str:
        safe = str(text)
        for secret in self._secret_values():
            safe = safe.replace(secret, "[REDACTED]")
        return safe

    def _secret_values(self) -> list[str]:
        values = [
            self.settings.recovery_api_token,
            self.settings.recovery_api_key,
            self.settings.action_api_key,
        ]
        app_id = self.settings.recovery_api_app_id
        token = self.settings.recovery_api_token or self.settings.recovery_api_key
        if app_id and token:
            values.append(b64encode(f"{app_id}:{token}".encode("utf-8")).decode("ascii"))
        return [value for value in values if value]

    def _string_value(self, value: object) -> str:
        return value.strip() if isinstance(value, str) else ""


class WebFallbackRecoveryProvider:
    name = "web_fallback"

    def __init__(self, settings: Settings):
        self.settings = settings

    async def fetch(self, osis_ref: str, request_ref: str | None = None) -> RecoveryProviderResult:
        if not self.settings.recovery_web_fetch_enabled:
            raise RecoveryFetchError(self.name, "RECOVERY_WEB_FETCH_ENABLED is false", retriable=False)
        if not self.settings.recovery_web_base_url:
            raise RecoveryFetchError(self.name, "missing RECOVERY_WEB_BASE_URL", retriable=False)

        route = self.settings.recovery_web_route_template.format(ref=osis_ref)
        target_url = f"{self.settings.recovery_web_base_url.rstrip('/')}/{route.lstrip('/')}"
        headers = {"User-Agent": self.settings.recovery_web_user_agent}
        timeout = self.settings.recovery_web_timeout_seconds

        try:
            async with httpx.AsyncClient(timeout=timeout, headers=headers, follow_redirects=True) as client:
                resp = await client.get(target_url)
            if resp.status_code in (401, 403):
                raise RecoveryFetchError(self.name, f"access denied ({resp.status_code})", retriable=False)
            resp.raise_for_status()
        except httpx.TimeoutException as exc:
            raise RecoveryFetchError(self.name, "web fallback timeout", retriable=False) from exc
        except httpx.HTTPError as exc:
            raise RecoveryFetchError(self.name, f"web fallback HTTP failure: {exc}", retriable=False) from exc

        text = self._extract_text(resp.text)
        if not text:
            raise RecoveryFetchError(self.name, "selector/parser yielded empty content", retriable=False)

        return RecoveryProviderResult(
            text=text,
            source_provider=self.name,
            source_status="ok",
            fallback_used=True,
            attribution_source=(
                "Web fallback source (testing only). 此來源僅供備援測試；結果準確性與穩定性不保證；"
                "不可視為正式授權整合。"
            ),
            diagnostics=[
                f"fetched from {target_url}",
                f"selector={self.settings.recovery_web_selector}",
                "web fallback is test-only and best-effort",
            ],
        )

    def _extract_text(self, html: str) -> str:
        # Minimal adapter placeholder. No scraping bypass and no bulk crawling.
        selector = self.settings.recovery_web_selector.strip()
        marker_start = self.settings.recovery_web_extract_marker_start
        marker_end = self.settings.recovery_web_extract_marker_end

        if marker_start and marker_end and marker_start in html and marker_end in html:
            chunk = html.split(marker_start, 1)[1].split(marker_end, 1)[0].strip()
            return chunk[: self.settings.recovery_web_max_chars]

        if selector and selector in html:
            idx = html.index(selector)
            return html[idx : idx + self.settings.recovery_web_max_chars]

        return ""
