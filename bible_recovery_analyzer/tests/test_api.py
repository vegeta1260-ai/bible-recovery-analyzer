import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ["RECOVERY_PROVIDER"] = "mock"
os.environ["SQLITE_PATH"] = "./data/test_bible_analyzer.db"

from app.main import app  # noqa: E402
from app.services.strongs import normalize_strongs  # noqa: E402
from scripts.seed_data import main as seed_main  # noqa: E402

SNAP = Path("tests/snapshots")


@pytest.fixture(scope="session", autouse=True)
def seeded_db():
    Path("./data").mkdir(exist_ok=True)
    seed_main()


@pytest.fixture()
def client():
    return TestClient(app)


def _snapshot(name: str):
    return json.loads((SNAP / name).read_text(encoding="utf-8"))


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200


def test_provider_status(client):
    r = client.get("/provider-status")
    assert r.status_code == 200
    assert r.json()["configured_provider"] == "mock"


def test_verse_gen_1_1_standard(client):
    r = client.get("/verse", params={"ref": "創1:1", "mode": "standard"})
    assert r.status_code == 200
    assert r.json()["ref"] == "Gen.1.1"
    assert r.json()["source_provider"] == "mock"


def test_verse_john_1_1_interlinear_mode(client):
    r = client.get("/verse", params={"ref": "約1:1", "mode": "interlinear"})
    assert r.status_code == 200
    expected = _snapshot("verse_interlinear_john1_1.json")
    assert r.json()["ref"] == expected["ref"]
    assert r.json()["interlinear"]["original_text_line"] == expected["interlinear"]["original_text_line"]


def test_verse_compact_mode(client):
    r = client.get("/verse", params={"ref": "約1:1", "mode": "compact"})
    assert r.status_code == 200
    assert len(r.json()["cards"]) <= 3


def test_interlinear_endpoint(client):
    r = client.get("/interlinear", params={"ref": "John1:1"})
    assert r.status_code == 200
    assert r.json()["mode"] == "interlinear"


def test_passage_range(client):
    r = client.get("/passage", params={"ref": "John1:1-1", "mode": "detailed"})
    assert r.status_code == 200
    expected = _snapshot("passage_john_1_1_1.json")
    assert r.json()["ref"] == expected["ref"]
    assert r.json()["verse_count"] == expected["verse_count"]


def test_word_query(client):
    r = client.get("/word", params={"q": "λόγος"})
    assert r.status_code == 200
    assert r.json()[0]["lemma"] == "λόγος"


def test_strongs_g3056(client):
    r = client.get("/strongs/G3056")
    assert r.status_code == 200
    expected = _snapshot("strongs_g3056.json")
    assert r.json()["strongs"] == expected["strongs"]


def test_lemma_lookup(client):
    r = client.get("/lemma", params={"lemma": "אֱלֹהִים"})
    assert r.status_code == 200
    expected = _snapshot("lemma_elohim.json")
    assert r.json()[0]["lemma"] == expected["lemma"]


def test_search_by_ref(client):
    r = client.get("/search", params={"q": "Rev.22.17"})
    assert r.status_code == 200


def test_invalid_ref(client):
    r = client.get("/verse", params={"ref": "未知1:1"})
    assert r.status_code == 400


def test_missing_strongs(client):
    r = client.get("/strongs/G9999")
    assert r.status_code == 404


def test_legend(client):
    r = client.get("/legend")
    assert r.status_code == 200
    expected = _snapshot("legend_core.json")
    for key in expected["analytical_keys"]:
        assert key in r.json()["analytical_code_legend"]


def test_resources(client):
    r = client.get("/resources", params={"q": "affirmation"})
    assert r.status_code == 200
    assert len(r.json()["results"]) >= 1


def test_strongs_normalization():
    assert normalize_strongs("g3056") == "G3056"


def test_mock_recovery_text_presence(client):
    r = client.get("/verse", params={"ref": "John1:1"})
    assert r.status_code == 200
    assert "[MOCK]" in r.json()["interlinear"]["recovery_version_line"]


def test_study_basic(client):
    r = client.get("/study", params={"ref": "John1:1"})
    assert r.status_code == 200
    body = r.json()
    assert body["reference"]["normalized"] == "John.1.1"
    assert "recovery_text" in body and "interlinear" in body and "lexicon_summary" in body and "diagnostics" in body


def test_study_truncated_marker(client):
    r = client.get("/study", params={"ref": "John1:1-51", "max_verses": 50})
    assert r.status_code == 200
    body = r.json()
    assert body["reference"]["truncated"] is True
    assert body["reference"]["processed_verse_count"] <= 50


def test_study_no_secret_leak(client):
    os.environ["ACTION_API_KEY"] = "SECRET_ACTION_KEY"
    os.environ["RECOVERY_API_KEY"] = "SECRET_LSM_KEY"
    r = client.get("/study", params={"ref": "John1:1"})
    raw = r.text
    assert "SECRET_ACTION_KEY" not in raw
    assert "SECRET_LSM_KEY" not in raw


def test_action_auth_required_when_enabled_missing_header():
    os.environ["ACTION_AUTH_ENABLED"] = "true"
    os.environ["ACTION_AUTH_MODE"] = "bearer"
    os.environ["ACTION_API_KEY"] = "abc123"
    import app.deps as deps
    deps.settings.action_auth_enabled = True
    deps.settings.action_auth_mode = "bearer"
    deps.settings.action_api_key = "abc123"
    from fastapi.testclient import TestClient
    from app.main import app
    c = TestClient(app)
    r = c.get("/verse", params={"ref": "John1:1"})
    assert r.status_code == 401


def test_action_auth_required_when_enabled_with_bearer():
    os.environ["ACTION_AUTH_ENABLED"] = "true"
    os.environ["ACTION_AUTH_MODE"] = "bearer"
    os.environ["ACTION_API_KEY"] = "abc123"
    import app.deps as deps
    deps.settings.action_auth_enabled = True
    deps.settings.action_auth_mode = "bearer"
    deps.settings.action_api_key = "abc123"
    from fastapi.testclient import TestClient
    from app.main import app
    c = TestClient(app)
    r = c.get("/verse", params={"ref": "John1:1"}, headers={"Authorization": "Bearer abc123"})
    assert r.status_code == 200
    deps.settings.action_auth_enabled = False
