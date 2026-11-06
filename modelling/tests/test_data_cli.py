"""Downloading and cutting the input data, and the command line, without the network or a model run:
downloads are served from local files and the model steps are stood in for, so these run anywhere in seconds."""
import json
import runpy
import sys
from pathlib import Path

import numpy as np
import pytest
import rasterio
import yaml
from rasterio.transform import from_origin

from opentracker_model import cli, data


def tile(path: Path, west: float, north: float, value: float, n: int = 20, step: float = 0.05, dtype="float32"):
    """a small GeoTIFF tile filled with one value"""
    prof = dict(driver="GTiff", height=n, width=n, count=1, crs="EPSG:4326", transform=from_origin(west, north, step, step), dtype=dtype)
    with rasterio.open(path, "w", **prof) as f:
        f.write(np.full((n, n), value, dtype=dtype), 1)
    return path


class FakeResponse:
    def __init__(self, status, body=b""):
        self.status_code, self.body = status, body

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def iter_content(self, size):
        for i in range(0, len(self.body), size):
            yield self.body[i:i + size]


def test_download_saves_once_and_reports_missing_tiles(tmp_path, monkeypatch):
    calls = []

    def get(url, stream, timeout):
        calls.append(url)
        return FakeResponse(404) if "missing" in url else FakeResponse(200, b"x" * 3000000)

    monkeypatch.setattr(data.requests, "get", get)
    dest = tmp_path / "a" / "tile.tif"
    assert data._download("https://example.org/tile", dest) == dest
    assert dest.stat().st_size == 3000000 and not dest.with_suffix(".part").exists()
    data._download("https://example.org/tile", dest)   # already there: not fetched again
    assert calls == ["https://example.org/tile"]
    with pytest.raises(FileNotFoundError):
        data._download("https://example.org/missing", tmp_path / "missing.tif")
    monkeypatch.setattr(data.requests, "get", lambda url, stream, timeout: FakeResponse(503))
    with pytest.raises(RuntimeError, match="503"):
        data._download("https://example.org/broken", tmp_path / "broken.tif")
    assert not (tmp_path / "broken.tif").exists()


def test_mosaic_merges_tiles_and_cuts_to_the_area(tmp_path):
    left = tile(tmp_path / "l.tif", 0.0, 1.0, 5.0)
    right = tile(tmp_path / "r.tif", 1.0, 1.0, 9.0)
    out = data._mosaic([left, right], [0.5, 0.2, 1.5, 0.8], tmp_path / "m.tif")
    with rasterio.open(out) as f:
        b = f.bounds
        z = f.read(1)
        assert b.left == pytest.approx(0.49, abs=0.05) and b.right == pytest.approx(1.51, abs=0.05)
        assert b.bottom == pytest.approx(0.19, abs=0.05) and b.top == pytest.approx(0.81, abs=0.05)
        assert z[:, 0].tolist() == [5.0] * z.shape[0] and z[:, -1].tolist() == [9.0] * z.shape[0]
        assert f.profile["compress"] == "deflate"


def test_fetch_inputs_builds_a_catalog_from_the_tiles(tmp_path, monkeypatch):
    bbox = [10.2, 0.2, 10.4, 0.4]
    src = tmp_path / "server"
    src.mkdir()
    tile(src / "dem.tif", 10.0, 1.0, 7.0, n=40, step=0.025)
    tile(src / "lc.tif", 9.0, 3.0, 50, n=300, step=0.01, dtype="uint8")   # real tiles are far finer than the 0.01° margin
    fetched = []

    def download(url, dest):
        fetched.append(url)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes((src / ("dem.tif" if "copernicus" in url else "lc.tif")).read_bytes())
        return dest

    monkeypatch.setattr(data, "_download", download)
    catalog = data.fetch_inputs(bbox, tmp_path / "inputs")
    cat = yaml.safe_load(catalog.read_text())
    assert any("Copernicus_DSM_COG_10_N00_00_E010_00_DEM" in u for u in fetched)
    assert any("ESA_WorldCover_10m_2020_v100_N00E009_Map" in u for u in fetched)
    for key, path in [("dem", "dem.tif"), ("landcover", "landcover.tif")]:
        assert any(path in json.dumps(v) for v in cat.values()), f"{key} is in the catalog"
        with rasterio.open(tmp_path / "inputs" / path) as f:
            assert f.bounds.left <= bbox[0] and f.bounds.right >= bbox[2]


def test_fetch_inputs_needs_ground_heights(tmp_path, monkeypatch):
    def download(url, dest):
        raise FileNotFoundError(url)   # every ground-height tile is sea
    monkeypatch.setattr(data, "_download", download)
    with pytest.raises(RuntimeError, match="No ground-height tiles"):
        data.fetch_inputs([10.2, 0.2, 10.4, 0.4], tmp_path / "inputs")


@pytest.fixture
def config(tmp_path):
    cfg = {"cities": {
        "testtown": {"name": "Test town", "country": "GH", "bbox": [10.0, 0.0, 10.03, 0.03],
                     "scenarios": {"storm": {"title": "Test storm", "rain_mm": 100, "hours": 3}, "big": {"title": "Big storm", "rain_mm": 200, "hours": 6}}},
        "other": {"name": "Other", "country": "NG", "bbox": [3.0, 6.0, 3.03, 6.03], "scenarios": {"storm": {"title": "Storm", "rain_mm": 80, "hours": 3}}}}}
    p = tmp_path / "cities.yml"
    p.write_text(yaml.safe_dump(cfg, sort_keys=False))
    return p


def test_run_one_writes_a_replay(tmp_path, config, monkeypatch):
    steps = []
    monkeypatch.setattr(cli, "fetch_inputs", lambda bbox, folder: steps.append(("fetch", bbox)) or folder / "data_catalog.yml")
    monkeypatch.setattr(cli, "build", lambda city, sc, catalog, root: steps.append(("build", sc.key, root.name)))
    monkeypatch.setattr(cli, "run", lambda root: steps.append(("run", root.name)) or root / "sfincs_map.nc")
    monkeypatch.setattr(cli, "bundle", lambda nc, ck, city, sc, made: {"replay": {"id": f"{ck}-{sc.key}", "model": made},
                                                                       "frames": [{"km2": 0.5}, {"km2": 1.25}]})
    cities = yaml.safe_load(config.read_text())["cities"]
    dest = cli.run_one(cities, "testtown", "storm", tmp_path / "work", tmp_path / "out")
    assert dest == tmp_path / "out" / "testtown-storm.json"
    assert json.loads(dest.read_text())["frames"][1]["km2"] == 1.25
    assert steps[1:] == [("build", "storm", "storm"), ("run", "storm")]
    assert json.loads(dest.read_text())["replay"] == {"id": "testtown-storm", "model": f"HydroMT-SFINCS {cli.hydromt_sfincs.__version__}"}
    assert steps[0][1] == [10.0, 0.0, 10.03, 0.03]


def test_main_runs_every_scenario_and_refuses_unknown_cities(tmp_path, config, monkeypatch):
    done = []
    monkeypatch.setattr(cli, "run_one", lambda cities, ck, sk, work, out: done.append((ck, sk)))
    cli.main(["testtown", "--config", str(config), "--work", str(tmp_path / "w"), "--out", str(tmp_path / "o")])
    assert done == [("testtown", "storm"), ("testtown", "big")]
    done.clear()
    cli.main(["testtown", "big", "--config", str(config)])
    assert done == [("testtown", "big")]
    done.clear()
    cli.main(["all", "--config", str(config)])
    assert done == [("testtown", "storm"), ("testtown", "big"), ("other", "storm")]
    with pytest.raises(SystemExit, match="Unknown city 'nowhere'. Choose from: testtown, other"):
        cli.main(["nowhere", "--config", str(config)])


def test_python_dash_m_runs_the_command_line(monkeypatch):
    called = []
    monkeypatch.setattr(cli, "main", lambda: called.append(True))
    monkeypatch.setattr(sys, "argv", ["opentracker_model", "testtown"])
    runpy.run_module("opentracker_model", run_name="__main__")
    assert called == [True]


def test_the_real_cities_file_is_valid():
    cities = yaml.safe_load((Path(__file__).resolve().parents[1] / "cities.yml").read_text())["cities"]
    assert {"accra", "cape-coast", "lagos"} <= set(cities)
    for key, c in cities.items():
        w, s, e, n = c["bbox"]
        assert w < e and s < n and (e - w) < 1 and (n - s) < 1, key
        assert c["scenarios"], key


def test_run_needs_a_pinned_sfincs(tmp_path, monkeypatch):
    from opentracker_model import model
    monkeypatch.delenv("SFINCS_BIN", raising=False)
    monkeypatch.delenv("SFINCS_IMAGE", raising=False)
    with pytest.raises(RuntimeError, match="build_sfincs.sh"):
        model.run(tmp_path)
    for moving in ["deltares/sfincs-cpu", "deltares/sfincs-cpu:latest", "registry:5000/sfincs"]:
        monkeypatch.setenv("SFINCS_IMAGE", moving)
        with pytest.raises(RuntimeError, match="fixed version"):
            model.run(tmp_path)
    monkeypatch.setenv("SFINCS_IMAGE", "deltares/sfincs-cpu@sha256:" + "0" * 64)
    monkeypatch.setattr(model.shutil, "which", lambda name: None)
    with pytest.raises(RuntimeError, match="Docker is not installed"):
        model.run(tmp_path)
    ran = []
    monkeypatch.setattr(model.shutil, "which", lambda name: "/usr/bin/docker")
    monkeypatch.setattr(model.subprocess, "run", lambda cmd, **kw: ran.append(cmd))
    with pytest.raises(RuntimeError, match="produced no output"):
        model.run(tmp_path)
    assert ran[0][:3] == ["docker", "run", "--rm"] and ran[0][-1].endswith("0" * 64)
    (tmp_path / "sfincs_map.nc").write_bytes(b"x")
    monkeypatch.setenv("SFINCS_IMAGE", "registry:5000/sfincs:v2.2.1")
    assert model.run(tmp_path) == tmp_path / "sfincs_map.nc"
