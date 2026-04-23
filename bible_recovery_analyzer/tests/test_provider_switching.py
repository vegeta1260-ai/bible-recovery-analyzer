import asyncio
import os

import pytest

from app.core.config import Settings
from app.services.recovery.manager import RecoveryServiceManager
from app.services.recovery.providers import RecoveryFetchError


def build_settings(**overrides):
    base = {
        "RECOVERY_PROVIDER": "mock",
        "SQLITE_PATH": "./data/test_provider.db",
    }
    base.update(overrides)
    return Settings(**base)


def test_mock_provider_selected():
    settings = build_settings(RECOVERY_PROVIDER="mock")
    mgr = RecoveryServiceManager(settings)
    out = asyncio.run(mgr.get_verse_text("John.1.1"))
    assert out.source_provider == "mock"


def test_lsm_missing_key_fails_without_fallback():
    settings = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        RECOVERY_API_KEY="",
        RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM="false",
    )
    mgr = RecoveryServiceManager(settings)
    with pytest.raises(RecoveryFetchError) as err:
        asyncio.run(mgr.get_verse_text("John.1.1"))
    assert "missing RECOVERY_API_KEY" in str(err.value)


def test_simulated_rejection_switches_to_web_fallback_success(monkeypatch):
    settings = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        SIMULATE_LSM_REJECTION="true",
        RECOVERY_WEB_FETCH_ENABLED="true",
        RECOVERY_WEB_BASE_URL="https://example.org",
        RECOVERY_WEB_SELECTOR="example",
    )
    mgr = RecoveryServiceManager(settings)

    async def fake_fetch(_):
        from app.services.recovery.providers import RecoveryProviderResult

        return RecoveryProviderResult(
            text="[WEB_FALLBACK_TEST] John.1.1",
            source_provider="web_fallback",
            source_status="ok",
            fallback_used=True,
            attribution_source="web fallback test",
            diagnostics=["fake success"],
        )

    monkeypatch.setattr(mgr.web_provider, "fetch", fake_fetch)
    out = asyncio.run(mgr.get_verse_text("John.1.1"))
    assert out.source_provider == "web_fallback"
    assert out.fallback_used is True


def test_web_fallback_failure_has_diagnostics(monkeypatch):
    settings = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        SIMULATE_LSM_REJECTION="true",
        RECOVERY_WEB_FETCH_ENABLED="true",
        RECOVERY_WEB_BASE_URL="https://example.org",
    )
    mgr = RecoveryServiceManager(settings)

    async def fake_fail(_):
        raise RecoveryFetchError("web_fallback", "forced failure", retriable=False)

    monkeypatch.setattr(mgr.web_provider, "fetch", fake_fail)
    with pytest.raises(RecoveryFetchError) as err:
        asyncio.run(mgr.get_verse_text("John.1.1"))
    assert "primary+fallback failed" in str(err.value)


def test_provider_switch_three_modes():
    for provider in ["mock", "lsm_api", "web_fallback"]:
        if provider == "web_fallback":
            settings = build_settings(
                RECOVERY_PROVIDER=provider,
                RECOVERY_WEB_FETCH_ENABLED="true",
                RECOVERY_WEB_BASE_URL="https://example.org",
            )
        else:
            settings = build_settings(RECOVERY_PROVIDER=provider)
        assert settings.recovery_provider == provider
