"""Sentinel-2 flood outlines: the image steps on made-up arrays, and the scene search with a fake catalogue."""
import sys
from pathlib import Path

import numpy as np
import pytest
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import sentinel2_flood as s2  # noqa: E402


def test_mndwi_and_water_with_clouds_masked():
    green = np.array([[1000, 1000, 0], [300, 900, 900]], dtype="uint16")
    swir = np.array([[200, 1000, 0], [900, 100, 100]], dtype="uint16")
    idx = s2.mndwi(green, swir)
    assert idx[0, 0] == pytest.approx(800 / 1200)
    assert idx[0, 1] == 0
    assert np.isnan(idx[0, 2])                      # no data
    scl = np.array([[6, 6, 0], [4, 9, 6]])          # 9 = cloud
    water, seen = s2.water_mask(idx, scl, 0.2)
    assert water.tolist() == [[True, False, False], [False, False, True]]
    assert seen.tolist() == [[True, True, False], [True, False, True]]


def test_outline_area_and_noise():
    mask = np.zeros((20, 20), dtype=bool)
    mask[2:7, 3:8] = True                            # 25 pixels of 20 m = 0.01 km²
    mask[15, 15] = True                              # one stray pixel: dropped
    transform = from_origin(500000, 700000, 20, 20)  # UTM zone 31N, near Lagos
    geom, km2 = s2.outline(mask, transform, "EPSG:32631")
    assert km2 == pytest.approx(0.01)
    w, s, e, n = geom.bounds
    assert 2.9 < w < e < 3.1 and 6.2 < s < n < 6.4
    assert s2.outline(np.zeros((5, 5), dtype=bool), transform, "EPSG:32631") == (None, 0.0)


def test_search_body_and_grouping():
    sent = {}

    class Answer:
        def raise_for_status(self):
            pass

        def json(self):
            return {"features": [{"id": "a", "properties": {"datetime": "2026-07-05T10:01:00Z"}},
                                 {"id": "b", "properties": {"datetime": "2026-07-05T10:01:20Z"}},
                                 {"id": "c", "properties": {"datetime": "2026-07-02T10:00:00Z"}}]}

    def post(url, json, timeout):
        sent.update(url=url, body=json)
        return Answer()

    items = s2.search("https://stac.example.org/v1", [3.3, 6.4, 3.5, 6.6], "2026-07-01/2026-07-20", 30, post=post)
    assert sent["url"] == "https://stac.example.org/v1/search"
    assert sent["body"]["datetime"] == "2026-07-01T00:00:00Z/2026-07-20T23:59:59Z"
    assert sent["body"]["query"] == {"eo:cloud_cover": {"lt": 30}}
    days = s2.by_day(items)
    assert list(days) == ["2026-07-02", "2026-07-05"]
    assert [i["id"] for i in days["2026-07-05"]] == ["a", "b"]
    with pytest.raises(SystemExit):
        s2._interval("July")


def test_band_names_from_either_catalogue():
    item = {"id": "x", "assets": {"green": {"href": "https://e/green.tif"}, "B11": {"href": "s3://bucket/B11.jp2"}, "scl": {"href": "http://insecure/scl.tif"}}}
    assert s2.asset_href(item, "green") == "https://e/green.tif"
    assert s2.asset_href(item, "swir") == "s3://bucket/B11.jp2"
    with pytest.raises(KeyError):
        s2.asset_href(item, "scl")                   # plain http is not read
