"""Builds and runs a SFINCS flood model for one area and one rain scenario with HydroMT-SFINCS.

SFINCS (Deltares, open source) solves simplified shallow-water equations on a grid: rain falls on the ground,
water flows downhill, ponds in low places, and drains to the sea where the area has a coast.
Output: water level on every cell every hour (sfincs_map.nc)."""
from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import hydromt_sfincs
import pandas as pd
from hydromt_sfincs import SfincsModel

from .storms import hyetograph

ROUGHNESS_TABLE = Path(hydromt_sfincs.__file__).parent / "data" / "lulc" / "esa_worldcover_mapping.csv"


@dataclass(frozen=True)
class Scenario:
    key: str
    title: str
    rain_mm: float
    hours: float
    start: pd.Timestamp
    source: str = ""


def scenario_from(key: str, cfg: dict) -> Scenario:
    return Scenario(key=key, title=cfg["title"], rain_mm=float(cfg["rain_mm"]), hours=float(cfg["hours"]),
                    start=pd.Timestamp(cfg.get("start", "2026-01-01T00:00:00")), source=cfg.get("source", ""))


def build(city: dict, sc: Scenario, catalog: Path, root: Path, after_hours: float = 12) -> SfincsModel:
    """Writes a ready-to-run SFINCS model to `root`."""
    if root.exists():
        shutil.rmtree(root)
    rain = hyetograph(sc.rain_mm, sc.hours, sc.start, after_hours=after_hours)
    tstart, tstop = rain.index[0], rain.index[-1]
    m = SfincsModel(root=str(root), mode="w+", data_libs=[str(catalog)], write_gis=False)
    m.setup_config(tref=tstart.strftime("%Y%m%d %H%M%S"), tstart=tstart.strftime("%Y%m%d %H%M%S"), tstop=tstop.strftime("%Y%m%d %H%M%S"),
                   dtmapout=3600, dtout=3600, dtmaxout=99999999, alpha=0.5, qinf=float(city.get("qinf_mm_h", 2)))
    m.setup_grid_from_region(region={"bbox": city["bbox"]}, res=float(city["res"]), crs="utm")
    m.setup_dep(datasets_dep=[{"elevtn": "dem"}])
    m.setup_config(zsini=start_level(city, float(m.grid["dep"].min())))
    m.setup_mask_active(zmin=-5)                                    # sea deeper than 5 m is left out
    if city.get("tide_m") is not None:
        m.setup_mask_bounds(btype="waterlevel", zmax=0.5)           # low cells at the edge exchange water with the sea
    else:
        m.setup_mask_bounds(btype="outflow")                        # inland: water leaves freely at the edges
    m.setup_manning_roughness(datasets_rgh=[{"lulc": "landcover", "reclass_table": str(ROUGHNESS_TABLE)}])
    csv = root / "rain.csv"
    root.mkdir(parents=True, exist_ok=True)
    rain.to_csv(csv)
    m.setup_precip_forcing(timeseries=str(csv))
    has_coast = city.get("tide_m") is not None and bool((m.mask == 2).any())
    if has_coast:                                                   # the sea held at a high-tide level all run
        times = pd.date_range(tstart, tstop, freq="1h")
        m.setup_waterlevel_forcing(timeseries=pd.DataFrame({1: [float(city["tide_m"])] * len(times)}, index=times),
                                   locations=_coast_point(m))
    m.write()
    return m


def start_level(city: dict, lowest_ground: float) -> float:
    """The water level everywhere at the start. At the coast: the level the sea is held at (not 0 m then rising, which
    would push a false surge onto low ground). Inland: below the lowest ground, so the model starts dry even where
    the land lies below sea level (SFINCS's default of 0 m would fill every such cell before any rain)."""
    if city.get("tide_m") is not None:
        return float(city["tide_m"])
    return min(0.0, round(lowest_ground - 1.0, 2))


def _coast_point(m: SfincsModel):
    """One water-level point at the middle of the coastal boundary cells."""
    import geopandas as gpd
    import numpy as np
    from shapely.geometry import Point
    iy, ix = np.where(m.mask.values == 2)
    x = float(m.mask.raster.xcoords.values[ix].mean())
    y = float(m.mask.raster.ycoords.values[iy].mean())
    return gpd.GeoDataFrame(index=[1], geometry=[Point(x, y)], crs=m.crs)


def run(root: Path, sfincs_bin: str | None = None) -> Path:
    """Runs SFINCS in `root`: a local program (SFINCS_BIN, built by build_sfincs.sh) or a Docker image you chose and
    pinned (SFINCS_IMAGE, e.g. deltares/sfincs-cpu@sha256:...). A moving tag such as :latest is refused, so a model
    run can always be repeated with the same model code."""
    exe = sfincs_bin or os.environ.get("SFINCS_BIN")
    image = os.environ.get("SFINCS_IMAGE", "")
    if exe:
        cmd = [exe]
    elif image:
        if "@sha256:" not in image and (":" not in image.rsplit("/", 1)[-1] or image.endswith(":latest")):
            raise RuntimeError(f"SFINCS_IMAGE must name a fixed version (a tag other than latest, or @sha256:...), not {image!r}.")
        if not shutil.which("docker"):
            raise RuntimeError("SFINCS_IMAGE is set but Docker is not installed.")
        cmd = ["docker", "run", "--rm", "-v", f"{root.resolve()}:/data", image]
    else:
        raise RuntimeError("SFINCS not found: run sh modelling/build_sfincs.sh and set SFINCS_BIN, or set SFINCS_IMAGE to a pinned Docker image.")
    log = root / "sfincs.log"
    with open(log, "w") as f:
        subprocess.run(cmd, cwd=root, stdout=f, stderr=subprocess.STDOUT, check=True)
    out = root / "sfincs_map.nc"
    if not out.exists():
        raise RuntimeError(f"SFINCS produced no output; see {log}")
    return out
