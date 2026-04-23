import asyncio

import pytest

from app.core.config import Settings
from app.services.recovery.manager import RecoveryServiceManager
from app.services.recovery.providers import LsmApiRecoveryProvider, RecoveryFetchError


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


def test_lsm_missing_token_fails_without_fallback():
    settings = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        RECOVERY_API_KEY="",
        RECOVERY_API_TOKEN="",
        RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM="false",
    )
    mgr = RecoveryServiceManager(settings)
    with pytest.raises(RecoveryFetchError) as err:
        asyncio.run(mgr.get_verse_text("John.1.1"))
    assert "missing RECOVERY_API_TOKEN / RECOVERY_API_KEY" in str(err.value)


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
        elif provider == "lsm_api":
            settings = build_settings(RECOVERY_PROVIDER=provider, RECOVERY_API_TOKEN="dummy-token")
        else:
            settings = build_settings(RECOVERY_PROVIDER=provider)
        assert settings.recovery_provider == provider


def test_lsm_auth_mode_header_uses_custom_header():
    settings = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        RECOVERY_API_AUTH_MODE="header",
        RECOVERY_API_AUTH_HEADER_NAME="X-API-TOKEN",
        RECOVERY_API_TOKEN="abc123",
    )
    provider = LsmApiRecoveryProvider(settings)
    headers, params, hint = provider._build_auth()
    assert headers["X-API-TOKEN"] == "abc123"
    assert params == {}
    assert "X-API-TOKEN" in hint


def test_lsm_auth_mode_query_uses_query_param():
    settings = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        RECOVERY_API_AUTH_MODE="query",
        RECOVERY_API_AUTH_QUERY_PARAM="access_token",
        RECOVERY_API_TOKEN="abc123",
    )
    provider = LsmApiRecoveryProvider(settings)
    headers, params, hint = provider._build_auth()
    assert headers == {}
    assert params["access_token"] == "abc123"
    assert "access_token" in hint


def test_lsm_payload_parsing_supports_nested_data_key():
    settings = build_settings(RECOVERY_PROVIDER="lsm_api", RECOVERY_API_TOKEN="dummy-token")
    provider = LsmApiRecoveryProvider(settings)
    parsed = provider._parse_payload({"data": {"verseText": "In the beginning", "attribution": "LSM"}})
    assert parsed["text"] == "In the beginning"
    assert parsed["attribution"] == "LSM"


def test_lsm_payload_missing_text_raises_error():
    settings = build_settings(RECOVERY_PROVIDER="lsm_api", RECOVERY_API_TOKEN="dummy-token")
    provider = LsmApiRecoveryProvider(settings)
    with pytest.raises(RecoveryFetchError) as err:
        provider._parse_payload({"data": {"foo": "bar"}})
    assert "missing text field" in str(err.value)
