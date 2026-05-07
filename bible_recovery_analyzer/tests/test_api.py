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


def test_study_returns_greek_interlinear_when_data_exists(client):
    from scripts.import_macula_greek import main as import_greek
    import_greek(source_dir='tests/fixtures/macula_greek', force=True, sqlite_path='./data/test_bible_analyzer.db')
    r = client.get('/study', params={'ref':'John1:1'})
    assert r.status_code == 200
    j=r.json()
    assert j['original_text']['language'] == 'greek'
    assert len(j['interlinear']) >= 1


def test_study_returns_hebrew_interlinear_when_data_exists(client):
    from scripts.import_macula_hebrew import main as import_hebrew
    import_hebrew(source_dir='tests/fixtures/macula_hebrew', force=True, sqlite_path='./data/test_bible_analyzer.db')
    r = client.get('/study', params={'ref':'Gen1:1'})
    assert r.status_code == 200
    j=r.json()
    assert j['original_text']['language'] == 'hebrew'


def test_study_graceful_when_macula_not_imported(client):
    r = client.get('/study', params={'ref':'John1:9'})
    assert r.status_code == 200
    assert 'original language data not imported' in ' '.join(r.json()['diagnostics']['warnings'])


def test_reference_mapping_john(client):
    r = client.get('/study', params={'ref':'John1:1-3'})
    assert r.status_code == 200
    assert r.json()['reference']['normalized'].startswith('John.1.1')


def test_reference_mapping_genesis(client):
    r = client.get('/study', params={'ref':'Genesis1:1'})
    assert r.status_code == 200
    assert r.json()['reference']['normalized'].startswith('Gen.1.1')


def test_study_max_verse_limit(client):
    r = client.get('/study', params={'ref':'John1:1-60'})
    assert r.status_code == 200
    assert r.json()['reference']['truncated'] is True


def test_cors_config_allows_github_pages_origin():
    from app.main import app
    cors = [m for m in app.user_middleware if m.cls.__name__ == 'CORSMiddleware'][0]
    assert 'https://vegeta1260-ai.github.io' in cors.kwargs['allow_origins']
