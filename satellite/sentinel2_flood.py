"""Flood outlines from Sentinel-2 (10-20 m, every 5 days) for any place on Earth, as an Open Tracker replay file.

For each clear day in the date range it reads the green (B3) and shortwave-infrared (B11) bands and the scene
classification, computes the water index MNDWI = (green - SWIR) / (green + SWIR), masks clouds and their
shadows, and keeps water. Water already there before the flood (from the clearest scene in --before) is removed,
so what remains is flood water. Images come from a STAC catalogue (Earth Search on AWS by default; no account).

    python satellite/sentinel2_flood.py --id lagos-2026-07 --title "Lagos floods, July 2026" --country NG \\
        --bbox 3.30,6.40,3.50,6.62 --after 2026-07-01/2026-07-20 --before 2026-05-01/2026-06-15 --out replays/lagos-2026-07.json

Optical satellites can't see through cloud, and most floods happen under cloud: use the Sentinel-1 radar script
(sentinel1_flood.js) or Copernicus GFM outlines when this finds no clear days."""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

import numpy as np

STAC_URL = "https://earth-search.aws.element84.com/v1"
COLLECTION = "sentinel-2-l2a"
BANDS = {"green": ("green", "B03"), "swir": ("swir16", "B11"), "scl": ("scl", "SCL")}   # Earth Search names, then ESA names
CLOUDY_SCL = (0, 1, 3, 8, 9, 10)   # no data, saturated, cloud shadow, cloud (medium, high), cirrus
PIXEL_M = 20                       # B11 and the scene classification are 20 m
MIN_PIXELS = 3                     # smaller water patches are noise


# ---------- pure image steps (tested without the network) ----------

def mndwi(green: np.ndarray, swir: np.ndarray) -> np.ndarray:
    """Modified Normalised Difference Water Index; NaN where both bands are zero."""
    g, s = green.astype("float32"), swir.astype("float32")
    with np.errstate(invalid="ignore", divide="ignore"):
        out = (g - s) / (g + s)
    out[(g + s) == 0] = np.nan
    return out


def water_mask(index: np.ndarray, scl: np.ndarray | None, threshold: float) -> tuple[np.ndarray, np.ndarray]:
    """(water, seen): water where the index is above the threshold on a clear pixel; seen = clear pixels."""
    seen = ~np.isnan(index)
    if scl is not None:
        seen &= ~np.isin(scl, CLOUDY_SCL)
    return seen & (index > threshold), seen


def outline(mask: np.ndarray, transform, crs, min_pixels: int = MIN_PIXELS):
    """Water pixels → one (multi)polygon in longitude/latitude and its area in km², or (None, 0)."""
    import geopandas as gpd
    from rasterio import features
    from shapely.geometry import shape

    polys = [shape(geom) for geom, value in features.shapes(mask.astype("uint8"), mask=mask, transform=transform) if value == 1]
    if not polys:
        return None, 0.0
    gdf = gpd.GeoDataFrame(geometry=polys, crs=crs)
    pixel_area = abs(transform.a * transform.e)
    gdf = gdf[gdf.area >= min_pixels * pixel_area]
    if gdf.empty:
        return None, 0.0
    km2 = float(gdf.area.sum()) / 1e6
    return gdf.to_crs(4326).geometry.union_all().buffer(0), km2


# ---------- finding and reading scenes ----------

def search(stac_url: str, bbox: list[float], dates: str, max_cloud: int, post=None) -> list[dict]:
    """STAC items for the box and dates, newest first, with at most max_cloud % cloud over the whole tile."""
    import requests

    post = post or requests.post
    body = {"collections": [COLLECTION], "bbox": bbox, "datetime": _interval(dates), "limit": 100,
            "query": {"eo:cloud_cover": {"lt": max_cloud}}, "sortby": [{"field": "properties.datetime", "direction": "desc"}]}
    r = post(f"{stac_url}/search", json=body, timeout=60)
    r.raise_for_status()
    return r.json().get("features", [])


def _interval(dates: str) -> str:
    m = re.fullmatch(r"(\d{4}-\d{2}-\d{2})/(\d{4}-\d{2}-\d{2})", dates)
    if not m:
        raise SystemExit(f"dates must look like 2026-07-01/2026-07-20 (got {dates!r})")
    return f"{m.group(1)}T00:00:00Z/{m.group(2)}T23:59:59Z"


def by_day(items: list[dict]) -> dict[str, list[dict]]:
    """Several tiles can cover the box on one day: group them."""
    days = defaultdict(list)
    for it in items:
        days[it["properties"]["datetime"][:10]].append(it)
    return dict(sorted(days.items()))


def asset_href(item: dict, band: str) -> str:
    for name in BANDS[band]:
        a = item.get("assets", {}).get(name)
        if a and a.get("href", "").startswith(("https://", "s3://")):
            return a["href"]
    raise KeyError(f"{item.get('id')}: no {band} band")


def read_day(items: list[dict], bbox: list[float]):
    """The day's bands over the box on one 20 m grid (first tile wins where tiles overlap)."""
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.warp import transform_bounds
    from rasterio.windows import from_bounds

    grid = None
    for it in items:
        with rasterio.open(asset_href(it, "swir")) as src:
            if grid is None:
                left, bottom, right, top = transform_bounds("EPSG:4326", src.crs, *bbox)
                win = from_bounds(left, bottom, right, top, src.transform).round_offsets().round_lengths()
                grid = {"crs": src.crs, "transform": src.window_transform(win), "shape": (int(win.height), int(win.width))}
                bands = {k: np.zeros(grid["shape"], dtype="uint16") for k in BANDS}
            if src.crs != grid["crs"]:
                continue   # a neighbouring UTM zone: skip rather than mix grids
        for k in BANDS:
            with rasterio.open(asset_href(it, k)) as src:
                win = from_bounds(*rasterio.transform.array_bounds(*grid["shape"], grid["transform"]), src.transform)
                data = src.read(1, window=win, out_shape=grid["shape"], boundless=True, fill_value=0, resampling=Resampling.nearest)
                fill = bands[k] == 0
                bands[k][fill] = data[fill]
    if grid is None:
        raise SystemExit("no scenes to read")
    return bands, grid


def water_on(items, bbox, threshold):
    bands, grid = read_day(items, bbox)
    water, seen = water_mask(mndwi(bands["green"], bands["swir"]), bands["scl"], threshold)
    return water, seen, grid


# ---------- the replay ----------

def build(a) -> dict:
    from prepare_extent import bundle, to_frame

    after = by_day(search(a.stac, a.bbox, a.after, a.max_cloud))
    if not after:
        raise SystemExit("No Sentinel-2 scenes with little enough cloud in --after. Try Sentinel-1 (sentinel1_flood.js) or GFM.")
    before = None
    if a.before:
        days = by_day(search(a.stac, a.bbox, a.before, a.max_cloud))
        if days:
            clearest = min(days.values(), key=lambda its: np.mean([i["properties"].get("eo:cloud_cover", 100) for i in its]))
            before, seen_before, _ = water_on(clearest, a.bbox, a.threshold)
    frames = []
    for day, items in after.items():
        water, seen, grid = water_on(items, a.bbox, a.threshold)
        if seen.mean() < a.min_clear:
            print(f"{day}: only {seen.mean():.0%} of the area is clear of cloud; skipped")
            continue
        flood = water & ~before if before is not None and before.shape == water.shape else water
        geom, km2 = outline(flood, grid["transform"], grid["crs"])
        if geom is None:
            print(f"{day}: no flood water seen")
            continue
        frames.append(to_frame(geom, km2, day))
    if not frames:
        raise SystemExit("No clear day showed flood water.")
    meta = {"id": a.id, "title": a.title, "country": a.country, "areas": a.areas.split(",") if a.areas else [],
            "source": "Copernicus Sentinel-2 (MNDWI water index), via Earth Search", "link": "https://dataspace.copernicus.eu/",
            "notes": a.notes or "", "assumptions": [f"Water where MNDWI is above {a.threshold}; clouds and their shadows are masked."]
            + (["Water already present before the flood is removed."] if before is not None else [])}
    return bundle(meta, frames, a.bbox)


def main(argv=None):
    from prepare_extent import country_code

    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--id", required=True)
    p.add_argument("--title", required=True)
    p.add_argument("--country", required=True, type=country_code)
    p.add_argument("--areas", default="")
    p.add_argument("--bbox", required=True, type=lambda s: [float(x) for x in s.split(",")], help="west,south,east,north")
    p.add_argument("--after", required=True, help="flood dates, e.g. 2026-07-01/2026-07-20")
    p.add_argument("--before", help="dry dates for normal water, e.g. 2026-05-01/2026-06-15")
    p.add_argument("--threshold", type=float, default=0.2, help="MNDWI above this is water (0.2 cuts shadows)")
    p.add_argument("--max-cloud", type=int, default=40, help="skip tiles cloudier than this (%%)")
    p.add_argument("--min-clear", type=float, default=0.6, help="skip days when less of the area is clear")
    p.add_argument("--stac", default=STAC_URL)
    p.add_argument("--notes")
    p.add_argument("--out", required=True)
    a = p.parse_args(argv)
    if not re.fullmatch(r"[a-z0-9-]{2,80}", a.id):
        raise SystemExit("--id can use lowercase letters, numbers and dashes")
    w, s, e, n = a.bbox
    if not (-180 <= w < e <= 180 and -90 <= s < n <= 90) or (e - w) * (n - s) > 1:
        raise SystemExit("--bbox must be west,south,east,north and at most about 1 degree square")
    b = build(a)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(b, separators=(",", ":")))
    print(f"{a.out}: {len(b['frames'])} dates, " + ", ".join(f"{f['t'][:10]} {f['km2']} km²" for f in b["frames"]))


if __name__ == "__main__":
    main()
