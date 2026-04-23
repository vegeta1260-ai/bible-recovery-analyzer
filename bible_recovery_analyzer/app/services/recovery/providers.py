from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol

import httpx

from app.core.config import Settings

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


class RecoveryTextProvider(Protocol):
    name: str

    async def fetch(self, osis_ref: str) -> RecoveryProviderResult:
        ...


class MockRecoveryProvider:
    name = "mock"

    def __init__(self, settings: Settings):
        self.settings = settings

    async def fetch(self, osis_ref: str) -> RecoveryProviderResult:
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

    async def fetch(self, osis_ref: str) -> RecoveryProviderResult:
        if self.settings.simulate_lsm_rejection:
            raise RecoveryFetchError(self.name, "simulated rejection enabled", retriable=True)

        if not self.settings.recovery_api_key:
            raise RecoveryFetchError(self.name, "missing RECOVERY_API_KEY", retriable=True)

        headers = {"Authorization": f"Bearer {self.settings.recovery_api_key}"}
        params = {"ref": osis_ref, "format": "text-only"}
        timeout = self.settings.recovery_api_timeout_seconds

        for attempt in range(1, self.settings.recovery_retry_attempts + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.get(self.settings.recovery_api_base_url, headers=headers, params=params)
                if resp.status_code in (401, 403):
                    raise RecoveryFetchError(self.name, f"auth denied ({resp.status_code})", retriable=True)
                if resp.status_code == 404:
                    raise RecoveryFetchError(self.name, "verse not found from LSM API", retriable=False)
                resp.raise_for_status()
                payload = resp.json()
                return RecoveryProviderResult(
                    text=payload.get("text", ""),
                    source_provider=self.name,
                    source_status="ok",
                    fallback_used=False,
                    attribution_source=payload.get("attribution", self.settings.default_recovery_attribution),
                    diagnostics=[f"lsm attempt {attempt} success"],
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


class WebFallbackRecoveryProvider:
    name = "web_fallback"

    def __init__(self, settings: Settings):
        self.settings = settings

    async def fetch(self, osis_ref: str) -> RecoveryProviderResult:
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
