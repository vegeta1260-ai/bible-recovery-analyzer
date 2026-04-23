import asyncio

import httpx
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


def test_lsm_missing_key_fails_without_fallback():
    with pytest.raises(ValueError):
        build_settings(
            RECOVERY_PROVIDER="lsm_api",
            RECOVERY_API_TOKEN="",
            RECOVERY_ENABLE_WEB_FALLBACK_FROM_LSM="false",
            RECOVERY_API_AUTH_MODE="header",
        )


def test_simulated_rejection_switches_to_web_fallback_success(monkeypatch):
    settings = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        RECOVERY_API_TOKEN="dummy-token",
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
        RECOVERY_API_TOKEN="dummy-token",
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


def test_lsm_auth_modes_build_request():
    s_header = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        RECOVERY_API_TOKEN="abc",
        RECOVERY_API_AUTH_MODE="header",
        RECOVERY_API_AUTH_HEADER="X-Auth",
        RECOVERY_API_AUTH_HEADER_PREFIX="Token ",
    )
    provider = LsmApiRecoveryProvider(s_header)
    headers, params = provider._build_request("John 1:14")
    assert headers["X-Auth"] == "Token abc"
    assert params["String"] == "John 1:14"

    s_query = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        RECOVERY_API_TOKEN="abc",
        RECOVERY_API_AUTH_MODE="query",
        RECOVERY_API_AUTH_QUERY_PARAM="apikey",
    )
    provider = LsmApiRecoveryProvider(s_query)
    headers, params = provider._build_request("John 1:14")
    assert headers == {}
    assert params["apikey"] == "abc"


def test_lsm_response_parsing_compatibility():
    settings = build_settings(RECOVERY_PROVIDER="lsm_api", RECOVERY_API_TOKEN="dummy-token")
    provider = LsmApiRecoveryProvider(settings)
    payload = {
        "verses": [{"text": "In the beginning"}, {"verse": "was the Word"}],
        "message": "ok",
        "copyright": "copyright text",
        "detected": "John 1:1",
        "inputstring": "John 1:1",
    }
    text = provider._extract_text(payload)
    assert text == "In the beginning\nwas the Word"


def test_lsm_fetch_does_not_leak_token_on_http_error(monkeypatch):
    settings = build_settings(
        RECOVERY_PROVIDER="lsm_api",
        RECOVERY_API_TOKEN="secret-token",
        RECOVERY_API_AUTH_MODE="query",
        RECOVERY_RETRY_ATTEMPTS="1",
    )
    provider = LsmApiRecoveryProvider(settings)

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *_args, **_kwargs):
            request = httpx.Request("GET", "https://example.com")
            return httpx.Response(status_code=500, request=request, json={"message": "boom"})

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: DummyClient())

    with pytest.raises(RecoveryFetchError) as err:
        asyncio.run(provider.fetch("John 1:1"))
    assert "secret-token" not in str(err.value)
