"""End-to-end check of the modelling pipeline on a made-up test terrain (not a real place):
a slope down to a sea, a valley and a hollow. Builds the model with HydroMT-SFINCS, runs the real SFINCS
program (SFINCS_BIN), and checks the replay: water appears, spreads, then drains away.

    SFINCS_BIN=/path/to/sfincs python -m pytest modelling/tests -q"""
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import rasterio
from rasterio.transform import from_origin

from opentracker_model.data import dem_tiles, worldcover_tiles, write_catalog
from opentracker_model.frames import FRAME_BUDGET, bundle, classify
from opentracker_model.model import Scenario, build, run
from opentracker_model.storms import hyetograph

BBOX = [10.0, 0.0, 10.03, 0.03]   # about 3.3 km square; only the shapes below matter


def make_terrain(folder: Path) -> Path:
    n, step = 120, 0.03 / 110
    yy, xx = np.mgrid[0:n, 0:n] / (n - 1)          # yy = 0 at the north edge, 1 at the south
    z = 12 * (1 - yy) - 1.5                          # slopes down to the south
    z -= 3.0 * np.exp(-((xx - 0.5) / 0.06) ** 2)     # a valley running north to south
    z -= 2.5 * np.exp(-(((xx - 0.25) / 0.08) ** 2 + ((yy - 0.45) / 0.08) ** 2))   # a hollow
    z[yy > 0.92] = -3.0                              # the sea
    tf = from_origin(BBOX[0] - 0.002, BBOX[3] + 0.002, step, step)
    prof = dict(driver="GTiff", height=n, width=n, count=1, crs="EPSG:4326", transform=tf)
    with rasterio.open(folder / "dem.tif", "w", dtype="float32", nodata=-9999, **prof) as f:
        f.write(z.astype("float32"), 1)
    with rasterio.open(folder / "landcover.tif", "w", dtype="uint8", nodata=0, **prof) as f:
        f.write(np.full((n, n), 50, dtype="uint8"), 1)   # 50 = built-up in ESA WorldCover
    return write_catalog(folder, folder / "dem.tif", folder / "landcover.tif")


def test_tile_names():
    assert dem_tiles([-0.3, 5.53, -0.15, 5.7]) == ["Copernicus_DSM_COG_10_N05_00_W001_00_DEM"]
    assert dem_tiles([3.3, 6.4, 3.5, 6.62]) == ["Copernicus_DSM_COG_10_N06_00_E003_00_DEM"]
    assert worldcover_tiles([-0.3, 5.53, -0.15, 5.7]) == ["N03W003"]
    assert worldcover_tiles([3.3, 6.4, 3.5, 6.62]) == ["N06E003"]


def test_hyetograph_conserves_rain():
    s = hyetograph(169.2, 12, pd.Timestamp("2026-06-29T06:00"))
    rain_mm = (s * 10 / 60).sum()
    assert abs(rain_mm - 169.2) < 1e-6
    assert s.idxmax() > s.index[0] and s.iloc[-1] == 0


def test_depth_classes():
    assert classify(np.array([0.05, 0.2, 0.45, 0.9, 2.0])).tolist() == [0, 1, 2, 3, 4]


@pytest.mark.skipif(not os.environ.get("SFINCS_BIN"), reason="needs the SFINCS program (SFINCS_BIN)")
def test_model_end_to_end(tmp_path):
    catalog = make_terrain(tmp_path)
    city = {"name": "Test terrain (not a real place)", "country": "GH", "areas": [], "bbox": BBOX, "res": 50, "tide_m": 0.5, "qinf_mm_h": 2}
    sc = Scenario(key="test", title="Test storm: 120 mm in 3 hours", rain_mm=120, hours=3, start=pd.Timestamp("2026-06-29T06:00"))
    build(city, sc, catalog, tmp_path / "model")
    b = bundle(run(tmp_path / "model"), "test", city, sc, "test")
    frames = b["frames"]
    assert len(frames) >= 10
    wet = [f["km2"] for f in frames]
    peak = int(np.argmax(wet))
    assert wet[peak] > 0.05, "rain should flood the valley and the hollow"
    assert 0 < peak < len(wet) - 1, "the flood should grow, then shrink"
    assert wet[-1] < wet[peak]
    for f in frames:
        assert len(json.dumps(f["fc"], separators=(",", ":"))) <= FRAME_BUDGET
        for feat in f["fc"]["features"]:
            assert feat["properties"]["k"] in (1, 2, 3, 4)
            lon, lat = feat["geometry"]["coordinates"][0][0][0] if feat["geometry"]["type"] == "MultiPolygon" else feat["geometry"]["coordinates"][0][0]
            assert BBOX[0] - 0.01 < lon < BBOX[2] + 0.01 and BBOX[1] - 0.01 < lat < BBOX[3] + 0.01
    (tmp_path / "bundle.json").write_text(json.dumps(b))
    out = os.environ.get("TEST_BUNDLE_OUT")
    if out:
        Path(out).write_text(json.dumps(b, separators=(",", ":")))
