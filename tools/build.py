"""Builds both Open Tracker outputs from one source tree.

    python3 tools/build.py

  dist/opentracker.html        the single-page app published on claude.ai (shared database, admin, agencies)
  dist/opentracker-webapp/     the installable web app + push server to host on your own domain
  dist/opentracker-webapp.zip  the same folder, zipped
"""
import hashlib, json, pathlib, shutil, subprocess, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, ASSETS, WEB, DIST, WORLD = ROOT / "src", ROOT / "assets", ROOT / "webapp", ROOT / "dist", ROOT / "world" / "out"

# Load order matters only for top-level statements; every module is plain script sharing one scope.
MODULES = [
    "data/data.js",          # Ghana and Nigeria: areas, flood hotspots, dams, past floods, agencies
    "core/core.js",          # state, settings, risk model, places, search, shared helpers
    "core/auth.js",          # permissions, roles, who may do what
    "features/agency.js",    # agency publishing (posts) and what the public reads from agencies
    "features/notify.js",    # public notifications and followed places
    "features/outlook.js",   # next rainy season outlook: chance, months to watch, reach
    "features/contribute.js",# open-source contributions and the suggestion box
    "features/replay.js",    # flood replays: model hour by hour, satellite date by date, years
    "features/world.js",     # every country and town (world tables), their search entries and emergency numbers
    "features/hazards.js",   # live flood and heat data per country: heat levels, flood signs, projected reach
    "features/floodsim.js",  # the flood projection model: depth, reach and volume on real ground (pure)
    "features/terrain.js",   # ground heights from Terrarium elevation tiles (web app)
    "features/projection.js",# running and showing a projection for any town
    "core/repo.js",          # every write: permission-checked and audit-logged
    "ui/map.js",             # MapLibre map, 2D and 3D
    "ui/views-simple.js",    # the simple, all-ages screens
    "ui/views-expert.js",    # expert filters and model
    "ui/views-admin.js",     # admin backend
    "ui/views-world.js",     # world, country reach, any town, 3D flood projection
    "features/analytics.js", # visit analytics and its dashboard
    "core/approval.js",      # approval of agency changes
    "ui/main.js",            # routing, events, start-up
]
GEO_LAYERS = ["countries", "adminlines", "rivers", "lakes"]
FONTS = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&display=swap"
LOGO = ('<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--accent)"/>'
        '<path d="M16 5c4 5.5 7 9.4 7 13.2A7 7 0 0 1 9 18.2C9 14.4 12 10.5 16 5z" fill="var(--accent-fg)"/>'
        '<path d="M5 26c2.5 0 2.5-1.6 5.5-1.6S13 26 16 26s3-1.6 5.5-1.6S24 26 27 26" stroke="var(--accent-fg)" stroke-width="2" fill="none" stroke-linecap="round"/></svg>')
HEADER = f"""<header class="top"><div class="top-in">
  <button class="brand" data-act="home" aria-label="Open Tracker home">{LOGO}<span class="brand-name"><b>Open Tracker</b><span class="brand-sub">Flood and heat tracker · open source</span></span></button>
  <div class="top-tools">
    <button class="tbtn" data-act="alerts" id="bell" type="button">Alerts</button>
    <button class="tbtn" data-act="ts" id="ts" type="button">Text: normal</button>
    <button class="tbtn" data-act="speak" type="button" aria-label="Read this page aloud">Read aloud</button>
    <div class="modes" id="modes" role="group" aria-label="View"></div>
  </div>
</div></header>
<div id="app"></div>"""
# the reset claude.ai adds around published pages; the web app needs it too
BASE_RESET = """:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0}img{max-width:100%}[hidden]{display:none!important}
"""


def read(p): return p.read_text(encoding="utf-8")


def app_js():
    return "\n".join(f"/* ---- {m} ---- */\n{read(SRC / m)}" for m in MODULES)


WORLD_MIN_POP = 50_000   # towns in the app's world list: capitals and places of at least this many people


def world_data():
    """The world tables (world/build_world.py) in the compact form the app embeds:
    countries by code, and places as rows [id, name, country, region, lon, lat, population, capital, river lon, river lat]."""
    countries = {c["iso2"]: {"n": c["name"], "r": c["region"], "sub": c["subregion"], "pop": c["population"], "ll": c["label"], "b": c["bbox"],
                             "e": c["emergency"][:6], "l": c["languages"][:4]} for c in json.loads(read(WORLD / "countries.json"))}
    places = [[int(p["id"][1:]), p["n"], p["c"], p["a1"], p["ll"][0], p["ll"][1], p["pop"], p["cap"], *(p.get("river") or [0, 0])]
              for p in json.loads(read(WORLD / "places.json")) if p["cap"] or p["pop"] >= WORLD_MIN_POP]
    return {"countries": countries, "places": places}


def geo_js():
    geo = {k: json.loads(read(ASSETS / "geo" / f"{k}.json")) for k in GEO_LAYERS}
    geo["world"] = json.loads(read(WORLD / "world-shapes.json"))
    return ("const GEO = " + json.dumps(geo, separators=(",", ":")) + ";\n"
            + "const WORLD = " + json.dumps(world_data(), ensure_ascii=False, separators=(",", ":")) + ";\n")


def build_artifact(js, geo, css):
    html = f"""<title>Open Tracker</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Open-source flood and heat tracking for every country: projected reach, 3D flood depth and volume, warnings and past floods.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{css}
</style>
{HEADER}
<script src="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js"></script>
<script>
"use strict";
{geo}
{js}
</script>
"""
    (DIST / "opentracker.html").write_text(html, encoding="utf-8")
    return html


def build_webapp(js, geo, css, version):
    out = DIST / "opentracker-webapp"
    pub = out / "public"
    shutil.copytree(WEB, out, ignore=shutil.ignore_patterns("node_modules", ".data", "client", "test", "*.tmp"))
    (pub / "vendor").mkdir(parents=True)
    shutil.copytree(WEB / "client" / "icons", pub / "icons")
    shutil.copy(ASSETS / "vendor" / "maplibre-gl-4.7.1.js", pub / "vendor" / "maplibre-gl.js")
    for f in ["webapp.js", "console.js", "console.html"]:
        shutil.copy(WEB / "client" / f, pub / f)
    (pub / "sw.js").write_text(read(WEB / "client" / "sw.js").replace("__BUILD__", version), encoding="utf-8")
    (pub / "app.js").write_text('"use strict";\n' + js, encoding="utf-8")
    (pub / "geo.js").write_text('"use strict";\n' + geo, encoding="utf-8")
    (pub / "app.css").write_text(BASE_RESET + css, encoding="utf-8")
    (pub / "robots.txt").write_text("User-agent: *\nDisallow: /console.html\nDisallow: /api/\n", encoding="utf-8")
    (pub / "areas.json").write_text(json.dumps(extract_areas(), separators=(",", ":")), encoding="utf-8")
    (pub / "zones.json").write_text(json.dumps(extract_zones(), separators=(",", ":")), encoding="utf-8")
    for name in ["countries.json", "places.json"]:   # world tables for the data feeds (world/build_world.py)
        shutil.copy(WORLD / name, pub / name)
    (pub / "manifest.webmanifest").write_text(json.dumps({
        "id": "/", "name": "Open Tracker (Flood Tracker)", "short_name": "Open Tracker",
        "description": "Open-source flood and heat tracking for every country: projected reach, 3D flood depth and volume, warnings and past floods.",
        "start_url": "/?source=homescreen", "scope": "/", "display": "standalone", "orientation": "any",
        "background_color": "#eef3f3", "theme_color": "#0a6873", "lang": "en", "categories": ["weather", "utilities", "news"],
        "icons": [{"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                  {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                  {"src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}, indent=1), encoding="utf-8")
    (pub / "index.html").write_text(f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Open Tracker</title>
<meta name="description" content="Flood and heat for every country: how far they could reach, 3D flood depth and volume, official warnings.">
<meta name="theme-color" content="#0a6873">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icons/favicon-32.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Open Tracker">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="/app.css?v={version}">
</head>
<body>
{HEADER}
<script src="/vendor/maplibre-gl.js"></script>
<script src="/geo.js?v={version}"></script>
<script src="/webapp.js?v={version}"></script>
<script src="/app.js?v={version}"></script>
</body>
</html>
""", encoding="utf-8")
    zpath = DIST / "opentracker-webapp.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(out.rglob("*")):
            if f.is_file():
                z.write(f, "opentracker-webapp/" + str(f.relative_to(out)))
    return out


def run_data(expr):
    """evaluates an expression against the data module with Node and returns the JSON result"""
    script = "const FT = {};\n" + read(SRC / "data" / "data.js").replace("const FT = {};", "") + f"\nprocess.stdout.write(JSON.stringify({expr}));"
    return json.loads(subprocess.run(["node", "-e", script], check=True, capture_output=True, text=True).stdout)


def extract_zones():
    """one forecast point per weather zone: the average position of the zone's flood areas"""
    return run_data("""Object.fromEntries(Object.entries(FT.climate).map(([z, c]) => {
      const hs = FT.hotspots.filter(h => h.z === z);
      const ll = hs.length ? [hs.reduce((a, h) => a + h.ll[0], 0) / hs.length, hs.reduce((a, h) => a + h.ll[1], 0) / hs.length] : null;
      return [z, {n: c.n, ll: ll && ll.map(v => Math.round(v * 1e3) / 1e3)}];
    }).filter(([, v]) => v.ll))""")


def extract_areas():
    """regions and states for the push console"""
    return run_data("FT.areas.map(a => ({id: a.id, c: a.c, n: a.n}))")


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    js, geo, css = app_js(), geo_js(), read(SRC / "ui" / "style.css")
    version = hashlib.sha256("".join([js, css] + [read(WEB / "client" / f) for f in ("webapp.js", "sw.js", "console.js", "console.html")]).encode()).hexdigest()[:10]
    html = build_artifact(js, geo, css)
    out = build_webapp(js, geo, css, version)
    (DIST / "app.check.js").write_text('"use strict";\nconst GEO = {};\nconst WORLD = {countries: {}, places: []};\n' + read(WEB / "client" / "webapp.js") + "\n" + js, encoding="utf-8")
    print(f"dist/opentracker.html  {len(html) / 1024:.0f} KB")
    print(f"dist/opentracker-webapp/  version {version}  ({sum(f.stat().st_size for f in out.rglob('*') if f.is_file()) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
