# How the flood models are checked

Open Tracker draws flood water from two models:

- **The city replays** come from **SFINCS**, the open-source flood model from Deltares. It runs on a server or a laptop, on real ground heights and land cover (`modelling/`).
- **The 3D projection for any town** comes from **FLOODSIM**. This is a small model that runs inside the visitor's own browser (`src/features/floodsim.js`), so it works for every town on Earth without a server.

FLOODSIM is held to SFINCS, and both are held to what satellites saw. The checks are below.

## 1. FLOODSIM against SFINCS, on every push

`python -m opentracker_model.benchmark` runs both models on four made-up terrains. Each terrain tests one thing floods do. Both models get **exactly the same**:

- ground: FLOODSIM runs on the bed levels SFINCS itself uses, cell for cell (50 m cells)
- rain: a triangular storm, integrated exactly in both
- roughness: Manning 0.1, which is built-up land
- sea level: high tide where there is a coast
- soaking-in: none

CI builds SFINCS from a fixed revision (`modelling/build_sfincs.sh`) and fails if any terrain misses a threshold (`modelling/tests/test_benchmark.py`). Results from the latest run (`docs/validation/floodsim-vs-sfincs.json`):

| Terrain | What it tests | CSI, ankle deep | Hit rate | False alarms | Flooded area | Water volume | Flood arrives | Depth difference |
|---|---|---|---|---|---|---|---|---|
| Coast | sea at high tide, a river valley, a hollow behind the beach | **0.92** | 0.94 | 0.02 | 0.99 × | 0.88 × | same hour | 2 cm |
| Basin | an inland bowl that fills, then spills out a channel | **0.68** | 0.76 | 0.14 | 0.84 × | 1.03 × | same hour | 7 cm |
| Streets | a flat inland town, partly below sea level, with streets 0.4 m lower than the blocks | **0.92** | 0.96 | 0.04 | 0.98 × | 0.98 × | same hour | 1 cm |
| Gully | a steep V-shaped valley that drains fast | **0.89** | 0.96 | 0.08 | 1.04 × | 0.95 × | same hour | 10 cm |

The "×" columns are FLOODSIM's figure divided by SFINCS's.

**Thresholds** (in `benchmark.THRESHOLDS`):

- CSI at least 0.65
- largest flooded area and water volume within 0.75–1.33 × of SFINCS
- flood arrives within 1 hour
- mean depth difference at most 15 cm

**What the scores mean:**

- **CSI** (Critical Success Index) is the cells both models flood, divided by the cells either model floods. A cell counts as flooded at ankle depth, 0.15 m, the line both apps draw. 1 is perfect.
- **Flood arrives** is the hour each model first floods half its largest area.
- **Depth difference** is the mean difference of the deepest water, over every cell either model floods.

**The basin is the hardest case, and the bar was set after seeing it.**

- Both models hold the same water: within 2–5 % every hour.
- Both models have the same deep pool: 2.85 m against 3.11 m at the storm's height.
- They differ on a thin sheet of water spreading across the bowl's gently sloping floor during the storm. SFINCS has it about 16 cm deep there; FLOODSIM about 13 cm. That straddles the 15 cm line, so hundreds of cells count as "flooded" in one model and "dry" in the other over a 3 cm difference.
- At knee depth (0.3 m), where water becomes dangerous to walk through, the basin's CSI is 0.89.

The difference comes from the equations, not a mistake. FLOODSIM uses the diffusive-wave equations of LISFLOOD-FP. SFINCS adds inertia. Giving FLOODSIM the local-inertial equations was tried and did not help: the basin stayed at 0.68 and the gully fell from 0.89 to 0.79. So the change was not kept, and the CSI bar is 0.65, in line with published comparisons between 2D flood models. Every other threshold was set before the first run and is unchanged.

**What the comparison found and fixed:**

- **Inland models began with a phantom flood.** SFINCS starts every cell at a water level of 0 m unless told otherwise. So an inland model where the ground lies below sea level began with every such cell already flooded: 5 km² on the streets terrain before any rain fell. Real places like this include the Caspian lowlands, the Jordan valley and polders. Inland models now start below their lowest ground.
- **Coastal models began with a false surge.** They started the sea at 0 m and then held it at high tide, which pushed a small surge onto low ground. They now start at the tide level. See `model.start_level`.
- **FLOODSIM's rain total was off across the storm's peak.** It sampled the rain rate once per time step, which is not exact for a step that straddles the peak. It now adds up the exact rain in each step (`FLOODSIM.rainDepth`).

## 2. Models against satellite maps

`satellite/compare_extent.py` scores any model replay against a satellite replay. The satellite replay can come from:

- `sentinel2_flood.py`: Sentinel-2 optical images, water index MNDWI
- `sentinel1_flood.js`: Sentinel-1 radar, which sees through cloud
- `prepare_extent.py`: Copernicus GFM or UNOSAT outlines

Both replays are drawn on one grid in metres, over the area both cover. The tool reports CSI, hit rate and false alarms for each satellite date, against the model's largest extent, or the nearest model hour with `--nearest`.

```sh
python satellite/sentinel2_flood.py --id accra-2026-07 --title "Accra, July 2026" --country GH \
    --bbox -0.30,5.53,-0.15,5.70 --after 2026-06-29/2026-07-10 --before 2026-01-01/2026-02-28 --out replays/accra-s2.json
python -m opentracker_model accra jun29-2026 --out replays
python satellite/compare_extent.py replays/accra-jun29-2026.json replays/accra-s2.json --out report.json
```

**Running it on real floods.** The **Real-world flood check** workflow (`.github/workflows/validate-real.yml`) does this end to end on GitHub's runners:

1. Builds SFINCS.
2. Downloads Copernicus ground heights and ESA land cover.
3. Runs the city model.
4. Maps the water Sentinel-2 saw.
5. Uploads the report.

It runs on the 1st of every month for Accra's 29 June 2026 storm, and by hand (Actions → Real-world flood check → Run workflow) for any city, scenario and dates.

These runs need the internet, and Open Tracker's development machine cannot reach the data stores. So the tool itself is tested offline on outlines whose overlap is known exactly (`satellite/tests/test_compare_extent.py`). Its first real-world result will be whatever the workflow reports.

**What to expect, honestly.** Satellite outlines and flood models never match closely, and published studies of good models report CSI of about 0.5–0.7:

- Optical satellites cannot see through the clouds that come with most storms.
- Satellites miss water under trees and between buildings.
- A satellite sees only the moment it passes over, often a day after the peak.
- The model's storm is a scenario: a daily rain total spread over assumed hours, with drains not modelled.

So the check reports the score and does not fail on it unless you set `min_csi`.

## 3. The models' own tests

| What | Where | Checks |
|---|---|---|
| FLOODSIM physics | `webapp/test/floodsim.test.js` | every cubic metre accounted for; water flows downhill, pools, drains to the sea and the edge, rises from rivers; exact rain totals; frames fit the size limit |
| SFINCS pipeline | `modelling/tests/test_pipeline.py` | a real SFINCS run on a made-up valley: water appears, spreads, drains, and fits phones |
| Input data | `modelling/tests/test_data_cli.py` | tile names, downloads (including failures), mosaics, the data catalogue, the command line; Docker images must be pinned |
| Satellite water | `satellite/tests/` | water index, cloud masking, removal of normal water, mixed UTM zones, outlines, every input check |

Python coverage is gated at 90 % per package in CI. It currently stands at:

- modelling: 98 %
- satellite: 94 %
- world: 99 %
