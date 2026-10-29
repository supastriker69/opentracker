# Open Tracker web app

This is the public, installable version of Open Tracker. People can add it to their home screen with no app-store download, the way sites like Stake.com do. It includes phone alerts for the places people follow and around their location, and a push console for agencies.

## Quick start (one server)

```bash
npm ci
node server.js keys:add opentracker "Open Tracker team" --admin   # prints the administrator key once
node server.js keys:add moi-gh "Ministry of the Interior (Ghana)" # one key per agency
PORT=8080 node server.js
```

Open `http://localhost:8080`. The push console is at `/console.html`.

Real phone alerts need **HTTPS on your own domain**. Put the server behind a proxy that handles HTTPS (the included `Caddyfile` does this automatically), or use `docker compose up -d`.

## Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `PORT`, `HOST` | `8080`, `127.0.0.1` | where to listen (`0.0.0.0` in containers) |
| `REDIS_URL` | (none) | shared storage; required for more than one process or server |
| `WORKERS` | `1` | processes per machine; `auto` uses every core (needs `REDIS_URL`) |
| `ROLE` | `all` | `web` (HTTP only), `push` (notification sender and weather poller only) or `all` |
| `DATA_DIR` | `.data` | file storage folder when there is no Redis |
| `TRUST_PROXY` | off | set `1` behind a proxy or CDN (real client IPs, HSTS) |
| `VAPID_SUBJECT` | `mailto:alerts@example.org` | contact address push services can use about your alerts |
| `GOOGLE_WEATHER_API_KEY` | (none) | turns on live rain forecasts from Google Weather (Google Maps Platform, billing required) |
| `PUSH_CONCURRENCY` | `50` | parallel deliveries per sender |
| `FEEDS_OFF` | (none) | data feeds to switch off, comma separated, or `all` (see Data feeds) |
| `FEED_PLACES`, `FEED_RIVERS` | `300`, `150` | how many places get heat forecasts, and how many river towns get river forecasts |
| `FEED_FORECAST_HOURS` | `6` | hours between heat and rain forecasts |
| `BASELINE_YEARS`, `BASELINE_PER_RUN`, `BASELINE_EVERY_MIN` | `10`, `1`, `90` | how each place's normal heat is learnt from past weather, a few places at a time |
| `CAP_EVERY_SEC` | `120` | seconds between checks of official warning feeds |
| `OPEN_METEO_KEY` | (none) | paid Open-Meteo plan (uses the `customer-` servers) |
| `OPEN_METEO_URL`, `OPEN_METEO_FLOOD_URL`, `OPEN_METEO_ARCHIVE_URL` | Open-Meteo's servers | your own Open-Meteo server(s) |
| `GDACS_URL`, `STAC_URL` | GDACS RSS, Earth Search | other copies of these feeds |
| `WEATHEREX_ENABLED`, `WEATHEREX_PLACES` | off, `30` | WeatherEx model comparison; turn on only with WeatherEx's permission |
| `MAP_TILES_URL`, `MAP_GLYPHS_URL` | OpenFreeMap | street map (vector TileJSON) and its fonts for the 3D map; `off` to turn off; your own tile server for full control |
| `TERRAIN_TILES_URL` | AWS Terrain Tiles (Terrarium) | ground heights for the 3D map and for flood projections; `off` to turn off |

## Administration

```bash
node server.js keys:list
node server.js keys:revoke <key-id>
node server.js keys:trust <key-id>      # this agency's notices skip approval
node server.js approval:off             # all agencies send directly (approval:on to undo)
```

In the console, administrators approve agency notices, review contributions from the public, switch approval on or off, and publish data. To publish, use the backup file downloaded from Open Tracker Admin → Overview → Download backup. People and account ids are removed automatically.

## How people install it

- **iPhone or iPad (Safari)**: Share → Add to Home Screen → Add. Open it from the icon, then tap Turn on alerts. Needs iOS 16.4 or later.
- **Android (Chrome)**: tap Install app, or ⋮ → Install app / Add to Home screen. Open it, then tap Turn on alerts.
- **Computer (Chrome or Edge)**: the install icon in the address bar.

## Flood and heat for every country

People search any town or country. Each country page shows how far heat and floods could reach over the next 7 days,
day by day on a map: warm discs around towns in a heatwave or worse, blue areas for official flood warnings, rising
rivers, heavy rain and current disasters. Each town shows its heat week, flood signs and a **3D flood projection**:
the browser fetches the ground heights around the town, runs Open Tracker's flood model for a chosen storm, river rise
or sea surge, and shows the water hour by hour over the 3D streets and buildings, with depth at the person's spot,
area under water, volume of water and buildings reached. The projection runs on the visitor's phone, so it costs the
server nothing. It can be saved as a replay file for the claude.ai page.

The browser's security policy allows only the map servers set above; scripts always come from this site.

## Data feeds

The server keeps itself supplied with outside data, permanently. Each feed runs on its own timer. With several
servers, one of them runs each feed (a shared lock), and another takes over if it stops. A failing feed keeps its
last good data and retries with growing waits.

| Feed | Source | Gives | Every |
|---|---|---|---|
| `open-meteo-forecast` | Open-Meteo forecast | heat, humidity, wet-bulb and rain for the next 7 days at `FEED_PLACES` places (capitals first, then the largest cities) | 6 h |
| `open-meteo-baselines` | Open-Meteo historical weather (ERA5) | each place's normal heat, so heatwaves are judged by local standards (Excess Heat Factor) | a few places every 90 min |
| `open-meteo-rivers` | Open-Meteo flood API (GloFAS) | river flow for 30 days at towns on large rivers | 12 h |
| `gdacs` | GDACS RSS | current floods, cyclones and droughts worldwide | 10 min |
| `cap` | official CAP feeds that administrators add in the console | warnings from national weather services and disaster agencies | 2 min |
| `satellite-scenes` | Earth Search (Sentinel-1 and Sentinel-2) | the newest satellite pictures of current floods | 6 h |
| `weatherex` (off) | WeatherEx | GFS, ECMWF and ICON side by side | 6 h |

The results become one summary per country at `GET /api/hazards/<CC>` and a world summary at
`GET /api/hazards/world`, cached by the CDN for a minute. Heat levels: normal, hot, heatwave, dangerous, extreme.
In the console (administrators) you see every feed's health, run one now, add official warning feeds, and switch on
**automatic heat alerts**: one alert per place and day when the model rates the heat dangerous, waiting for approval
while approval is on.

**Free Open-Meteo use** is non-commercial and under 10,000 calls a day; the defaults stay inside it. For every place
in the world, run your own Open-Meteo server (open source, data on AWS Open Data) and set the `OPEN_METEO_*_URL`
settings, or buy a plan and set `OPEN_METEO_KEY`. Credit "Weather data by Open-Meteo.com" wherever the numbers
appear (the app does).

## API

| Method and path | Who | What |
|---|---|---|
| `GET /api/notices`, `/api/weather`, `/api/data`, `/api/config` | anyone (cacheable) | live notices, rain forecasts, published data, push key |
| `POST /api/subscribe`, `/api/unsubscribe`, `/api/resubscribe` | the app | phone alert subscriptions and followed places |
| `POST /api/contribute` | anyone | flood reports, corrections, suggestions, data sources |
| `POST /api/notify`, `/api/withdraw`, `GET /api/sent`, `GET /api/whoami` | agency key | send and manage notices |
| `POST /api/decide`, `/api/settings` (approval, automatic heat alerts), `/api/data`, `/api/contributions/decide`; `GET /api/contributions`, `/api/stats` | administrator key | approvals, settings, data, contributions, numbers |
| `GET /api/hazards/<CC>`, `/api/hazards/world`, `/api/sources` | anyone (cacheable) | heat, rivers, official warnings, disasters and satellite pictures per country; the world map; every data source with its licence and status |
| `GET /api/sources/admin`, `/api/cap-feeds`, `/api/snapshot`; `POST /api/sources/run`, `/api/cap-feeds` | administrator key | feed health and errors, run a feed now, add or remove official warning feeds, every country's summary as one file for the claude.ai page |
| `GET /healthz`, `/readyz` | load balancers | liveness and readiness |

Scaling to very large audiences is covered in `docs/SCALING.md` in the main repository.
