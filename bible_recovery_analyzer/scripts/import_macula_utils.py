import csv
import json
from pathlib import Path


def norm(h: str) -> str:
    return h.strip().lower().replace(' ', '_').replace('-', '_')


def pick(row, *names):
    for n in names:
        if n in row and row[n]:
            return row[n]
    return ''


def find_tsv(root: Path):
    return [p for p in root.rglob('*.tsv') if p.is_file()]


def read_tsv(path: Path):
    with path.open(encoding='utf-8') as f:
        reader=csv.DictReader(f, delimiter='\t')
        headers=[norm(h) for h in reader.fieldnames or []]
        for raw in reader:
            row={norm(k):v for k,v in raw.items()}
            yield headers,row


def raw_json(row):
    return json.dumps(row, ensure_ascii=False)
