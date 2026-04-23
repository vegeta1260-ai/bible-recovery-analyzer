from __future__ import annotations

import logging

from app.core.config import Settings
from app.services.recovery.providers import (
    LsmApiRecoveryProvider,
    MockRecoveryProvider,
    RecoveryFetchError,
    RecoveryProviderResult,
    WebFallbackRecoveryProvider,
)

logger = logging.getLogger(__name__)


class RecoveryServiceManager:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.mock_provider = MockRecoveryProvider(settings)
        self.lsm_provider = LsmApiRecoveryProvider(settings)
        self.web_provider = WebFallbackRecoveryProvider(settings)

    async def get_verse_text(self, osis_ref: str) -> RecoveryProviderResult:
        provider = self.settings.recovery_provider

        if provider == "mock":
            return await self.mock_provider.fetch(osis_ref)

        diagnostics: list[str] = []

        if provider == "lsm_api":
            try:
                result = await self.lsm_provider.fetch(osis_ref)
                result.diagnostics.extend(diagnostics)
                return result
            except RecoveryFetchError as err:
                diagnostics.append(f"lsm_api failed: {err.reason}")
                logger.warning("LSM provider failed: %s", err.reason)
                if self.settings.recovery_enable_web_fallback_from_lsm:
                    try:
                        fallback = await self.web_provider.fetch(osis_ref)
                        fallback.fallback_used = True
                        fallback.diagnostics = diagnostics + fallback.diagnostics
                        return fallback
                    except RecoveryFetchError as web_err:
                        diagnostics.append(f"web_fallback failed: {web_err.reason}")
                        raise RecoveryFetchError(
                            "recovery_manager",
                            f"primary+fallback failed: {' | '.join(diagnostics)}",
                            retriable=False,
                        ) from web_err
                raise RecoveryFetchError(
                    "recovery_manager",
                    f"lsm_api failed and fallback disabled: {' | '.join(diagnostics)}",
                    retriable=False,
                ) from err

        if provider == "web_fallback":
            return await self.web_provider.fetch(osis_ref)

        raise RecoveryFetchError("recovery_manager", f"unsupported RECOVERY_PROVIDER={provider}", retriable=False)

    def provider_status(self) -> dict:
        return {
            "configured_provider": self.settings.recovery_provider,
            "simulate_lsm_rejection": self.settings.simulate_lsm_rejection,
            "lsm_api": {
                "base_url_configured": bool(self.settings.recovery_api_base_url),
                "auth_mode": self.settings.recovery_api_auth_mode,
                "token_configured": bool(self.settings.recovery_api_token),
                "output": self.settings.recovery_api_output,
            },
            "web_fallback_enabled": self.settings.recovery_web_fetch_enabled,
            "web_fallback_base_url_configured": bool(self.settings.recovery_web_base_url),
            "warnings": [
                "web fallback 僅供備援測試",
                "web fallback 結果準確性與穩定性不保證",
                "web fallback 不可視為正式授權整合",
            ],
        }
