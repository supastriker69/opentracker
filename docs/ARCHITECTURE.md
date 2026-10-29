# Open Tracker architecture

Open Tracker (Flood Tracker) is one source tree that builds two products:

| Output | Built as | Who uses it |
|---|---|---|
| `dist/opentracker.html` | a single page published on claude.ai with a shared database | the project team, administrators, agencies, invited contributors |
| `dist/opentracker-webapp/` | an installable web app (PWA) plus a Node.js server | the public, on your own domain, with phone alerts |

Both run the same application code from `src/`.

## Source layout

```
src/
  data/data.js            Ghana and Nigeria in depth: regions and states, 88 flood areas, dams, past floods, safe places, agencies
  core/core.js            app state, settings, short-term risk model, places, search, shared helpers
  core/auth.js            permissions and roles
  core/repo.js            every write: permission check, approval gate, audit log
  core/approval.js        approval of agency posts and data changes
  features/agency.js      agency publishing and what the public reads from agencies
  features/notify.js      public notifications and followed places
  features/outlook.js     next rainy season outlook (chance, months to watch, reach)
  features/contribute.js  open-source contributions and the suggestion box
  features/replay.js      flood replays (model hour by hour, satellite date by date) and the year slider
  features/world.js       every country and town (238 countries, 4,200 towns): search, emergency numbers
  features/hazards.js     live flood and heat data per country: heat levels, flood signs, projected reach
  features/floodsim.js    the flood projection model (pure): depth, reach and volume on real ground, hour by hour
  features/terrain.js     ground heights from Terrarium elevation tiles (web app)
  features/projection.js  running and showing a projection for any town; saving it as a replay file
  features/analytics.js   visit analytics and its dashboard
  ui/                     map, simple, expert, admin and world views (views-world.js), routing (main.js), styles
webapp/
  server.js               process start-up, clustering, command line
  lib/                    config, http, api, rules (validation and targeting), push, weather, cli, stores/{file,redis}
  lib/feeds/              data feeds for every country: Open-Meteo, GDACS, official CAP warnings, satellite scenes, heat model
  client/                 web-app-only files: webapp.js (install, push, location), sw.js, console, icons
modelling/               SFINCS flood models with HydroMT-SFINCS → hour-by-hour replay files (Accra, Cape Coast, Lagos)
satellite/               satellite flood outlines (Copernicus EMS/GFM, UNOSAT, Sentinel-1 script, Sentinel-2 for any place) → replay files
world/                   world tables: 238 countries and territories, 7,300 places, emergency numbers, languages
maps/                    self-hosted 3D map files (PMTiles): OpenStreetMap streets, Overture buildings with heights
.github/workflows/       checks on every push; "Flood models", "Satellite flood outlines" and "World data" run on GitHub's machines
config/db-rules.json      database access rules published with the claude.ai page (and used by the tests)
tools/build.py            builds both outputs; tools/icons.py draws the app icons
tests/e2e/                browser scenarios against the claude.ai page with a runtime mock
tests/web/                browser test of the self-hosted web app
webapp/test/              server unit and integration tests (file and Redis storage)
```

Modules are plain scripts that share one scope, loaded in the order listed in `tools/build.py`. Each module owns one concern and talks to others through a few named functions (`data()`, `settings()`, `computeRisk()`, `REPO.*`, `AUTH.can()`).

## Data and permissions (claude.ai page)

- **Shared collections**: hotspots, events, regionEvents, safe, roads, dams, feeds, contacts, alerts, forecasts, agencies, notifications, roles, members, changes, approvals, reviews; settings in `config/settings`.
- **Database rules** (`config/db-rules.json`): everyone reads public data; only Editors and the owner write it. Audit, members and pending changes are readable by Editors only. Each agency account writes only `agencyData/<its id>`, each contributor only `contributions/<their id>`, and each visitor's analytics only `analytics/<their id>`.
- **Roles** narrow what each Editor can do in the interface: Administrator, Data editor, Duty forecaster, Auditor, Agency editor, Agency publisher, plus custom roles. Every write goes through `REPO`, which checks the permission, applies the approval gate and writes an audit entry.
- **Platform limit**: anyone with Editor access to the page can write shared data directly, outside the interface. Give Editor access only to trusted people. Agency staff who only publish should get Contributor access and the Agency publisher role, which the database rules enforce.

## Approval of agency changes

- When approval is on (the default), agency posts, notifications and agency editors' data edits wait for an administrator.
- A decision on an agency post is stored with a fingerprint of the post, so editing it afterwards sends it back for approval.
- Administrators can turn approval off, or mark single agencies as trusted.

## Contributions from the public

People send flood reports, corrections, suggestions and data sources. On claude.ai they are stored in the contributor's own document. On the web app they go to `POST /api/contribute`, which is rate-limited and has a hidden spam trap. Administrators review everything under Admin → Contributions (or the push console). A report can be turned into a past-flood record in one step, and the original source is kept.

## Models

- **Short term (today, 3 days, 3 months)**: chance of flooding from forecast or typical rain against each area's flood threshold, dam status, river season, exposure, vulnerability and history.
- **Next rainy season** (`features/outlook.js`): climate chance of a flood-sized downpour across the rainy months; dam and river season; the area's flood history since the record start; then official outlook lists (NIHSA Annual Flood Outlook, GMet and NiMet seasonal forecasts) and ENSO scale the odds. Reach is the usual flood spread for the area's flood type (flash, coastal, river, floodplain), scaled by severity and chance. Administrators update the official lists every year in Model settings.

## Flood replays

One player for two kinds of replay. **Model** replays come from SFINCS runs (`modelling/`): water depth every hour in four classes, from ankle to knee up to deeper than chest height. **Satellite** replays come from official flood outlines or the Sentinel-1 script (`satellite/`): water seen on each date. A replay file holds a short record (title, area, source, assumptions, one entry per step) and one simplified GeoJSON layer per step, at most 200 KB each. In the claude.ai page the record goes in `replays` and the layers in `geo`. On the web app they go to `POST /api/replays`, and layers are served from `/api/geo/<id>` with year-long caching (a new import gets new ids). Layers load only when someone watches, and the next step is fetched ahead. The map's "Past floods" view has a year slider that plays recorded floods year by year and draws the largest satellite outline of each year.

## Flood and heat for every country

Ghana and Nigeria keep their detailed flood model (88 recorded flood areas, dams, outlook). Every country, including
these two, also gets live data from the feeds:

- **Projected heat reach.** Each town's 7-day heat level (normal, hot, heatwave, dangerous, extreme) is drawn as a disc
  35–110 km wide, wider for worse heat and bigger towns: forecast cells are 9–25 km and heatwaves are regional. The
  country screen counts the towns and people inside the heatwave reach for each day and plays the week.
- **Projected flood reach.** Official CAP warning areas (their polygons and circles), GDACS flood and cyclone areas,
  rivers rising in the GloFAS forecast and places expecting 50 mm (watch) or 100 mm (warning) of rain in 3 days.
- **3D flood projection for a town** (`floodsim.js`). A 2D diffusive-wave model with Manning friction (after
  LISFLOOD-FP) on a 150 × 150 grid of ground heights (40 m cells over 6 km, or 60 m over 10 km). Rain falls as a
  triangle storm (60% runs off), rivers drawn on the street map rise, the sea can surge; water flows downhill and out at
  the grid's edges, each transfer capped so depths stay positive. The model accounts for every cubic metre
  (rain + river = stored + outflow + sea, tested), so the volume it reports is exact for its inputs. Depth classes match
  the city SFINCS models. It runs in the browser in slices (about 3 s for 12 hours), shown over OpenFreeMap 3D
  buildings and Terrarium 3D ground; the buildings in water are counted from the map's own tiles.
- **claude.ai page.** It can't reach other sites, so administrators import the web app's live data file
  (Admin → Live data) and saved projections (Admin → Flood replays).

## Data feeds (web app)

`webapp/lib/feeds/` keeps the platform supplied with outside data for every country, forever:

```
net.js         outbound HTTP: https only, public addresses only for admin-entered feeds, size and time limits, ETag caching
xml.js         RSS / Atom / CAP parsing; documents with a DOCTYPE are refused
scheduler.js   one timer per feed, a shared lock per feed across servers, backoff, health records
openmeteo.js   forecasts, river flow (GloFAS), past weather (ERA5)       gdacs.js    disasters worldwide
cap.js         official warnings (Common Alerting Protocol)              stac.js     Sentinel-1/2 scenes of current floods
weatherex.js   model comparison (off by default)                         heat.js     the heat model (pure functions)
hazards.js     per-country and world summaries (pure)                    autoalerts.js  automatic heat alerts
catalog.js     every source with its licence and credit                  index.js    wiring: feeds → documents → summaries
```

Each feed writes its own documents (`forecast:<CC>`, `rivers:<CC>`, `gdacs-events`, `cap-alerts:<feed>` …) and keeps
its last good data on failure. After any change the publisher rebuilds `hazards:<CC>` and `hazards:world`, which the
API serves with CDN caching, so outside services are called once per feed run, never once per visitor.

**Heat model.** A day is rated by local standards when the place's baseline is known: hot when above the local 90th
percentile; heatwave when the Excess Heat Factor (Nairn and Fawcett) is positive; dangerous or extreme by its
severity (EHF ÷ EHF85, 1 and 3). Body limits apply everywhere: wet-bulb 28 °C (dangerous) and 30 °C (extreme), NOAA
heat index 41 °C and 52 °C. Every heat level is labelled a model estimate, next to any official warning.

`world/` builds the country and place tables; `satellite/sentinel2_flood.py` maps flood water from Sentinel-2 for any
place; `maps/` makes self-hosted 3D map files (OpenStreetMap streets, Overture buildings with heights).

## Security summary

- All text from data, agencies and the public is escaped before display; only `http(s)` links are rendered.
- Agency posts are type-checked and range-checked before they reach the public or the model.
- The server validates every input, limits body sizes, rate-limits by IP and key, refuses cross-site posts, stores API keys only as hashes and compares them in constant time, and sets a strict Content Security Policy and other security headers.
- Location is rounded to about 100 m and stays on the phone and the alert server. Analytics store no names. Devices that ask not to be tracked are not counted.
