"""Satellite outline tool on made-up shapes (not a real flood): three dates, in a projected coordinate system,
with a non-flood feature to filter out. Checks reprojection, filtering, areas, order and size."""
import json
import sys
from pathlib import Path

import geopandas as gpd
from shapely.geometry import Point

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import prepare_extent  # noqa: E402

UTM = 32631   # UTM zone 31N (Ghana/Nigeria border region)


def shapes(tmp: Path, radius_m: float, name: str) -> Path:
    centre = (380000, 600000)
    gdf = gpd.GeoDataFrame({"obj_type": ["Flooded area", "Road"]},
                           geometry=[Point(centre).buffer(radius_m, 64), Point(centre[0] + 9000, centre[1]).buffer(500)], crs=UTM)
    p = tmp / name
    gdf.to_file(p, driver="GPKG")
    return p


def test_bundle_from_three_dates(tmp_path):
    files = {"2024-09-17": shapes(tmp_path, 3000, "b.gpkg"), "2024-09-11": shapes(tmp_path, 2000, "a.gpkg"), "2024-09-23": shapes(tmp_path, 1500, "c.gpkg")}
    out = tmp_path / "replay.json"
    prepare_extent.main(["--id", "test-outlines", "--title", "Test outlines (not a real flood)", "--country", "GH", "--source", "made-up shapes for testing",
                         "--filter", "obj_type=Flooded area", "--out", str(out)] + [f"{d}={p}" for d, p in files.items()])
    b = json.loads(out.read_text())
    assert b["app"] == "OpenTracker-replay" and b["replay"]["kind"] == "satellite"
    ts = [f["t"][:10] for f in b["frames"]]
    assert ts == sorted(ts) == ["2024-09-11", "2024-09-17", "2024-09-23"]
    km2 = [f["km2"] for f in b["frames"]]
    for got, r in zip(km2, [2000, 3000, 1500], strict=True):
        assert abs(got - 3.14159 * r * r / 1e6) / got < 0.02     # the road was filtered out
    lon, lat = b["frames"][0]["fc"]["features"][0]["geometry"]["coordinates"][0][0][0]
    assert 1.5 < lon < 2.5 and 5.0 < lat < 5.8                    # reprojected to longitude/latitude
    assert all(len(json.dumps(f["fc"])) <= prepare_extent.FRAME_BUDGET for f in b["frames"])
