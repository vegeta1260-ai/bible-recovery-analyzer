from app.services.analytical_codes import parse_analytical_code
from app.services.strongs import normalize_strongs


def test_parse_code_contains_legend_entry():
    info = parse_analytical_code("V-PRES-IMP-2-SG-M/P")
    assert info.expanded["V"].startswith("Verb")
    assert "M/P" in info.legend


def test_normalize_strongs_uppercases():
    assert normalize_strongs("h430") == "H430"


def test_normalize_strongs_suffix_rule():
    assert normalize_strongs("H430A") == "H430"
