"""Turns SFINCS output into an Open Tracker replay bundle: one map layer per hour, water depth in four
plain-word classes, as simplified GeoJSON in longitude/latitude, small enough for phones."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import xarray as xr
from pyproj import Transformer
from rasterio.features import shapes
from rasterio.transform import Affine
from shapely.geometry import mapping, shape
from shapely.ops import transform as reproject, unary_union

CLASSES = [  # depth in metres; words people understand
    {"k": 1, "min": 0.15, "max": 0.3, "n": "Ankle to knee deep"},
    {"k": 2, "min": 0.3, "max": 0.6, "n": "Knee to waist deep"},
    {"k": 3, "min": 0.6, "max": 1.2, "n": "Waist to chest deep"},
    {"k": 4, "min": 1.2, "max": None, "n": "Deeper than chest height"},
]
FRAME_BUDGET = 180_000   # bytes of GeoJSON per hour, so a frame loads fast on a phone and fits one database record


def classify(depth: np.ndarray) -> np.ndarray:
    out = np.zeros(depth.shape, dtype=np.uint8)
    for c in CLASSES:
        sel = depth >= c["min"] if c["max"] is None else (depth >= c["min"]) & (depth < c["max"])
        out[sel] = c["k"]
    return out


def _grid_transform(ds: xr.Dataset) -> Affine:
    """Cell-corner transform of SFINCS's regular grid (cell centres are 2-D x, y on dims n, m)."""
    x, y = ds["x"].values[0, :], ds["y"].values[:, 0]
    dx, dy = float(x[1] - x[0]), float(y[1] - y[0])
    return Affine(dx, 0, float(x[0]) - dx / 2, 0, dy, float(y[0]) - dy / 2)


def frame_geojson(cls: np.ndarray, transform: Affine, to_wgs84, res_m: float) -> tuple[dict, float]:
    """Polygons per depth class, simplified until the frame fits the budget. Returns (FeatureCollection, wet km²)."""
    wet_km2 = float((cls > 0).sum()) * res_m * res_m / 1e6
    polys = {c["k"]: [] for c in CLASSES}
    for geom, k in shapes(cls, mask=cls > 0, transform=transform, connectivity=8):
        polys[int(k)].append(shape(geom))
    merged = {k: unary_union(v) for k, v in polys.items() if v}
    tol = res_m * 0.5
    for _ in range(12):
        feats = []
        for k, g in merged.items():
            g2 = g.simplify(tol, preserve_topology=True).buffer(0)
            if g2.is_empty or g2.area < res_m * res_m:
                continue
            g2 = reproject(to_wgs84, g2)
            feats.append({"type": "Feature", "properties": {"k": k}, "geometry": _round(mapping(g2))})
        fc = {"type": "FeatureCollection", "features": feats}
        if len(json.dumps(fc, separators=(",", ":"))) <= FRAME_BUDGET:
            return fc, wet_km2
        tol *= 1.6
    raise RuntimeError("frame is still too large after simplification")


def _round(geom: dict) -> dict:
    """5 decimals ≈ 1 m: plenty for a 50 m model, and half the bytes."""
    def r(c):
        return [round(c[0], 5), round(c[1], 5)] if isinstance(c[0], float) else [r(x) for x in c]
    return {"type": geom["type"], "coordinates": r(geom["coordinates"])}


def bundle(map_nc: Path, city_key: str, city: dict, scenario, made_with: str) -> dict:
    """Reads sfincs_map.nc and returns the replay bundle (see webapp/lib/rules.js parseReplay)."""
    ds = xr.open_dataset(map_nc)
    zb = ds["zb"].values if "zb" in ds else None
    epsg = int(ds["crs"].attrs.get("epsg", 0)) if "crs" in ds else 0
    if not epsg:
        raise RuntimeError("model output has no EPSG code")
    to_wgs84 = Transformer.from_crs(epsg, 4326, always_xy=True).transform
    transform = _grid_transform(ds)
    res = abs(transform.a)
    frames = []
    for i, t in enumerate(ds["time"].values):
        depth = np.nan_to_num(ds["h"].isel(time=i).values, nan=0.0)
        if zb is not None and city.get("tide_m") is not None:
            depth[zb < 0.5] = 0.0   # the sea and lagoon beds themselves are not a flood
        fc, wet = frame_geojson(classify(depth), transform, to_wgs84, res)
        frames.append({"i": i, "t": _iso(t), "label": f"Hour {i}", "km2": round(wet, 2), "fc": fc})
    ds.close()
    run_id = f"{city_key}-{scenario.key}"
    return {
        "app": "OpenTracker-replay", "version": 1,
        "replay": {
            "id": run_id, "kind": "model", "title": f"{city['name'].split(' (')[0]}: {scenario.title}",
            "c": city["country"], "areas": city.get("areas", []), "bbox": city["bbox"],
            "source": "Open Tracker flood model: SFINCS (Deltares) built with HydroMT-SFINCS",
            "notes": scenario.source,
            "assumptions": [
                "Ground height: Copernicus DEM GLO-30 (a surface model: buildings partly block water, as on the ground).",
                "Land cover: ESA WorldCover 2020, for how rough the ground is.",
                f"Rain falls evenly over the area, peaking mid-storm; {city.get('qinf_mm_h', 2)} mm per hour soaks into the ground.",
                "Drains and culverts are not modelled; blocked drains make real floods worse.",
                *([f"The sea is held at {city['tide_m']} m above mean sea level (high tide)."] if city.get("tide_m") is not None else []),
            ],
            "classes": CLASSES, "frameMinutes": 60, "res": res, "made": datetime.now(timezone.utc).isoformat(timespec="seconds"), "madeWith": made_with,
        },
        "frames": frames,
    }


def _iso(t) -> str:
    return np.datetime_as_string(np.datetime64(t, "s"), unit="s") + "Z"
