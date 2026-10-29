# Open Tracker flood modelling

Hour-by-hour flood simulations for **Accra, Cape Coast and Lagos** with **SFINCS** (Deltares, open source), built with **HydroMT-SFINCS**. Each run becomes a *replay* file. People watch it in Open Tracker as rain falls, water runs downhill, gathers in low places and drains away. Depth is shown in plain words (ankle to knee, knee to waist, waist to chest, deeper).

## Run it

You need Python 3.11+ and SFINCS, either the [official Docker image](https://hub.docker.com/r/deltares/sfincs-cpu) or a local build (set `SFINCS_BIN=/path/to/sfincs`). The machine must be able to download the open input data.

```bash
pip install -r modelling/requirements.txt
cd modelling
python -m opentracker_model accra jun29-2026     # one city and storm
python -m opentracker_model all                  # every city and storm in cities.yml
```

Replay files appear in `modelling/replays/`. Import them in Open Tracker Admin → Flood replays, or upload them in the web app's push console. Without a machine of your own, run the **Flood models** workflow on GitHub (Actions tab); the replays are attached to the run.

## What goes in

| Input | Source | Licence |
|---|---|---|
| Ground height | Copernicus DEM GLO-30 (30 m), AWS Open Data | Copernicus DEM licence (free and open) |
| Land cover → surface roughness | ESA WorldCover 2020 (10 m), AWS Open Data | CC BY 4.0 |
| Rain | Scenarios in `cities.yml`: a total over a number of hours, peaking mid-storm. Accra's 29 June 2026 storm uses GMet's 169.2 mm daily total | — |
| Sea level | Held at high tide for coastal cities (`tide_m`) | — |

## Limits to keep in mind

- Drains, culverts and channels narrower than the grid (50–75 m) are not modelled. Blocked drains make real floods worse, and working drains make them smaller.
- Copernicus DEM is a surface model: buildings and trees are part of the ground height. For street-level detail, swap in a bare-earth model (for example FABDEM, where its licence allows) and a finer grid.
- Rain is spread evenly over the area. Swap in radar or satellite rainfall (GPM IMERG) for a recorded storm when available.
- A model shows what a storm *would* do on today's ground. Compare it with satellite maps and reports of real floods before you rely on it.

## Checks

`python -m pytest modelling/tests` builds and runs a real SFINCS model on a made-up test terrain (set `SFINCS_BIN`). It checks that the water appears, spreads and drains, and that every hour fits the size limit for phones.
