"""Model against satellite: scores on outlines whose overlap is known exactly."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import compare_extent as ce  # noqa: E402

BBOX = [3.30, 6.40, 3.34, 6.44]
D = 0.01   # degrees: about 1.1 km


def square(x0, y0, size=D, k=1):
    ring = [[x0, y0], [x0 + size, y0], [x0 + size, y0 + size], [x0, y0 + size], [x0, y0]]
    return {"type": "Feature", "properties": {"k": k}, "geometry": {"type": "Polygon", "coordinates": [ring]}}


def replay(rid, frames, kind="model", bbox=BBOX):
    return {"app": "OpenTracker-replay", "version": 1, "replay": {"id": rid, "kind": kind, "bbox": bbox},
            "frames": [{"t": t, "fc": {"type": "FeatureCollection", "features": feats}} for t, feats in frames]}


def write(tmp_path, name, data):
    p = tmp_path / name
    p.write_text(json.dumps(data))
    return str(p)


MODEL = replay("m", [("2026-06-29T00:00:00Z", []),
                     ("2026-06-29T03:00:00Z", [square(3.31, 6.41)]),                         # the left square
                     ("2026-06-29T06:00:00Z", [square(3.31, 6.41, k=2), square(3.32, 6.41)])])  # left and middle


def test_scores_against_the_largest_extent(tmp_path):
    sat = replay("s", [("2026-06-30T10:00:00Z", [square(3.32, 6.41)]),     # the middle square: inside the model's extent
                       ("2026-07-02T10:00:00Z", [square(3.32, 6.41), square(3.33, 6.41)])], kind="satellite")
    r = ce.compare(MODEL, sat, res=10)
    first, second = r["dates"]
    assert first["model"] == "largest extent"
    assert first["hit_rate"] == 1.0 and first["false_alarm_ratio"] == pytest.approx(0.5, abs=0.01)
    assert first["csi"] == pytest.approx(0.5, abs=0.01)
    assert second["csi"] == pytest.approx(1 / 3, abs=0.01)                 # 1 shared square of 3 in all
    assert first["model_km2"] == pytest.approx(2 * 1.106 * 1.112, rel=0.02)
    assert r["best_csi"] == first["csi"]


def test_nearest_hour(tmp_path):
    sat = replay("s", [("2026-06-29T02:40:00Z", [square(3.31, 6.41)])], kind="satellite")
    r = ce.compare(MODEL, sat, res=10, nearest=True)
    assert r["dates"][0]["model"] == "2026-06-29T03:00:00Z" and r["dates"][0]["csi"] == pytest.approx(1.0, abs=0.01)


def test_only_the_shared_area_counts(tmp_path):
    sat = replay("s", [("2026-06-30T10:00:00Z", [square(3.31, 6.41)])], kind="satellite", bbox=[3.30, 6.40, 3.315, 6.44])
    r = ce.compare(MODEL, sat, res=10)
    assert r["dates"][0]["csi"] == pytest.approx(1.0, abs=0.01)            # the middle square lies outside the shared area


def test_command_line_report_and_gate(tmp_path, capsys):
    sat = replay("s", [("2026-06-30T10:00:00Z", [square(3.32, 6.41)])], kind="satellite")
    m, s = write(tmp_path, "m.json", MODEL), write(tmp_path, "s.json", sat)
    out = tmp_path / "out" / "report.json"
    assert ce.main([m, s, "--res", "20", "--out", str(out), "--min-csi", "0.4"]) == 0
    assert json.loads(out.read_text())["dates"][0]["csi"] == pytest.approx(0.5, abs=0.02)
    said = capsys.readouterr().out
    assert "2026-06-30 vs model largest extent: CSI 0.4" in said or "largest extent: CSI 0.5" in said
    assert "hit rate 1.00" in said
    assert ce.main([m, s, "--min-csi", "0.9"]) == 1
    with pytest.raises(SystemExit, match="--res"):
        ce.main([m, s, "--res", "0"])


def test_unusable_inputs(tmp_path):
    with pytest.raises(SystemExit, match="not an Open Tracker replay"):
        ce.load(write(tmp_path, "x.json", {"app": "other"}))
    far = replay("s", [("2026-06-30T10:00:00Z", [])], bbox=[10, 10, 10.1, 10.1])
    with pytest.raises(SystemExit, match="do not cover the same area"):
        ce.compare(MODEL, far)
    empty = replay("s", [("2026-06-30T10:00:00Z", [])], kind="satellite")
    r = ce.compare(MODEL, empty, res=50)
    assert r["dates"][0]["satellite_km2"] == 0 and r["dates"][0]["csi"] == 0


def test_southern_hemisphere_grid():
    g = ce.grid_for(ce.box(-43.3, -22.95, -43.2, -22.85), 50)              # Rio de Janeiro: UTM 23 south
    assert g["to_utm"].__self__.target_crs.to_epsg() == 32723
