"""How well a flood model's map matches the water a satellite saw: scores a model replay (from the SFINCS city model
or the in-browser projection) against a satellite replay (sentinel2_flood.py, sentinel1_flood.js or prepare_extent.py).

Both are drawn onto the same grid (metres, in the local UTM zone) over the area both cover, and compared:
  csi        hits / (hits + misses + false alarms): 1 is perfect; 0.5 or more is good for a model against satellite
             outlines, which miss water under trees and between buildings and see only the moment of the overpass.
  hit_rate   share of the water the satellite saw that the model also floods.
  false_alarm_ratio  share of the model's flooding the satellite did not see.

    python satellite/compare_extent.py replays/accra-jun29-2026.json replays/accra-2026-06-30-s1.json --out report.json

By default each satellite date is compared with the model's largest extent over the whole run (the model's
storm is a scenario, so its clock need not match the real one); --nearest compares with the model hour closest
to the satellite's date instead."""
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

import numpy as np
from pyproj import CRS, Transformer
from rasterio import features
from rasterio.transform import from_origin
from shapely.geometry import box, shape
import shapely
from shapely.ops import unary_union


def reproject(project, geom):
    """geom with every point passed through project(x, y) -> (x, y), e.g. a pyproj Transformer's transform"""
    return shapely.transform(geom, lambda xy: np.column_stack(project(xy[:, 0], xy[:, 1])))


def load(path: str) -> dict:
    b = json.loads(Path(path).read_text())
    if b.get("app") != "OpenTracker-replay" or not b.get("frames"):
        raise SystemExit(f"{path} is not an Open Tracker replay file with frames")
    return b


def frame_shape(frame: dict):
    """all water in a frame (every depth class) as one geometry in longitude/latitude"""
    geoms = [shape(f["geometry"]) for f in frame.get("fc", {}).get("features", []) if f.get("geometry")]
    return unary_union(geoms).buffer(0) if geoms else None


def _when(t: str) -> datetime:
    return datetime.fromisoformat(t.replace("Z", "+00:00"))


def common_area(a: dict, b: dict):
    shared = box(*a["replay"]["bbox"]).intersection(box(*b["replay"]["bbox"]))
    if shared.is_empty or shared.area == 0:
        raise SystemExit("the two replays do not cover the same area")
    return shared


def grid_for(area, res: float):
    """a grid of res-metre cells over the area, in its UTM zone"""
    lon, lat = area.centroid.x, area.centroid.y
    utm = CRS.from_epsg((32600 if lat >= 0 else 32700) + int((lon + 180) // 6) + 1)
    to_utm = Transformer.from_crs(4326, utm, always_xy=True).transform
    x0, y0, x1, y1 = reproject(to_utm, area).bounds
    w, h = max(1, int(np.ceil((x1 - x0) / res))), max(1, int(np.ceil((y1 - y0) / res)))
    return {"to_utm": to_utm, "transform": from_origin(x0, y1, res, res), "shape": (h, w), "res": res, "area": reproject(to_utm, area)}


def burn(geom, grid) -> np.ndarray:
    if geom is None or geom.is_empty:
        return np.zeros(grid["shape"], dtype=bool)
    g = reproject(grid["to_utm"], geom).intersection(grid["area"])
    if g.is_empty:
        return np.zeros(grid["shape"], dtype=bool)
    return features.rasterize([(g, 1)], out_shape=grid["shape"], transform=grid["transform"], fill=0, dtype="uint8").astype(bool)


def score(model: np.ndarray, seen: np.ndarray, res: float) -> dict:
    hits, misses, false = int((model & seen).sum()), int((~model & seen).sum()), int((model & ~seen).sum())
    km2 = res * res / 1e6
    return {"csi": round(hits / max(1, hits + misses + false), 3), "hit_rate": round(hits / max(1, hits + misses), 3),
            "false_alarm_ratio": round(false / max(1, hits + false), 3),
            "model_km2": round(float(model.sum()) * km2, 3), "satellite_km2": round(float(seen.sum()) * km2, 3)}


def compare(model: dict, sat: dict, res: float = 20.0, nearest: bool = False) -> dict:
    grid = grid_for(common_area(model, sat), res)
    model_frames = [(f["t"], burn(frame_shape(f), grid)) for f in model["frames"]]
    largest = np.logical_or.reduce([m for _, m in model_frames])
    out = []
    for f in sat["frames"]:
        if nearest:
            t, m = min(model_frames, key=lambda tm: abs((_when(tm[0]) - _when(f["t"])).total_seconds()))
        else:
            t, m = "largest extent", largest
        out.append({"satellite": f["t"], "model": t, **score(m, burn(frame_shape(f), grid), res)})
    return {"model": model["replay"]["id"], "satellite": sat["replay"]["id"], "res_m": res, "dates": out,
            "best_csi": max(d["csi"] for d in out)}


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("model", help="model replay file")
    p.add_argument("satellite", help="satellite replay file")
    p.add_argument("--res", type=float, default=20.0, help="grid cell size in metres (default 20)")
    p.add_argument("--nearest", action="store_true", help="compare with the model hour nearest each satellite date")
    p.add_argument("--min-csi", type=float, help="exit with an error when no date reaches this CSI")
    p.add_argument("--out", help="write the report here as JSON")
    a = p.parse_args(argv)
    if not 1 <= a.res <= 500:
        raise SystemExit("--res must be between 1 and 500 metres")
    r = compare(load(a.model), load(a.satellite), a.res, a.nearest)
    for d in r["dates"]:
        print(f"{d['satellite'][:10]} vs model {d['model']}: CSI {d['csi']:.2f}, hit rate {d['hit_rate']:.2f}, "
              f"false alarms {d['false_alarm_ratio']:.2f} ({d['model_km2']} km² modelled, {d['satellite_km2']} km² seen)")
    if a.out:
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text(json.dumps(r, indent=1) + "\n")
    if a.min_csi is not None and r["best_csi"] < a.min_csi:
        print(f"FAIL best CSI {r['best_csi']} < {a.min_csi}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
