"""FLOODSIM, the small flood model that runs in people's browsers, measured against SFINCS (Deltares), the full
model used for the city flood replays.

Both models get exactly the same ground (the bed levels SFINCS itself uses, cell for cell), the same rain, the same
surface roughness, the same sea level and no soaking-in, on made-up terrains chosen to exercise the things that
matter: water running off slopes, pooling in hollows, spreading over flat streets, and the sea at the coast.
The scores compare where and when the water is, and how much of it there is:

  csi          Critical Success Index of the flooded area (ankle deep, 0.15 m, or more at any hour): hits divided by
               hits + misses + false alarms. 1 is perfect. Published comparisons of 2D flood models report 0.65–0.9;
               on flat ground, thin sheets of water lying near the 0.15 m line lower it although the water agrees
               (see docs/VALIDATION.md), so the bar is 0.65.
  csi_knee     The same at knee depth (0.3 m), where water starts to be dangerous to walk through. Reported only.
  area_ratio   FLOODSIM's largest flooded area divided by SFINCS's.
  volume_ratio FLOODSIM's largest volume of water on the land divided by SFINCS's.
  arrival_shift_h  Hours between the two models first flooding half their largest area: when the flood arrives.
               (The hour of the largest area is reported too, but a filled basin stays near its largest area for
               hours, so that hour moves with tiny differences and is not scored.)
  depth_mae_m  Mean difference of the deepest water, over cells either model floods.

    python -m opentracker_model.benchmark [--out docs/validation/floodsim-vs-sfincs.json]

Needs SFINCS (SFINCS_BIN, see build_sfincs.sh) and Node.js. The thresholds that CI enforces are in THRESHOLDS."""
from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd
import rasterio
import xarray as xr
from rasterio.transform import from_origin

from .data import write_catalog
from .model import Scenario, build, run

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / "modelling" / "floodsim_run.mjs"
WET = 0.15          # m: flooded from ankle depth, the same line both apps draw
KNEE = 0.30         # m: knee deep
BUILT_UP = 50       # ESA WorldCover class: built-up
MANNING = 0.100     # roughness HydroMT-SFINCS gives built-up land (its esa_worldcover_mapping.csv)
THRESHOLDS = {"csi": 0.65, "area_ratio": (0.75, 1.33), "volume_ratio": (0.75, 1.33), "arrival_shift_h": 1, "depth_mae_m": 0.15}


# ---------- made-up terrains: heights in metres on an n x n grid, row 0 at the north ----------

def _axes(n: int):
    yy, xx = np.mgrid[0:n, 0:n] / (n - 1)
    return xx, yy


def coast(n: int) -> np.ndarray:
    """land sloping to the sea in the south, a river valley and a hollow behind the beach"""
    xx, yy = _axes(n)
    z = 12 * (1 - yy) - 1.5
    z -= 3.0 * np.exp(-((xx - 0.5) / 0.06) ** 2)
    z -= 2.5 * np.exp(-(((xx - 0.25) / 0.08) ** 2 + ((yy - 0.45) / 0.08) ** 2))
    z[yy > 0.92] = -3.0
    return z


def basin(n: int) -> np.ndarray:
    """an inland bowl with a low outlet at the east: water pools, then spills out"""
    xx, yy = _axes(n)
    z = 20 + 8 * ((xx - 0.45) ** 2 + (yy - 0.5) ** 2)
    z -= 1.5 * np.exp(-(((xx - 0.45) / 0.15) ** 2 + ((yy - 0.5) / 0.15) ** 2))
    z -= 2.4 * np.exp(-((yy - 0.5) / 0.05) ** 2) * (xx > 0.45)       # a channel out to the east
    return z


def streets(n: int) -> np.ndarray:
    """nearly flat inland town ground (0.3 % slope, the low end below sea level) with a grid of streets 0.4 m below
    the blocks, and random bumps. Ground below 0 m away from any sea also checks that inland models start dry."""
    xx, yy = _axes(n)
    z = 8 - 0.3 / 100 * (xx + yy) * n * 25
    k = np.arange(n)
    street = (k % 8 == 0)
    z -= 0.4 * (street[None, :] | street[:, None])
    z += np.random.default_rng(7).normal(0, 0.05, z.shape)
    return z


def gully(n: int) -> np.ndarray:
    """a steep V-shaped valley draining north to south: water runs off fast and leaves"""
    xx, yy = _axes(n)
    return 60 * (1 - yy) + 25 * np.abs(xx - 0.5) + 2


@dataclass
class Case:
    key: str
    terrain: Callable[[int], np.ndarray]
    rain_mm: float
    hours: float
    sea_m: float | None = None
    about: str = ""
    extra: dict = field(default_factory=dict)


CASES = [
    Case("coast", coast, 120, 3, sea_m=0.5, about="coast with a river valley and a hollow; sea at high tide"),
    Case("basin", basin, 150, 6, about="inland bowl that fills and spills"),
    Case("streets", streets, 100, 3, about="flat inland town, partly below sea level, with streets lower than the blocks"),
    Case("gully", gully, 120, 3, about="steep valley: fast runoff"),
]
BBOX = [10.0, 0.0, 10.03, 0.03]     # about 3.3 km square at the equator; only the shapes matter
N = 120


def write_terrain(case: Case, folder: Path) -> Path:
    z = case.terrain(N)
    step = (BBOX[2] - BBOX[0] + 0.004) / N
    prof = dict(driver="GTiff", height=N, width=N, count=1, crs="EPSG:4326", transform=from_origin(BBOX[0] - 0.002, BBOX[3] + 0.002, step, step))
    folder.mkdir(parents=True, exist_ok=True)
    with rasterio.open(folder / "dem.tif", "w", dtype="float32", nodata=-9999, **prof) as f:
        f.write(z.astype("float32"), 1)
    with rasterio.open(folder / "landcover.tif", "w", dtype="uint8", nodata=0, **prof) as f:
        f.write(np.full((N, N), BUILT_UP, dtype="uint8"), 1)
    return write_catalog(folder, folder / "dem.tif", folder / "landcover.tif")


# ---------- the two models ----------

def run_sfincs(case: Case, folder: Path, after_hours: float = 9) -> dict:
    catalog = write_terrain(case, folder / "inputs")
    city = {"name": case.key, "country": "GH", "areas": [], "bbox": BBOX, "res": 50, "qinf_mm_h": 0, "tide_m": case.sea_m}
    sc = Scenario(key=case.key, title=case.key, rain_mm=case.rain_mm, hours=case.hours, start=pd.Timestamp("2026-06-29T00:00"))
    build(city, sc, catalog, folder / "sfincs", after_hours=after_hours)
    with xr.open_dataset(run(folder / "sfincs")) as ds:
        return {"zb": ds["zb"].values.astype("float64"),
                "msk": np.nan_to_num(ds["msk"].values, nan=0).astype("int8"),
                "h": np.nan_to_num(ds["h"].values.astype("float64"), nan=0.0),   # dry cells are NaN
                "cell": float(abs(ds["x"].values[0, 1] - ds["x"].values[0, 0])), "hours": len(ds["time"]) - 1}


def run_floodsim(case: Case, sf: dict, folder: Path) -> dict:
    ny, nx = sf["zb"].shape
    dem = np.where(sf["msk"] > 0, sf["zb"], np.nan)
    low = (case.sea_m - 5.0) if case.sea_m is not None else np.nanmin(dem) - 5.0
    dem = np.nan_to_num(dem, nan=low)            # cells SFINCS leaves out are deep sea: FLOODSIM finds them as sea
    spec = {"dem": dem.ravel().round(4).tolist(), "w": nx, "h": ny, "cell": sf["cell"], "rainMm": case.rain_mm, "stormHours": case.hours,
            "hours": sf["hours"], "runoff": 1, "manning": MANNING, "seaLevel": case.sea_m, "frameEvery": 3600}
    (folder / "floodsim-in.json").write_text(json.dumps(spec))
    subprocess.run(["node", str(RUNNER), str(folder / "floodsim-in.json"), str(folder / "floodsim-out.json")], check=True)
    out = json.loads((folder / "floodsim-out.json").read_text())
    return {"fixed": np.array(out["fixed"], dtype="int8").reshape(ny, nx),
            "h": np.array([f["depth"] for f in out["frames"]], dtype="float64").reshape(-1, ny, nx), "balance": out["balance"]}


# ---------- scores ----------

def scores(sf: dict, fs: dict) -> dict:
    """agreement on the land cells both models treat as land (not sea, not left out)"""
    land = (sf["msk"] == 1) & (fs["fixed"] == 0)
    a = sf["cell"] ** 2
    hs, hf = sf["h"] * land, fs["h"][: len(sf["h"])] * land
    wet_s, wet_f = (hs >= WET).any(axis=0), (hf >= WET).any(axis=0)
    hits, misses, false = int((wet_s & wet_f).sum()), int((wet_s & ~wet_f).sum()), int((~wet_s & wet_f).sum())
    area_s, area_f = (hs >= WET).sum(axis=(1, 2)) * a / 1e6, (hf >= WET).sum(axis=(1, 2)) * a / 1e6
    vol_s, vol_f = hs.sum(axis=(1, 2)) * a, hf.sum(axis=(1, 2)) * a
    either = wet_s | wet_f
    return {
        "csi": _csi(wet_s, wet_f),
        "csi_knee": _csi((hs >= KNEE).any(axis=0), (hf >= KNEE).any(axis=0)),
        "hit_rate": round(hits / max(1, hits + misses), 3),
        "false_alarm_ratio": round(false / max(1, hits + false), 3),
        "peak_km2": {"sfincs": round(float(area_s.max()), 3), "floodsim": round(float(area_f.max()), 3)},
        "area_ratio": round(float(area_f.max() / max(area_s.max(), 1e-9)), 3),
        "peak_m3": {"sfincs": round(float(vol_s.max())), "floodsim": round(float(vol_f.max()))},
        "volume_ratio": round(float(vol_f.max() / max(vol_s.max(), 1e-9)), 3),
        "peak_hour": {"sfincs": int(area_s.argmax()), "floodsim": int(area_f.argmax())},
        "arrival_hour": {"sfincs": _arrival(area_s), "floodsim": _arrival(area_f)},
        "arrival_shift_h": int(abs(_arrival(area_s) - _arrival(area_f))),
        "depth_mae_m": round(float(np.abs(hs.max(axis=0) - hf.max(axis=0))[either].mean()) if either.any() else 0.0, 3),
        "area_km2_by_hour": {"sfincs": [round(float(v), 3) for v in area_s], "floodsim": [round(float(v), 3) for v in area_f]},
        "land_cells": int(land.sum()),
    }


def _csi(a: np.ndarray, b: np.ndarray) -> float:
    hits, union = int((a & b).sum()), int((a | b).sum())
    return round(hits / union, 3) if union else 1.0


def _arrival(area: np.ndarray) -> int:
    """the first hour with at least half the largest flooded area"""
    return int(np.argmax(area >= 0.5 * area.max())) if area.max() > 0 else 0


def failures(s: dict) -> list[str]:
    """which thresholds a case misses (empty when it passes)"""
    t, out = THRESHOLDS, []
    if s["csi"] < t["csi"]:
        out.append(f"csi {s['csi']} < {t['csi']}")
    for k in ("area_ratio", "volume_ratio"):
        lo, hi = t[k]
        if not lo <= s[k] <= hi:
            out.append(f"{k} {s[k]} outside {lo}–{hi}")
    if s["arrival_shift_h"] > t["arrival_shift_h"]:
        out.append(f"arrival_shift_h {s['arrival_shift_h']} > {t['arrival_shift_h']}")
    if s["depth_mae_m"] > t["depth_mae_m"]:
        out.append(f"depth_mae_m {s['depth_mae_m']} > {t['depth_mae_m']}")
    return out


def compare(case: Case, folder: Path) -> dict:
    sf = run_sfincs(case, folder)
    fs = run_floodsim(case, sf, folder)
    s = scores(sf, fs)
    return {"case": case.key, "about": case.about, "rain": f"{case.rain_mm:g} mm in {case.hours:g} h",
            "sea_m": case.sea_m, **s, "fails": failures(s)}


def _pair(both: dict, fmt: str = "{}") -> str:
    """SFINCS's figure / FLOODSIM's"""
    return fmt.format(both["sfincs"]) + " / " + fmt.format(both["floodsim"])


def table(results: list[dict]) -> str:
    rows = ["| Terrain | Rain | CSI (ankle / knee) | Flooded km² (SFINCS / FLOODSIM) | Water m³ (SFINCS / FLOODSIM) "
            "| Flood arrives (hour) | Largest at (hour) | Depth difference |",
            "|---|---|---|---|---|---|---|---|"]
    for r in results:
        rows.append(f"| {r['case']}: {r['about']} | {r['rain']} | {r['csi']:.2f} / {r['csi_knee']:.2f} | {_pair(r['peak_km2'], '{:.2f}')} | "
                    f"{_pair(r['peak_m3'], '{:,}')} | {_pair(r['arrival_hour'])} | {_pair(r['peak_hour'])} | "
                    f"{r['depth_mae_m'] * 100:.0f} cm |")
    return "\n".join(rows)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", help="write the full results here as JSON")
    p.add_argument("--case", action="append", help="only these terrains (default: all)")
    a = p.parse_args(argv)
    chosen = [c for c in CASES if not a.case or c.key in a.case]
    with tempfile.TemporaryDirectory() as tmp:
        results = [compare(c, Path(tmp) / c.key) for c in chosen]
    print(table(results))
    if a.out:
        Path(a.out).parent.mkdir(parents=True, exist_ok=True)
        Path(a.out).write_text(json.dumps({"thresholds": THRESHOLDS, "results": results}, indent=1) + "\n")
    bad = [f"{r['case']}: {', '.join(r['fails'])}" for r in results if r["fails"]]
    for b in bad:
        print("FAIL", b)
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
