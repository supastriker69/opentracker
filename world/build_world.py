"""Builds Open Tracker's world tables from the open sources in world/raw/ (run fetch_sources.sh first).

  out/countries.json  one record per country or territory: codes, names, region, population, map box,
                      number of states/regions and districts, emergency numbers, official languages
  out/places.json     every populated place in Natural Earth (about 7,300): position, population, capital flag,
                      and the nearest large-river point within 5 km (used for river-flow forecasts)
  out/world-shapes.json  country outlines for the world map (Natural Earth 1:110m, coordinates to 0.01°)

Sources and licences: world/README.md.   Run: python3 world/build_world.py
"""
from __future__ import annotations

import json
import math
import re
import sys
import tarfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW, OUT = HERE / "raw", HERE / "out"
TYPE_RANK = {"Sovereign country": 0, "Country": 1, "Sovereignty": 2, "Dependency": 3, "Disputed": 4, "Indeterminate": 5, "Lease": 6}
RIVER_KM = 5.0          # a place counts as "on a river" within this distance of a large-river centre line
OFFICIAL = ("official", "de_facto_official", "official_regional")


def read_json(rel: str) -> dict:
    return json.loads((RAW / rel).read_text(encoding="utf-8"))


def r3(v: float) -> float:
    return round(v, 3)   # about 100 m


# ---------- countries ----------

def bbox(geometry: dict) -> list[float]:
    """West, south, east, north of a Polygon or MultiPolygon."""
    polys = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
    xs = [pt[0] for poly in polys for ring in poly for pt in ring]
    ys = [pt[1] for poly in polys for ring in poly for pt in ring]
    return [r3(min(xs)), r3(min(ys)), r3(max(xs)), r3(max(ys))]


def countries_from_natural_earth(fc: dict) -> dict[str, dict]:
    """Countries keyed by ISO 3166-1 alpha-2, using the *_EH code columns (filled where the plain ones say -99).
    Small islands that reuse their country's code (e.g. "Brazilian I.") are dropped in favour of the country."""
    out: dict[str, dict] = {}
    rank: dict[str, tuple[int, int]] = {}
    for f in fc["features"]:
        p = f["properties"]
        iso2, iso3 = p.get("ISO_A2_EH"), p.get("ISO_A3_EH")
        if not iso2 or iso2 == "-99" or not iso3 or iso3 == "-99":
            continue
        key = (TYPE_RANK.get(p["TYPE"], 9), -int(p.get("POP_EST") or 0))
        if iso2 in rank and rank[iso2] <= key:
            continue
        rank[iso2] = key
        out[iso2] = {
            "iso2": iso2, "iso3": iso3, "name": p["NAME"], "nameLong": p["NAME_LONG"], "type": p["TYPE"],
            "continent": p["CONTINENT"], "region": p["REGION_UN"], "subregion": p["SUBREGION"],
            "population": int(p["POP_EST"]) if p.get("POP_EST") else None, "populationYear": p.get("POP_YEAR"),
            "label": [r3(p["LABEL_X"]), r3(p["LABEL_Y"])], "bbox": bbox(f["geometry"]),
        }
    return out


def division_counts(fc: dict) -> Counter:
    """Number of divisions per ISO3 code in a geoBoundaries CGAZ layer."""
    return Counter(f["properties"]["shapeGroup"] for f in fc["features"])


# ---------- emergency numbers (libphonenumber short-number patterns) ----------

class PatternTooBroad(ValueError):
    """The pattern uses open-ended parts (\\d, *, +, {n}) that can't be listed number by number."""


def expand_pattern(pattern: str, limit: int = 16) -> list[str]:
    """All numbers matched by a libphonenumber pattern made of digits, [classes], (?:groups), | and ?.
    Example: 1(?:1(?:22?|5)|[56]) -> 15, 16, 112, 115, 1122."""
    s = re.sub(r"\s+", "", pattern)
    if not s:
        return []
    if re.search(r"\\|[*+{]", s):
        raise PatternTooBroad(pattern)
    options, i = _alternatives(s, 0)
    if i != len(s):
        raise ValueError(f"unbalanced pattern: {pattern}")
    numbers = sorted({o for o in options if o.isdigit()}, key=lambda n: (len(n), n))
    if len(numbers) > limit:
        raise PatternTooBroad(pattern)
    return numbers


def _alternatives(s: str, i: int) -> tuple[list[str], int]:
    options: list[str] = []
    while True:
        seq, i = _sequence(s, i)
        options += seq
        if i < len(s) and s[i] == "|":
            i += 1
            continue
        return options, i


def _sequence(s: str, i: int) -> tuple[list[str], int]:
    current = [""]
    while i < len(s) and s[i] not in "|)":
        if s[i] == "(":
            j = i + 3 if s.startswith("(?:", i) else i + 1
            atom, i = _alternatives(s, j)
            if i >= len(s) or s[i] != ")":
                raise ValueError("missing )")
            i += 1
        elif s[i] == "[":
            j = s.index("]", i)
            atom, i = _char_class(s[i + 1:j]), j + 1
        else:
            atom, i = [s[i]], i + 1
        if i < len(s) and s[i] == "?":   # optional atom
            atom, i = atom + [""], i + 1
        current = [a + b for a in current for b in atom]
    return current, i


def _char_class(body: str) -> list[str]:
    chars, k = [], 0
    while k < len(body):
        if k + 2 < len(body) and body[k + 1] == "-":
            chars += [str(d) for d in range(int(body[k]), int(body[k + 2]) + 1)]
            k += 3
        else:
            chars.append(body[k])
            k += 1
    return chars


def emergency_numbers(xml_text: str) -> dict[str, list[str]]:
    """Emergency numbers per region; the main number (libphonenumber's example) comes first."""
    out: dict[str, list[str]] = {}
    for territory in ET.fromstring(xml_text).iter("territory"):
        em = territory.find("emergency")
        if em is None:
            continue
        example = (em.findtext("exampleNumber") or "").strip()
        try:
            numbers = expand_pattern(em.findtext("nationalNumberPattern") or "")
        except PatternTooBroad:
            numbers = []
        numbers = [example] + [n for n in numbers if n != example] if example else numbers
        out[territory.get("id")] = numbers
    return out


# ---------- languages (Unicode CLDR) ----------

def official_languages(territory_info: dict) -> dict[str, list[str]]:
    """Official languages per territory, most widely spoken first."""
    out: dict[str, list[str]] = {}
    for code, data in territory_info.items():
        langs = [(lang, float(v.get("_populationPercent", 0))) for lang, v in data.get("languagePopulation", {}).items()
                 if v.get("_officialStatus") in OFFICIAL]
        out[code] = [lang for lang, _ in sorted(langs, key=lambda x: -x[1])]
    return out


def read_cldr_territory_info() -> dict:
    tgz = max((RAW / "npm").glob("cldr-core-*.tgz"))
    with tarfile.open(tgz) as t:
        member = t.extractfile("package/supplemental/territoryInfo.json")
        if member is None:
            raise FileNotFoundError("territoryInfo.json missing from " + tgz.name)
        return json.load(member)["supplemental"]["territoryInfo"]


# ---------- places and rivers ----------

def km_between(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Great-circle distance in km between two (lon, lat) points."""
    la1, la2, dla, dlo = map(math.radians, (a[1], b[1], b[1] - a[1], b[0] - a[0]))
    h = math.sin(dla / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dlo / 2) ** 2
    return 2 * 6371 * math.asin(min(1.0, math.sqrt(h)))


class RiverIndex:
    """River centre-line vertices in 0.1-degree cells, for nearest-vertex lookups (vertices are dense enough at 5 km)."""

    CELL = 0.1

    def __init__(self, fc: dict):
        self.cells: dict[tuple[int, int], list[tuple[float, float]]] = defaultdict(list)
        for f in fc["features"]:
            if f["properties"].get("featurecla") != "River" or not f.get("geometry"):
                continue
            g = f["geometry"]
            lines = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
            for line in lines:
                for lon, lat in (pt[:2] for pt in line):
                    self.cells[self._cell(lon, lat)].append((lon, lat))

    def _cell(self, lon: float, lat: float) -> tuple[int, int]:
        return math.floor(lon / self.CELL), math.floor(lat / self.CELL)

    def nearest(self, ll: tuple[float, float], max_km: float) -> list[float] | None:
        cx, cy = self._cell(*ll)
        reach = 1 + int(max_km / (111 * self.CELL * max(0.1, math.cos(math.radians(ll[1])))))
        best, best_km = None, max_km
        for dx in range(-reach, reach + 1):
            for dy in range(-1 - int(max_km / 11), 2 + int(max_km / 11)):
                for pt in self.cells.get((cx + dx, cy + dy), ()):
                    d = km_between(ll, pt)
                    if d <= best_km:
                        best, best_km = pt, d
        return [r3(best[0]), r3(best[1])] if best else None


def places(fc: dict, rivers: RiverIndex, known: set[str]) -> list[dict]:
    """Populated places, capitals first and then by population, so the first N always cover every country."""
    out = []
    for f in fc["features"]:
        p = f["properties"]
        iso2 = p.get("iso_a2")
        if iso2 not in known:
            continue
        ll = (p["longitude"], p["latitude"])
        rec = {"id": f"p{p['ne_id']}", "n": p["nameascii"] or p["name"], "c": iso2, "a1": p.get("adm1name") or "",
               "ll": [r3(ll[0]), r3(ll[1])], "pop": int(p.get("pop_max") or 0), "cap": 1 if p.get("adm0cap") else 0}
        river = rivers.nearest(ll, RIVER_KM)
        if river:
            rec["river"] = river
        out.append(rec)
    out.sort(key=lambda r: (-r["cap"], -r["pop"], r["id"]))
    return out


# ---------- world map outlines ----------

def _round_coords(c):
    return [round(c[0], 2), round(c[1], 2)] if isinstance(c[0], (int, float)) else [_round_coords(x) for x in c]


def _drop_repeats(ring: list) -> list:
    out = [ring[0]]
    for pt in ring[1:]:
        if pt != out[-1]:
            out.append(pt)
    return out if len(out) >= 4 else []


def world_shapes(fc: dict, known: set[str]) -> dict:
    """Small world outline layer: one feature per country with its two-letter code and name."""
    feats = []
    for f in fc["features"]:
        p, g = f["properties"], f["geometry"]
        iso2 = p.get("ISO_A2_EH")
        if not g or iso2 not in known:
            continue
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        rings = [[_drop_repeats(r) for r in _round_coords(poly)] for poly in polys]
        polys = [[r for r in poly if r] for poly in rings if poly and poly[0]]
        if polys:
            feats.append({"type": "Feature", "properties": {"c": iso2, "n": p["NAME"]}, "geometry": {"type": "MultiPolygon", "coordinates": polys}})
    return {"type": "FeatureCollection", "features": feats}


# ---------- main ----------

def build() -> tuple[list[dict], list[dict], dict]:
    countries = countries_from_natural_earth(read_json("naturalearth/ne_10m_admin_0_countries.geojson"))
    adm1 = division_counts(read_json("boundaries/geoBoundariesCGAZ_ADM1.geojson"))
    adm2 = division_counts(read_json("boundaries/geoBoundariesCGAZ_ADM2.geojson"))
    phones = emergency_numbers((RAW / "phone/ShortNumberMetadata.xml").read_text(encoding="utf-8"))
    langs = official_languages(read_cldr_territory_info())
    for iso2, c in countries.items():
        c["divisions"] = {"level1": adm1.get(c["iso3"], 0), "level2": adm2.get(c["iso3"], 0)}
        c["emergency"] = phones.get(iso2, [])
        c["languages"] = langs.get(iso2, [])
    rivers = RiverIndex(read_json("naturalearth/ne_10m_rivers_lake_centerlines.geojson"))
    place_list = places(read_json("naturalearth/ne_10m_populated_places_simple.geojson"), rivers, set(countries))
    shapes = world_shapes(read_json("naturalearth/ne_110m_admin_0_countries.geojson"), set(countries))
    return sorted(countries.values(), key=lambda c: c["name"]), place_list, shapes


def main() -> int:
    if not RAW.exists():
        print("world/raw is missing: run world/fetch_sources.sh first", file=sys.stderr)
        return 1
    countries, place_list, shapes = build()
    OUT.mkdir(exist_ok=True)
    (OUT / "countries.json").write_text(json.dumps(countries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / "places.json").write_text(json.dumps(place_list, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (OUT / "world-shapes.json").write_text(json.dumps(shapes, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    with_capital = {p["c"] for p in place_list if p["cap"]}
    print(f"{len(countries)} countries and territories, {len(place_list)} places "
          f"({sum('river' in p for p in place_list)} on large rivers, {len(with_capital)} countries with a capital), "
          f"{len(shapes['features'])} country outlines")
    for field in ("emergency", "languages"):
        missing = [c["iso2"] for c in countries if not c[field]]
        print(f"  no {field}: {len(missing)} {' '.join(missing)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
