"""FLOODSIM (the in-browser model) against SFINCS: the scoring on hand-made arrays, and, where SFINCS and Node.js are
installed (as in CI), the full comparison on every test terrain, held to the thresholds in benchmark.THRESHOLDS."""
import json
import os
import shutil

import numpy as np
import pytest

from opentracker_model import benchmark as bm
from opentracker_model.model import start_level


def models(sf_depths, fs_depths, msk=None, fixed=None):
    sf_h, fs_h = np.array(sf_depths, dtype=float), np.array(fs_depths, dtype=float)
    shape = sf_h.shape[1:]
    return ({"h": sf_h, "msk": np.ones(shape, "int8") if msk is None else np.array(msk, "int8"), "cell": 100.0},
            {"h": fs_h, "fixed": np.zeros(shape, "int8") if fixed is None else np.array(fixed, "int8")})


def test_identical_models_score_perfectly():
    h = [[[0, 0], [0, 0]], [[0.2, 0.5], [0, 0.1]], [[0.1, 0.4], [0, 0]]]
    s = bm.scores(*models(h, h))
    assert s["csi"] == 1.0 and s["csi_knee"] == 1.0 and s["area_ratio"] == 1.0 and s["volume_ratio"] == 1.0
    assert s["arrival_shift_h"] == 0 and s["depth_mae_m"] == 0 and bm.failures(s) == []
    assert s["peak_km2"] == {"sfincs": 0.02, "floodsim": 0.02} and s["peak_m3"]["sfincs"] == 8000


def test_misses_false_alarms_and_timing():
    sf = [[[0, 0, 0]], [[0.3, 0.3, 0]], [[0.3, 0.3, 0]]]
    fs = [[[0, 0, 0]], [[0, 0, 0]], [[0.3, 0, 0.3]]]          # late, one cell missed, one false alarm
    s = bm.scores(*models(sf, fs))
    assert s["csi"] == pytest.approx(1 / 3, abs=1e-3) and s["hit_rate"] == 0.5 and s["false_alarm_ratio"] == 0.5
    assert s["arrival_hour"] == {"sfincs": 1, "floodsim": 2} and s["arrival_shift_h"] == 1
    fails = bm.failures(s)
    assert any(f.startswith("csi") for f in fails) and not any(f.startswith("arrival") for f in fails)


def test_sea_and_left_out_cells_are_not_scored():
    sf = [[[0, 0]], [[2.0, 0.2]]]
    fs = [[[0, 0]], [[0.0, 0.2]]]
    assert bm.scores(*models(sf, fs, msk=[[2, 1]]))["csi"] == 1.0          # SFINCS's sea boundary cell
    assert bm.scores(*models(sf, fs, fixed=[[1, 0]]))["csi"] == 1.0        # FLOODSIM's sea cell
    assert bm.scores(*models(sf, fs))["csi"] == 0.5


def test_failures_name_every_broken_threshold():
    s = {"csi": 0.5, "area_ratio": 2.0, "volume_ratio": 0.5, "arrival_shift_h": 3, "depth_mae_m": 0.4}
    assert [f.split()[0] for f in bm.failures(s)] == ["csi", "area_ratio", "volume_ratio", "arrival_shift_h", "depth_mae_m"]


def test_terrains_have_the_features_they_are_named_for():
    n = 60
    coast, basin, streets, gully = (bm.coast(n), bm.basin(n), bm.streets(n), bm.gully(n))
    assert coast[-1].max() < 0 < coast[0].min()                             # sea in the south, land in the north
    assert basin[n // 2, int(0.45 * n)] < basin[0].min() and basin[n // 2, -1] < basin[0, -1]   # bowl, low outlet east
    assert streets.min() < 0 < streets.max() and np.ptp(streets) < 20       # flat, partly below sea level
    assert gully[0].min() > gully[-1].max() and gully[n // 2, n // 2] < gully[n // 2, 0]        # drains south, V-shaped


def test_models_start_dry_inland_and_at_tide_level_on_the_coast():
    assert start_level({"tide_m": 0.6}, -3.0) == 0.6
    assert start_level({"tide_m": None}, 12.0) == 0.0
    assert start_level({}, -27.4) == -28.4                                 # an inland area below sea level stays dry


def test_the_table_lists_every_case():
    r = {"case": "basin", "about": "a bowl", "rain": "150 mm in 6 h", "csi": 0.7, "csi_knee": 0.9, "peak_km2": {"sfincs": 1.0, "floodsim": 1.1},
         "peak_m3": {"sfincs": 1000, "floodsim": 1100}, "arrival_hour": {"sfincs": 4, "floodsim": 4}, "peak_hour": {"sfincs": 5, "floodsim": 6},
         "depth_mae_m": 0.07}
    t = bm.table([r])
    assert t.splitlines()[2] == "| basin: a bowl | 150 mm in 6 h | 0.70 / 0.90 | 1.00 / 1.10 | 1,000 / 1,100 | 4 / 4 | 5 / 6 | 7 cm |"


@pytest.mark.skipif(not os.environ.get("SFINCS_BIN") or not shutil.which("node"), reason="needs SFINCS (SFINCS_BIN) and Node.js")
def test_floodsim_agrees_with_sfincs_on_every_terrain(tmp_path, capsys):
    out = tmp_path / "results.json"
    code = bm.main(["--out", str(out)])
    said = capsys.readouterr().out
    results = json.loads(out.read_text())["results"]
    assert [r["case"] for r in results] == [c.key for c in bm.CASES]
    assert code == 0, said
    for r in results:
        assert r["fails"] == [], r["case"]
        assert r["land_cells"] > 3000, "the comparison covers most of each terrain"
        assert r["peak_km2"]["sfincs"] > 0.1, "every terrain floods somewhere"
