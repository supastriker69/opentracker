"""The whole world-table build, offline: a small made-up copy of every source file, in the layout fetch_sources.sh
downloads, is turned into the three output files exactly as the real build does."""
import io
import json
import sys
import tarfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import build_world as bw  # noqa: E402

SQUARE = [[[2.7, 4.3], [14.7, 4.3], [14.7, 13.9], [2.7, 4.3]]]


def country(iso2, iso3, name, kind="Sovereign country", pop=200_000_000, polys=None):
    geom = {"type": "MultiPolygon", "coordinates": polys} if polys else {"type": "Polygon", "coordinates": SQUARE}
    return {"type": "Feature", "geometry": geom,
            "properties": {"ISO_A2_EH": iso2, "ISO_A3_EH": iso3, "NAME": name, "NAME_LONG": name, "TYPE": kind, "CONTINENT": "Africa",
                           "REGION_UN": "Africa", "SUBREGION": "Western Africa", "POP_EST": pop, "POP_YEAR": 2019, "LABEL_X": 7.5, "LABEL_Y": 9.4}}


def write(raw: Path, rel: str, data):
    p = raw / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, bytes):
        p.write_bytes(data)
    else:
        p.write_text(data if isinstance(data, str) else json.dumps(data), encoding="utf-8")


def cldr_tgz(info: dict) -> bytes:
    body = json.dumps({"supplemental": {"territoryInfo": info}}).encode()
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as t:
        member = tarfile.TarInfo("package/supplemental/territoryInfo.json")
        member.size = len(body)
        t.addfile(member, io.BytesIO(body))
    return buf.getvalue()


@pytest.fixture
def sources(tmp_path, monkeypatch):
    raw, out = tmp_path / "raw", tmp_path / "out"
    fc = lambda feats: {"type": "FeatureCollection", "features": feats}  # noqa: E731
    write(raw, "naturalearth/ne_10m_admin_0_countries.geojson", fc([
        country("NG", "NGA", "Nigeria"),
        country("GH", "GHA", "Ghana", pop=33_000_000, polys=[[[[-3.2, 4.7], [1.2, 4.7], [1.2, 11.2], [-3.2, 4.7]]]]),
        country("-99", "-99", "Disputed land", kind="Disputed")]))
    write(raw, "naturalearth/ne_110m_admin_0_countries.geojson", fc([country("NG", "NGA", "Nigeria"), country("GH", "GHA", "Ghana")]))
    write(raw, "boundaries/geoBoundariesCGAZ_ADM1.geojson", fc([{"properties": {"shapeGroup": "NGA"}}] * 37 + [{"properties": {"shapeGroup": "GHA"}}] * 16))
    write(raw, "boundaries/geoBoundariesCGAZ_ADM2.geojson", fc([{"properties": {"shapeGroup": "NGA"}}] * 774))
    write(raw, "phone/ShortNumberMetadata.xml", """<phoneNumberMetadata><territories>
        <territory id="NG"><emergency><nationalNumberPattern>199|112</nationalNumberPattern><exampleNumber>112</exampleNumber></emergency></territory>
        <territory id="GH"><emergency><nationalNumberPattern>\\d{3}</nationalNumberPattern></emergency></territory>
        </territories></phoneNumberMetadata>""")
    write(raw, "npm/cldr-core-48.0.0.tgz", cldr_tgz({"NG": {"languagePopulation": {"en": {"_populationPercent": "53", "_officialStatus": "official"}}},
                                                    "GH": {"languagePopulation": {"ak": {"_populationPercent": "80"}}}}))
    write(raw, "naturalearth/ne_10m_rivers_lake_centerlines.geojson", fc([
        {"properties": {"featurecla": "River"}, "geometry": {"type": "LineString", "coordinates": [[6.70, 7.80], [6.75, 7.85]]}},
        {"properties": {"featurecla": "River"}, "geometry": None}]))
    write(raw, "naturalearth/ne_10m_populated_places_simple.geojson", fc([
        {"properties": {"ne_id": 10, "name": "Lokoja", "nameascii": "Lokoja", "iso_a2": "NG", "adm1name": "Kogi", "longitude": 6.7333,
                        "latitude": 7.8023, "pop_max": 200_000, "adm0cap": 0}},
        {"properties": {"ne_id": 11, "name": "Abuja", "nameascii": "Abuja", "iso_a2": "NG", "adm1name": "FCT", "longitude": 7.49,
                        "latitude": 9.06, "pop_max": 1_500_000, "adm0cap": 1}},
        {"properties": {"ne_id": 12, "name": "Accra", "nameascii": "", "iso_a2": "GH", "adm1name": None, "longitude": -0.2,
                        "latitude": 5.55, "pop_max": None, "adm0cap": 1}}]))
    monkeypatch.setattr(bw, "RAW", raw)
    monkeypatch.setattr(bw, "OUT", out)
    return out


def test_the_build_writes_all_three_tables(sources, capsys):
    assert bw.main() == 0
    countries = json.loads((sources / "countries.json").read_text())
    assert [c["iso2"] for c in countries] == ["GH", "NG"]   # by name; the disputed land without a code is left out
    ng = countries[1]
    assert ng["divisions"] == {"level1": 37, "level2": 774}
    assert ng["emergency"] == ["112", "199"] and ng["languages"] == ["en"]
    gh = countries[0]
    assert gh["emergency"] == [] and gh["languages"] == [], "an open-ended pattern and unofficial languages give nothing"
    assert gh["bbox"] == [-3.2, 4.7, 1.2, 11.2]
    places = json.loads((sources / "places.json").read_text())
    assert [p["n"] for p in places] == ["Abuja", "Accra", "Lokoja"]   # capitals first, then by population
    assert places[2]["river"] == [6.7, 7.8], "Lokoja sits where the Niger and Benue meet"
    assert "river" not in places[0] and places[1]["pop"] == 0 and places[1]["a1"] == ""
    shapes = json.loads((sources / "world-shapes.json").read_text())
    assert [f["properties"]["c"] for f in shapes["features"]] == ["NG", "GH"]
    said = capsys.readouterr().out
    assert "2 countries and territories, 3 places (1 on large rivers, 2 countries with a capital), 2 country outlines" in said
    assert "no emergency: 1 GH" in said and "no languages: 1 GH" in said


def test_missing_sources_say_what_to_run(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(bw, "RAW", tmp_path / "nothing")
    assert bw.main() == 1
    assert "run world/fetch_sources.sh first" in capsys.readouterr().err


def test_a_broken_language_archive_is_reported(tmp_path, monkeypatch):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as t:
        d = tarfile.TarInfo("package/supplemental/territoryInfo.json")
        d.type = tarfile.DIRTYPE
        t.addfile(d)
    write(tmp_path, "npm/cldr-core-48.0.0.tgz", buf.getvalue())
    monkeypatch.setattr(bw, "RAW", tmp_path)
    with pytest.raises(FileNotFoundError, match="territoryInfo.json missing"):
        bw.read_cldr_territory_info()


@pytest.mark.parametrize("pattern, problem", [("1(?:12", "missing \\)"), ("112)", "unbalanced"), ("", None)])
def test_broken_patterns(pattern, problem):
    if problem is None:
        assert bw.expand_pattern(pattern) == []
    else:
        with pytest.raises(ValueError, match=problem):
            bw.expand_pattern(pattern)


def test_too_many_numbers_are_refused():
    with pytest.raises(bw.PatternTooBroad):
        bw.expand_pattern("[0-9][0-9]", limit=16)
