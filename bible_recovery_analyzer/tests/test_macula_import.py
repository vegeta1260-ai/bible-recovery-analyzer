import os
from pathlib import Path

from app.models.db import Database, OriginalToken
from scripts.import_macula_greek import main as import_greek
from scripts.import_macula_hebrew import main as import_hebrew


def test_import_macula_sample_greek(tmp_path):
    db_path = tmp_path / 'test.db'
    os.environ['SQLITE_PATH'] = str(db_path)
    import_greek(source_dir='tests/fixtures/macula_greek', force=True, sqlite_path=str(db_path))
    db = Database(str(db_path))
    with db.session_local() as s:
        rows = s.query(OriginalToken).filter(OriginalToken.verse_ref == 'John.1.1').all()
        assert len(rows) >= 2


def test_import_macula_sample_hebrew(tmp_path):
    db_path = tmp_path / 'test.db'
    os.environ['SQLITE_PATH'] = str(db_path)
    import_hebrew(source_dir='tests/fixtures/macula_hebrew', force=True, sqlite_path=str(db_path))
    db = Database(str(db_path))
    with db.session_local() as s:
        rows = s.query(OriginalToken).filter(OriginalToken.verse_ref == 'Gen.1.1').all()
        assert len(rows) >= 2
