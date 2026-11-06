"""The whole Sentinel-2 run, offline: a fake STAC catalogue serves made-up band images, so the scene reading, cloud
masking, removal of normal water, and the replay file are checked exactly, without the network."""
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import sentinel2_flood as s2  # noqa: E402

BBOX = [3.30, 6.40, 3.33, 6.43]          # about 3.3 km square near Lagos, in UTM zone 31N
ORIGIN = (532000, 712000)                 # a 20 m grid that covers BBOX (533176-536491 E, 707431-710750 N) in EPSG:32631
N = 260                                   # BBOX covers about columns 59-224 and rows 63-228 of this grid
RIVER = (slice(None), slice(200, 210))    # normal water, there before the flood: 10 pixels wide
FLOOD = (slice(100, 150), slice(80, 130))   # 50 x 50 pixels of 20 m = 1.0 km² of flood water


def scene(folder: Path, name: str, flood: bool, cloud: bool = False, crs: str = "EPSG:32631") -> dict:
    """green, swir and scene-classification images for one tile, and its STAC item"""
    green = np.full((N, N), 800, "uint16")
    swir = np.full((N, N), 1600, "uint16")     # dry land: MNDWI = -0.33
    for part in [RIVER] + ([FLOOD] if flood else []):
        green[part], swir[part] = 1200, 300    # water: MNDWI = 0.6
    scl = np.full((N, N), 4, "uint8")          # 4 = vegetation
    if cloud:
        scl[:, :200] = 9                       # most of the area under cloud
    prof = dict(driver="GTiff", height=N, width=N, count=1, crs=crs, transform=from_origin(*ORIGIN, 20, 20))
    assets = {}
    for band, data in [("green", green), ("swir16", swir), ("scl", scl)]:
        path = folder / f"{name}-{band}.tif"
        with rasterio.open(path, "w", dtype=data.dtype, **prof) as f:
            f.write(data, 1)
        assets[band] = {"href": f"https://example.org/{path.name}"}
    day = name.split("_")[0]
    return {"id": name, "properties": {"datetime": f"{day}T10:20:00Z", "eo:cloud_cover": 50 if cloud else 5}, "assets": assets}


@pytest.fixture
def catalogue(tmp_path, monkeypatch):
    """a STAC search that answers from local scenes; band links resolve to the local files"""
    items = {"before": [], "after": []}

    def post(url, json, timeout):
        assert url == "https://stac.example.org/search" and json["collections"] == ["sentinel-2-l2a"]
        start = json["datetime"][:10]
        found = items["before"] if start < "2026-07-01" else items["after"]
        return SimpleNamespace(raise_for_status=lambda: None, json=lambda: {"features": found})

    real_href = s2.asset_href
    monkeypatch.setattr(s2, "asset_href", lambda item, band: str(tmp_path / real_href(item, band).rsplit("/", 1)[1]))
    import requests
    monkeypatch.setattr(requests, "post", post)
    return items


ARGS = ["--id", "test-lagos", "--title", "Test floods", "--country", "ng", "--bbox", ",".join(map(str, BBOX)),
        "--after", "2026-07-01/2026-07-20", "--before", "2026-05-01/2026-06-15", "--stac", "https://stac.example.org"]


def test_a_flood_is_outlined_without_normal_water_or_cloudy_days(tmp_path, catalogue, capsys):
    catalogue["before"] += [scene(tmp_path, "2026-06-01_a", flood=False), scene(tmp_path, "2026-06-10_a", flood=False, cloud=True)]
    catalogue["after"] += [
        scene(tmp_path, "2026-07-05_a", flood=True),
        scene(tmp_path, "2026-07-05_b", flood=False, crs="EPSG:32632"),   # a neighbouring UTM zone on the same day: skipped
        scene(tmp_path, "2026-07-10_a", flood=True, cloud=True),          # too cloudy: skipped
        scene(tmp_path, "2026-07-15_a", flood=False),                     # only the river: nothing to show
    ]
    out = tmp_path / "replays" / "test-lagos.json"
    s2.main(ARGS + ["--out", str(out)])
    said = capsys.readouterr().out
    assert "2026-07-10: only" in said and "clear of cloud; skipped" in said
    assert "2026-07-15: no flood water seen" in said
    b = json.loads(out.read_text())
    assert b["replay"]["id"] == "test-lagos" and b["replay"]["c"] == "NG" and b["replay"]["kind"] == "satellite"
    assert any("removed" in x for x in b["replay"]["assumptions"])
    assert [f["t"][:10] for f in b["frames"]] == ["2026-07-05"]
    assert b["frames"][0]["km2"] == pytest.approx(1.0, rel=0.01), "the river is not counted, only the flood"


def test_without_a_dry_period_all_water_counts(tmp_path, catalogue):
    catalogue["after"] += [scene(tmp_path, "2026-07-05_a", flood=True)]
    out = tmp_path / "r.json"
    s2.main([a for a in ARGS if a not in ("--before", "2026-05-01/2026-06-15")] + ["--out", str(out)])
    b = json.loads(out.read_text())
    river_rows = 166   # the grid rows (20 m) inside BBOX's north-south span
    assert b["frames"][0]["km2"] == pytest.approx(1.0 + river_rows * 10 * 0.0004, rel=0.02), "flood and river both count"
    assert not any("removed" in x for x in b["replay"]["assumptions"])


def test_no_scenes_or_no_flood_stop_with_a_reason(tmp_path, catalogue):
    with pytest.raises(SystemExit, match="Try Sentinel-1"):
        s2.main(ARGS + ["--out", str(tmp_path / "r.json")])
    catalogue["after"] += [scene(tmp_path, "2026-07-05_a", flood=False)]
    catalogue["before"] += [scene(tmp_path, "2026-06-01_a", flood=False)]
    with pytest.raises(SystemExit, match="No clear day showed flood water"):
        s2.main(ARGS + ["--out", str(tmp_path / "r.json")])
    assert not (tmp_path / "r.json").exists()
    with pytest.raises(SystemExit, match="no scenes"):
        s2.read_day([], BBOX)


@pytest.mark.parametrize("args, message", [
    (["--id", "Bad ID!"], "--id can use"),
    (["--bbox", "3.5,6.4,3.3,6.6"], "--bbox must be"),
    (["--bbox", "0,0,2,2"], "--bbox must be"),
    (["--after", "July"], "dates must look like"),
])
def test_bad_input_is_refused(tmp_path, catalogue, args, message):
    argv = list(ARGS) + ["--out", str(tmp_path / "r.json")]
    for i in range(0, len(args), 2):
        argv[argv.index(args[i]) + 1] = args[i + 1]
    with pytest.raises(SystemExit, match=message):
        s2.main(argv)
