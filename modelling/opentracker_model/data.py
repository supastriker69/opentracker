"""Open input data for a model area: ground height and land cover, downloaded once and cut to the area.

Ground height: Copernicus DEM GLO-30 (30 m), free and open, on AWS Open Data (no account needed).
Land cover:   ESA WorldCover 2020 (10 m), CC BY 4.0, on AWS Open Data. Used for surface roughness.
Both are written as GeoTIFFs plus a HydroMT data catalog that points at them."""
from __future__ import annotations

import math
from pathlib import Path

import rasterio
import requests
import yaml
from rasterio.merge import merge

DEM_URL = "https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"
WORLDCOVER_URL = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v100/2020/map/ESA_WorldCover_10m_2020_v100_{tile}_Map.tif"


def _hemi(v: int, pos: str, neg: str, width: int) -> str:
    return f"{pos if v >= 0 else neg}{abs(v):0{width}d}"


def dem_tiles(bbox: list[float]) -> list[str]:
    """Names of the 1-degree Copernicus DEM tiles covering bbox (west, south, east, north)."""
    w, s, e, n = bbox
    names = []
    for lat in range(math.floor(s), math.ceil(n)):
        for lon in range(math.floor(w), math.ceil(e)):
            names.append(f"Copernicus_DSM_COG_10_{_hemi(lat, 'N', 'S', 2)}_00_{_hemi(lon, 'E', 'W', 3)}_00_DEM")
    return names


def worldcover_tiles(bbox: list[float]) -> list[str]:
    """Names of the 3-degree ESA WorldCover tiles covering bbox."""
    w, s, e, n = bbox
    tiles = []
    for lat in range(math.floor(s / 3) * 3, math.ceil(n / 3) * 3, 3):
        for lon in range(math.floor(w / 3) * 3, math.ceil(e / 3) * 3, 3):
            tiles.append(_hemi(lat, "N", "S", 2) + _hemi(lon, "E", "W", 3))
    return tiles


def _download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")
    with requests.get(url, stream=True, timeout=120) as r:
        if r.status_code == 404:
            raise FileNotFoundError(url)   # e.g. a tile that is all sea
        r.raise_for_status()
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    tmp.rename(dest)
    return dest


def _mosaic(paths: list[Path], bbox: list[float], dest: Path) -> Path:
    """Merge tiles and cut them to the area (with a small margin)."""
    pad = 0.01
    srcs = [rasterio.open(p) for p in paths]
    try:
        data, transform = merge(srcs, bounds=(bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad))
        profile = srcs[0].profile.copy()
    finally:
        for s in srcs:
            s.close()
    profile.update(driver="GTiff", height=data.shape[1], width=data.shape[2], transform=transform, compress="deflate", tiled=True)
    for key in ("blockxsize", "blockysize"):
        profile.pop(key, None)
    with rasterio.open(dest, "w", **profile) as out:
        out.write(data)
    return dest


def fetch_inputs(bbox: list[float], folder: Path) -> Path:
    """Downloads and cuts the inputs, then writes data_catalog.yml for HydroMT. Returns the catalog path."""
    folder.mkdir(parents=True, exist_ok=True)
    dem_paths = []
    for name in dem_tiles(bbox):
        try:
            dem_paths.append(_download(DEM_URL.format(name=name), folder / "tiles" / f"{name}.tif"))
        except FileNotFoundError:
            continue
    if not dem_paths:
        raise RuntimeError("No ground-height tiles found for this area.")
    lc_paths = [_download(WORLDCOVER_URL.format(tile=t), folder / "tiles" / f"worldcover_{t}.tif") for t in worldcover_tiles(bbox)]
    dem = _mosaic(dem_paths, bbox, folder / "dem.tif")
    lc = _mosaic(lc_paths, bbox, folder / "landcover.tif")
    return write_catalog(folder, dem, lc)


def write_catalog(folder: Path, dem: Path, landcover: Path) -> Path:
    """A HydroMT data catalog naming the two inputs. Land-cover classes map to Manning roughness via the
    ESA WorldCover table shipped with HydroMT-SFINCS."""
    catalog = {
        "dem": {"data_type": "RasterDataset", "driver": "raster", "path": str(dem.resolve()),
                "meta": {"category": "topography", "source": "Copernicus DEM GLO-30", "license": "Copernicus DEM licence (free and open)"},
                "rename": {Path(dem).stem: "elevtn"}},
        "landcover": {"data_type": "RasterDataset", "driver": "raster", "path": str(landcover.resolve()),
                      "meta": {"category": "landuse", "source": "ESA WorldCover 2020", "license": "CC BY 4.0"},
                      "rename": {Path(landcover).stem: "landuse"}},
    }
    path = folder / "data_catalog.yml"
    path.write_text(yaml.safe_dump(catalog, sort_keys=False))
    return path
