"""Command line:  python -m opentracker_model <city> <scenario> [--out replays/]  |  python -m opentracker_model all

Downloads the inputs (once), builds the SFINCS model, runs it, and writes
replays/<city>-<scenario>.json, ready to import in Open Tracker (Admin → Flood replays, or the push console)."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import hydromt_sfincs
import yaml

from .data import fetch_inputs
from .frames import bundle
from .model import build, run, scenario_from

HERE = Path(__file__).resolve().parent.parent


def run_one(cities: dict, city_key: str, sc_key: str, work: Path, out: Path) -> Path:
    city = cities[city_key]
    sc = scenario_from(sc_key, city["scenarios"][sc_key])
    catalog = fetch_inputs(city["bbox"], work / city_key / "inputs")
    root = work / city_key / sc_key
    build(city, sc, catalog, root)
    map_nc = run(root)
    b = bundle(map_nc, city_key, city, sc, f"HydroMT-SFINCS {hydromt_sfincs.__version__}")
    out.mkdir(parents=True, exist_ok=True)
    dest = out / f"{city_key}-{sc_key}.json"
    dest.write_text(json.dumps(b, separators=(",", ":")))
    print(f"{dest}: {len(b['frames'])} hours, up to {max(f['km2'] for f in b['frames'])} km² under water")
    return dest


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("city", help="a city key from cities.yml, or 'all'")
    p.add_argument("scenario", nargs="?", help="a scenario key (all scenarios when left out)")
    p.add_argument("--config", default=str(HERE / "cities.yml"))
    p.add_argument("--work", default=str(HERE / "work"))
    p.add_argument("--out", default=str(HERE / "replays"))
    a = p.parse_args(argv)
    cities = yaml.safe_load(Path(a.config).read_text())["cities"]
    keys = list(cities) if a.city == "all" else [a.city]
    for ck in keys:
        if ck not in cities:
            raise SystemExit(f"Unknown city {ck!r}. Choose from: {', '.join(cities)}")
        for sk in ([a.scenario] if a.scenario else list(cities[ck]["scenarios"])):
            run_one(cities, ck, sk, Path(a.work), Path(a.out))


if __name__ == "__main__":
    main()
