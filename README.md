# Open Tracker (Flood Tracker)

**An open-source flood and heat tracking platform for every country.** It shows how far floods and heatwaves could reach, projects flood water in 3D on the real ground of any town (depth, area and volume, hour by hour), and maps how floods spread over time. Ghana and Nigeria also have a detailed hotspot model.

- **For everyone**: type your town and see the flood risk for today, the next 3 days, the next 3 months or the **next rainy season**. You can also see past floods, safe places, roads to avoid and emergency numbers. The screens are large and plain, with a larger-text option and read aloud.
- **Alerts**: follow your places. On the web app, install Open Tracker on your home screen and get phone notifications for warnings near you.
- **Projected reach in every country**: search any town or country. See how far a heatwave could reach day by day, where floods could reach (official warnings, rising rivers, heavy rain, current disasters), and a **3D flood projection** for any town: how deep water would get at your spot, how much ground and how many buildings it reaches, and the volume of water.
- **Live data for every country**: the web app's data feeds read Open-Meteo forecasts and river flow (GloFAS), GDACS disasters, official CAP warnings and Sentinel satellite scenes around the clock. They rate heat for places in every country by local standards and body limits (`webapp/lib/feeds/`, `world/`).
- **Next rainy season outlook**: for each flood area, the chance of flooding, the months to watch and how far water can spread. It is built from rainfall records, river and dam patterns, past floods and official outlooks (NIHSA, GMet, NiMet).
- **Watch floods over time**: play recorded floods year by year on the map. Replay real floods date by date from satellite flood maps (Copernicus, UNOSAT, Sentinel-1). Watch a storm flood Accra, Cape Coast or Lagos hour by hour in the SFINCS flood model, with depth in plain words.
- **Open contributions**: anyone can report a flood, suggest a correction, share a data source or use the suggestion box. Administrators review everything before it changes the map.
- **Agencies**: NADMO, GMet, NEMA, LASEMA, NIHSA, NiMet, the Ministries of the Interior of Ghana and Nigeria and others publish warnings, forecasts, dam status and readings from their own accounts. By default an administrator approves each item first.
- **Administration**: roles and permissions, an audit log with undo, backup and restore, analytics, approvals and model settings.

## Build and test

```bash
tools/check.sh                               # build, lint everything, run the server tests
python3 tools/build.py                       # builds dist/opentracker.html and dist/opentracker-webapp/
cd webapp && npm ci && npm test              # server tests (add TEST_REDIS_URL=redis://… to test Redis too)
python3 tests/e2e/run.py s1.py               # browser scenarios s1–s7 (Playwright and Chromium)
python3 tests/web/webapp_test.py admin.key agency.key   # web app against a running server
SFINCS_BIN=/path/to/sfincs python -m pytest modelling/tests satellite/tests   # flood model and satellite tools
```

## Deploy the public web app

Flood model runs: [modelling/README.md](modelling/README.md). Satellite flood maps: [satellite/README.md](satellite/README.md). See [webapp/README.md](webapp/README.md) for setup, and [docs/SCALING.md](docs/SCALING.md) for running at very large scale. How the code fits together is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Contributing

Code, data and ideas are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md). To report a security problem, see [SECURITY.md](SECURITY.md).

## Licence and credits

Code: [Apache License 2.0](LICENSE). Boundaries, rivers and lakes: Natural Earth (public domain). Map engine: MapLibre GL JS (BSD-3-Clause). Flood records cite their sources (NADMO, NEMA, LASEMA, NIHSA, GMet, NiMet, Copernicus EMS, Ghana News Agency, Graphic, Citi Newsroom, MyJoyOnline, TheCable, AP and others) beside each entry. Open Tracker does not replace official warnings.
