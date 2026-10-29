"""Unit tests for the world table builder (no downloads needed)."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build_world as bw  # noqa: E402


@pytest.mark.parametrize("pattern,expected", [
    ("199", ["199"]),
    ("19[1-3]|\n 999", ["191", "192", "193", "999"]),
    ("1(?:12|28|9[023])|911", ["112", "128", "190", "192", "193", "911"]),
    ("1(?:1(?:22?|5)|[56])", ["15", "16", "112", "115", "1122"]),
])
def test_emergency_patterns_expand(pattern, expected):
    assert bw.expand_pattern(pattern) == expected


@pytest.mark.parametrize("pattern", [r"1\d{2}", "11[0-9]+", "1[0-9][0-9][0-9]"])
def test_open_ended_patterns_are_refused(pattern):
    with pytest.raises(bw.PatternTooBroad):
        bw.expand_pattern(pattern)


def test_emergency_numbers_put_the_main_number_first():
    xml = """<phoneNumberMetadata><territories>
      <territory id="GH"><emergency><nationalNumberPattern>19[1-3]|999</nationalNumberPattern><exampleNumber>999</exampleNumber></emergency></territory>
      <territory id="ZZ"><generalDesc/></territory></territories></phoneNumberMetadata>"""
    assert bw.emergency_numbers(xml) == {"GH": ["999", "191", "192", "193"]}


def _country(iso2, name, kind, pop, ring):
    return {"properties": {"ISO_A2_EH": iso2, "ISO_A3_EH": iso2 + "X", "NAME": name, "NAME_LONG": name, "TYPE": kind,
                           "CONTINENT": "C", "REGION_UN": "R", "SUBREGION": "S", "POP_EST": pop, "POP_YEAR": 2019,
                           "LABEL_X": 1.23456, "LABEL_Y": 2.34567},
            "geometry": {"type": "Polygon", "coordinates": [ring]}}


def test_islands_sharing_a_code_do_not_replace_the_country():
    sq = [[0, 0], [10, 0], [10, 10], [0, 0]]
    fc = {"features": [_country("BR", "Brazilian I.", "Dependency", 0, [[30, -20], [31, -20], [31, -19], [30, -20]]),
                       _country("BR", "Brazil", "Sovereign country", 211_000_000, sq),
                       _country("-99", "Nowhere", "Country", 5, sq)]}
    out = bw.countries_from_natural_earth(fc)
    assert list(out) == ["BR"]
    assert out["BR"]["name"] == "Brazil" and out["BR"]["bbox"] == [0, 0, 10, 10] and out["BR"]["label"] == [1.235, 2.346]


def test_languages_keep_official_ones_by_share():
    info = {"NG": {"languagePopulation": {"ha": {"_populationPercent": "30"}, "en": {"_populationPercent": "53", "_officialStatus": "official"},
                                          "yo": {"_populationPercent": "20", "_officialStatus": "official_regional"}}}}
    assert bw.official_languages(info) == {"NG": ["en", "yo"]}


def test_river_index_finds_rivers_within_reach_only():
    rivers = bw.RiverIndex({"features": [
        {"properties": {"featurecla": "River"}, "geometry": {"type": "LineString", "coordinates": [[3.40, 6.45], [3.50, 6.50]]}},
        {"properties": {"featurecla": "Lake Centerline"}, "geometry": {"type": "LineString", "coordinates": [[0.0, 0.0]]}}]})
    assert rivers.nearest((3.41, 6.45), 5) == [3.4, 6.45]
    assert rivers.nearest((3.70, 6.45), 5) is None          # about 33 km away
    assert rivers.nearest((0.0, 0.01), 5) is None           # lakes are not rivers


def test_places_put_capitals_first_and_skip_unknown_countries():
    feats = [{"properties": {"ne_id": i, "name": n, "nameascii": n, "iso_a2": c, "adm1name": "", "longitude": 1.0, "latitude": 2.0,
                             "pop_max": pop, "adm0cap": cap}} for i, n, c, pop, cap in
             [(1, "Lagos", "NG", 9_000_000, 0), (2, "Abuja", "NG", 1_500_000, 1), (3, "Ghost", "-99", 5, 0)]]
    out = bw.places({"features": feats}, bw.RiverIndex({"features": []}), {"NG"})
    assert [p["n"] for p in out] == ["Abuja", "Lagos"]
    assert out[0] == {"id": "p2", "n": "Abuja", "c": "NG", "a1": "", "ll": [1.0, 2.0], "pop": 1_500_000, "cap": 1}


def test_distance():
    assert bw.km_between((0, 0), (0, 1)) == pytest.approx(111.19, abs=0.1)


def test_world_shapes_keep_known_countries_and_round():
    ring = [[1.234, 2.345], [3.456, 2.345], [3.456, 4.567], [1.2344, 2.3449], [1.234, 2.345]]
    fc = {"features": [{"properties": {"ISO_A2_EH": "NG", "NAME": "Nigeria"}, "geometry": {"type": "Polygon", "coordinates": [ring]}},
                       {"properties": {"ISO_A2_EH": "-99", "NAME": "X"}, "geometry": {"type": "Polygon", "coordinates": [ring]}}]}
    out = bw.world_shapes(fc, {"NG"})
    assert len(out["features"]) == 1
    f = out["features"][0]
    assert f["properties"] == {"c": "NG", "n": "Nigeria"}
    assert f["geometry"]["coordinates"][0][0] == [[1.23, 2.35], [3.46, 2.35], [3.46, 4.57], [1.23, 2.34], [1.23, 2.35]]
