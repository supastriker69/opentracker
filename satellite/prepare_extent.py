"""Turns satellite flood outlines (Copernicus EMS / GFM, UNOSAT, or the Sentinel-1 script) into an Open Tracker
replay file: one step per date, simplified for phones, in longitude/latitude.

    python satellite/prepare_extent.py --id borno-2024-09 --title "Borno floods, September 2024" \
        --country NG --areas NG-BO --source "Copernicus EMS EMSR753 (Sentinel-1, Sentinel-2)" \
        --link https://mapping.emergency.copernicus.eu/news/flood-in-borno-nigeria/ \
        --filter obj_type=Flooded area \
        2024-09-11=EMSR753_AOI01_DEL_observedEventA.shp 2024-09-17=EMSR753_AOI01_DEL_MONIT01.shp

Each DATE=FILE reads any vector format GeoPandas reads (shapefile, GeoPackage, GeoJSON, zip)."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import geopandas as gpd
from shapely.geometry import box, mapping

FRAME_BUDGET = 180_000


def read_outline(path: str, layer: str | None = None, filt: str | None = None, clip: list[float] | None = None):
    """Flooded area as one (multi)polygon in EPSG:4326, and its area in km²."""
    gdf = gpd.read_file(path, layer=layer) if layer else gpd.read_file(path)
    if filt:
        col, val = filt.split("=", 1)
        if col not in gdf.columns:
            raise SystemExit(f"{path}: no column {col!r}. Columns: {', '.join(map(str, gdf.columns))}")
        gdf = gdf[gdf[col].astype(str).str.strip().str.lower() == val.strip().lower()]
    gdf = gdf[gdf.geometry.notna() & gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])]
    if gdf.empty:
        raise SystemExit(f"{path}: no flooded areas found")
    if gdf.crs is None:
        raise SystemExit(f"{path}: the file has no coordinate system")
    gdf = gdf.to_crs(4326)
    if clip:
        gdf = gdf.clip(box(*clip))
    geom = gdf.geometry.union_all().buffer(0)
    km2 = float(gpd.GeoSeries([geom], crs=4326).to_crs(gdf.estimate_utm_crs()).area.iloc[0]) / 1e6
    return geom, km2


def to_frame(geom, km2: float, date: str) -> dict:
    tol = 0.00005
    for _ in range(16):
        g = geom.simplify(tol, preserve_topology=True).buffer(0)
        fc = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"k": 1}, "geometry": _round(mapping(g))}]}
        if g.is_empty:
            break
        if len(json.dumps(fc, separators=(",", ":"))) <= FRAME_BUDGET:
            return {"t": f"{date}T12:00:00Z", "label": "", "km2": round(km2, 2), "fc": fc}
        tol *= 1.7
    raise SystemExit(f"{date}: the outline is too detailed even after simplifying; clip it with --clip")


def _round(geom: dict) -> dict:
    def r(c):
        return [round(c[0], 5), round(c[1], 5)] if isinstance(c[0], float) else [r(x) for x in c]
    g = {"type": geom["type"], "coordinates": r(geom["coordinates"])}
    if g["type"] == "Polygon":
        g = {"type": "MultiPolygon", "coordinates": [g["coordinates"]]}
    return g


def bundle(meta: dict, frames: list[dict], bbox) -> dict:
    """An Open Tracker replay file: meta has id, title, country, areas (list), source, link, notes."""
    frames = sorted(frames, key=lambda f: f["t"])
    return {"app": "OpenTracker-replay", "version": 1,
            "replay": {"id": meta["id"], "kind": "satellite", "title": meta["title"], "c": meta["country"], "areas": meta.get("areas") or [],
                       "bbox": [round(v, 5) for v in bbox], "source": meta["source"], "link": meta.get("link") or "", "notes": meta.get("notes") or "",
                       "assumptions": ["Water outlines mapped from satellite images; water under trees or between buildings can be missed.",
                                       "Each step is the water seen on that date, not the deepest point of the flood."] + meta.get("assumptions", []),
                       "classes": [{"k": 1, "n": "Water seen from space"}]},
            "frames": frames}


def build_bundle(a) -> dict:
    frames, bounds = [], None
    for item in a.dates:
        m = re.fullmatch(r"(\d{4}-\d{2}-\d{2})=(.+)", item)
        if not m:
            raise SystemExit(f"Use DATE=FILE, for example 2024-09-11=flood.shp (got {item!r})")
        geom, km2 = read_outline(m.group(2), a.layer, a.filter, a.clip)
        frames.append(to_frame(geom, km2, m.group(1)))
        b = geom.bounds
        bounds = b if bounds is None else (min(bounds[0], b[0]), min(bounds[1], b[1]), max(bounds[2], b[2]), max(bounds[3], b[3]))
    meta = {"id": a.id, "title": a.title, "country": a.country, "areas": a.areas.split(",") if a.areas else [],
            "source": a.source, "link": a.link, "notes": a.notes}
    return bundle(meta, frames, a.clip or bounds)


def country_code(s: str) -> str:
    """Any ISO 3166-1 two-letter country code: Open Tracker covers every country."""
    if not re.fullmatch(r"[A-Za-z]{2}", s):
        raise argparse.ArgumentTypeError("use a two-letter country code such as NG")
    return s.upper()


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("dates", nargs="+", help="DATE=FILE pairs, one per satellite date")
    p.add_argument("--id", required=True, help="short name: lowercase letters, numbers and dashes")
    p.add_argument("--title", required=True)
    p.add_argument("--country", required=True, type=country_code, help="two-letter country code, e.g. NG")
    p.add_argument("--areas", default="", help="region/state IDs, comma separated (e.g. NG-BO)")
    p.add_argument("--source", required=True, help="who made the outlines and from which satellite")
    p.add_argument("--link", help="link to the original product")
    p.add_argument("--notes")
    p.add_argument("--layer", help="layer name inside a GeoPackage")
    p.add_argument("--filter", help="keep only features where COLUMN=VALUE (e.g. obj_type=Flooded area)")
    p.add_argument("--clip", type=lambda s: [float(x) for x in s.split(",")], help="west,south,east,north")
    p.add_argument("--out", required=True)
    a = p.parse_args(argv)
    if not re.fullmatch(r"[a-z0-9-]{2,80}", a.id):
        raise SystemExit("--id can use lowercase letters, numbers and dashes")
    b = build_bundle(a)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(b, separators=(",", ":")))
    print(f"{a.out}: {len(b['frames'])} dates, " + ", ".join(f"{f['t'][:10]} {f['km2']} km²" for f in b["frames"]))


if __name__ == "__main__":
    main()
