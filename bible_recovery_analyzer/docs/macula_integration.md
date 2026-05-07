# MACULA Integration
MACULA Greek/Hebrew provides token-level original language data. This project imports TSV rows into SQLite `original_tokens` and `original_verses`.

## Download
`python scripts/download_macula.py`

## Import
- Greek: `python scripts/import_macula_greek.py`
- Hebrew: `python scripts/import_macula_hebrew.py`
- All: `python scripts/import_macula_all.py --force`

## Notes
- LSM recovery text is runtime-only and never persisted.
- If cloud filesystem is ephemeral, use persistent volume or PostgreSQL.
- Phase 1 imports token rows only; syntax tree not imported in phase 1.

## Verify
- `/study?ref=John1:1`
- `/study?ref=Gen1:1`
