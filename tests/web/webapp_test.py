"""Browser test of the self-hosted web app: starts a real server on a free port with its own data folder,
creates keys, loads made-up live data, and drives the app, the push console and the 3D flood projection.

    python3 tools/build.py && (cd dist/opentracker-webapp && npm ci)
    python3 tests/web/webapp_test.py

Outside map services are stood in for (made-up ground heights and an empty street map). Every check waits for the
page instead of sleeping, and the exit code is non-zero when any check fails or the page logs an error."""
import io, json, os, pathlib, re, shutil, socket, subprocess, sys, tempfile, time, traceback
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[2]
APP = pathlib.Path(os.environ.get("WEBAPP_DIR", ROOT / "dist" / "opentracker-webapp"))
FIX = ROOT / "webapp" / "test" / "fixtures"
SHOTS = pathlib.Path(os.environ.get("SHOTS", ROOT / "tests" / "web" / "out")); SHOTS.mkdir(parents=True, exist_ok=True)
TIMEOUT = 30_000   # the 3D map renders in software (no GPU) in test browsers, which can keep the page busy for seconds
expect.set_options(timeout=TIMEOUT)
METRICS_TOKEN = "test-metrics-token-0123456789abcdef"
checks = {"n": 0}


# ---------- the server ----------
def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_server():
    data = pathlib.Path(tempfile.mkdtemp(prefix="ot-web-"))
    env = dict(os.environ, DATA_DIR=str(data), FEEDS_OFF="all", PORT=str(free_port()), HOST="127.0.0.1", METRICS_TOKEN=METRICS_TOKEN, LOG_LEVEL="warn")
    key = lambda *a: re.search(r"(otk_[A-Za-z0-9_-]+)", subprocess.run(["node", "server.js", "keys:add", *a], cwd=APP, env=env, capture_output=True, text=True, check=True).stdout).group(1)
    keys = {"admin": key("opentracker", "Open Tracker team", "--admin"), "agency": key("moi-gh", "Ministry of the Interior (Ghana)")}
    snap = json.loads((FIX / "test-snapshot.json").read_text())   # live data, as the feeds would have written it
    (data / "docs").mkdir(exist_ok=True)
    for c, doc in snap["countries"].items():
        (data / "docs" / f"hazards__{c}.json").write_text(json.dumps(doc))
    (data / "docs" / "hazards__world.json").write_text(json.dumps(snap["world"]))
    proc = subprocess.Popen(["node", "server.js"], cwd=APP, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    base = f"http://127.0.0.1:{env['PORT']}"
    for _ in range(100):
        try:
            with socket.create_connection(("127.0.0.1", int(env["PORT"])), timeout=0.2):
                break
        except OSError:
            if proc.poll() is not None:
                raise RuntimeError("the server stopped: " + proc.stdout.read())
            time.sleep(0.1)
    return proc, base, keys, data


# ---------- stand-ins for outside map services ----------
def terrain(route):
    """made-up ground heights (Terrarium PNG) around Accra: a valley running north-south, sea to the south"""
    z, x, y = (int(v) for v in route.request.url.rstrip(".png").split("/")[-3:])
    n = 2 ** z
    px = (np.arange(256) + 0.5) / 256
    lon = (x + px) / n * 360 - 180
    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (y + px[:, None]) / n))))
    h = 4 + 900 * np.abs(lon[None, :] + 0.219) + 300 * (lat - 5.535)
    h = np.where(lat < 5.533, -6.0, h)
    v = h + 32768
    rgb = np.stack([np.floor(v / 256), np.floor(v) % 256, np.floor((v % 1) * 256)], axis=-1).astype(np.uint8)
    buf = io.BytesIO(); Image.fromarray(rgb, "RGB").save(buf, "PNG")
    route.fulfill(status=200, content_type="image/png", body=buf.getvalue(), headers={"Access-Control-Allow-Origin": "*"})


TILEJSON = {"tilejson": "3.0.0", "tiles": ["https://tiles.openfreemap.org/planet/test/{z}/{x}/{y}.pbf"], "minzoom": 0, "maxzoom": 14,
            "vector_layers": [{"id": k, "fields": {}} for k in ["water", "waterway", "transportation", "building", "landcover", "place", "transportation_name"]]}


def omt(route):
    if route.request.url.endswith("/planet"):
        route.fulfill(status=200, content_type="application/json", body=json.dumps(TILEJSON), headers={"Access-Control-Allow-Origin": "*"})
    else:
        route.fulfill(status=200, body=b"", headers={"Access-Control-Allow-Origin": "*"})


def http_get(url, token=None):
    import urllib.request, urllib.error
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token} if token else {})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def http_post(url, body):
    """status of a JSON POST made from outside the browser (expected refusals stay out of the page's console)"""
    import urllib.request, urllib.error
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


# ---------- checks ----------
def eq(actual, expected, what):
    checks["n"] += 1
    assert actual == expected, f"{what}: expected {expected!r}, got {actual!r}"


def check(cond, what):
    checks["n"] += 1
    assert cond, what


def step(label):
    print("  -", label, flush=True)


def run(base, keys):
    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        ctx = b.new_context(viewport={"width": 390, "height": 844}, geolocation={"latitude": 5.567, "longitude": -0.243}, permissions=["geolocation", "notifications"],
                            timezone_id="Africa/Lagos", locale="en-US")   # same results on any machine
        ctx.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
        ctx.route("https://s3.amazonaws.com/elevation-tiles-prod/**", terrain)
        ctx.route("https://tiles.openfreemap.org/**", omt)
        ctx.add_init_script("for (const k of ['MAPV', 'DB', 'REPO']) Object.defineProperty(window, k, {get: () => window.OpenTracker && window.OpenTracker[k], configurable: true});")
        page = ctx.new_page(); page.set_default_timeout(TIMEOUT)
        page.on("pageerror", lambda e: errors.append(f"page error: {e}"))
        page.on("console", lambda m: m.type == "error" and errors.append(f"console error: {m.text}"))
        # a new official alert pops up over whatever screen is open; close it whenever it gets in the way
        page.add_locator_handler(page.locator(".livealert"), lambda: page.locator("[data-act=live-close]").click())

        def see(text, where="#app", on=None):
            checks["n"] += 1
            expect((on or page).locator(where).first).to_contain_text(text)

        def until(js, arg=None, what=None, on=None, timeout=TIMEOUT):
            checks["n"] += 1
            try:
                (on or page).wait_for_function(js, arg=arg, timeout=timeout)
            except Exception:
                raise AssertionError(f"timed out waiting for: {what or js}")

        def api(path, key=None, body=None, method=None):
            """status and JSON (or text) of a request made from the page"""
            return page.evaluate("""async ({path, key, body, method}) => {
                const r = await fetch(path, {method: method || (body ? "POST" : "GET"), headers: Object.assign({}, key ? {Authorization: "Bearer " + key} : {}, body ? {"Content-Type": "application/json"} : {}), body: body ? JSON.stringify(body) : undefined});
                const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
                return {status: r.status, json: j, text: t, type: r.headers.get("content-type")};
            }""", {"path": path, "key": key, "body": body, "method": method})

        def src_count(sid):
            until("id => MAPV.ready && MAPV.map.getSource(id)", sid, f"map source {sid}")
            return page.evaluate("id => MAPV.map.getSource(id).getData().then(d => d.features.length)", sid)

        def map_idle():
            until("() => MAPV.ready && !MAPV.map.isMoving()", what="the map to settle")

        AXE = (ROOT / "tools" / "lint" / "node_modules" / "axe-core" / "axe.min.js").read_text()

        def accessible(pg, label):
            """no WCAG 2.2 A/AA or best-practice violation on the page as it is now"""
            if not pg.evaluate("!!window.axe"):
                pg.evaluate(AXE + "\n;0")   # through the test browser itself: the site's security policy rightly refuses injected scripts
            pg.evaluate("window.scrollTo(0, 0)")
            found = pg.evaluate("""() => axe.run(document, {preload: false, runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa','best-practice']}})
                .then(r => r.violations.map(v => `${v.impact} ${v.id}: ${v.help} (${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join('; ')})`))""")
            eq(found, [], f"accessibility of {label}")

        def console_login(c, key):
            if c.locator("#signout").is_visible():
                c.click("#signout")
            c.fill("#key", key); c.click("#login-form button")
            expect(c.locator("#who")).not_to_be_empty()

        try:
            step("the installable app: page, service worker, manifest, security headers, MapLibre modules")
            page.goto(base + "/")
            expect(page).to_have_title("Open Tracker")
            expect(page.locator("#modes button")).to_have_text(["Simple", "Expert"])
            until("() => navigator.serviceWorker.getRegistration().then(r => !!r)", what="the service worker registered")
            m = api("/manifest.webmanifest")["json"]
            eq((m["display"], len(m["icons"])), ("standalone", 3), "the app installs standalone with three icons")
            mod = api("/vendor/maplibre-gl.mjs")
            eq((mod["status"], mod["type"]), (200, "text/javascript; charset=utf-8"), "MapLibre's module is served as JavaScript")
            eq(api("/vendor/maplibre-gl-worker.mjs")["status"], 200, "MapLibre's worker is served beside it")
            csp = page.evaluate("fetch('/').then(r => r.headers.get('content-security-policy'))")
            check("script-src 'self'" in csp and "worker-src 'self' blob:" in csp and "frame-ancestors 'none'" in csp, f"strict security policy: {csp}")

            step("monitoring endpoints")
            eq(api("/readyz")["status"], 200, "ready")
            eq(api("/readyz/feeds")["json"], {"ok": True}, "no stale feeds (feeds are off in this test)")
            eq(http_get(base + "/metrics")[0], 401, "/metrics needs its token")   # from outside the browser, as a monitoring system calls it
            status, text = http_get(base + "/metrics", METRICS_TOKEN)
            check(status == 200 and "opentracker_http_requests_total" in text and "opentracker_subscribers 0" in text, "metrics with the token")

            step("an agency sends a warning through the console; an administrator approves it")
            c = ctx.new_page(); c.set_default_timeout(TIMEOUT)
            c.on("pageerror", lambda e: errors.append(f"console page error: {e}"))
            c.goto(base + "/console.html")
            accessible(c, "the push console sign-in")
            console_login(c, keys["agency"])
            see("Ministry of the Interior (Ghana)", "#who", c)
            see("Your notices are checked by an Open Tracker administrator before they reach phones.", "#approval-note", c)
            c.select_option("#n-level", "warning"); c.fill("#n-title", "Evacuate Odaw banks"); c.fill("#n-msg", "Move to Kaneshie Sports Complex now.")
            c.check("#n-areas input[value='GH-AA']"); c.click("#send-btn")
            see("Sent for approval. It reaches phones once approved.", "#send-msg", c)
            eq(api("/api/notices")["json"]["notices"], [], "nothing public before approval")
            console_login(c, keys["admin"])
            expect(c.locator("#pending tr")).to_have_count(1)
            c.click("[data-decide='1']")
            see("Approved. Sending to 0 phones.", "#decide-msg", c)
            accessible(c, "the push console, signed in as administrator")
            eq([n["title"] for n in api("/api/notices")["json"]["notices"]], ["Evacuate Odaw banks"], "the warning is public")

            step("publishing data: personal details are removed")
            backup = {"app": "Open Tracker", "settings": {"notice": "Published from Admin test"}, "members": [{"id": "secret"}]}
            path = SHOTS / "backup.json"; path.write_text(json.dumps(backup))
            c.set_input_files("#data-file", str(path))
            see("Published. Everyone sees the new data", "#admin-msg", c)
            published = api("/api/data")["json"]
            check("secret" not in json.dumps(published), "people and account ids are not published")

            step("the public app shows the notice and the warning")
            page.reload()
            see("Published from Admin test")
            until("() => /\\d/.test(document.querySelector('#bell').textContent)", what="the alert count on the bell")
            page.click("#bell")
            see("Evacuate Odaw banks"); see("Ministry of the Interior (Ghana)")
            see("Get alerts on your phone"); see("Add to Home Screen")
            page.click("[data-act=wa-locate]")
            see("Your location is saved on this device (near Kaneshie).")
            accessible(page, "the web app's alerts screen with install steps")
            if page.evaluate("Notification.permission") == "denied":
                print("    (this browser refuses notifications, so subscribing is covered by the server tests)")
            page.screenshot(path=str(SHOTS / "web-alerts.png"), full_page=True)

            step("a contribution from the public reaches the console")
            page.click(".brand"); page.click("[data-act=contribute][data-k=suggestion]")
            page.fill("#c-text", "Add Hausa and Twi"); page.click("#contrib-form button[type=submit]")
            see("Thank you. We've received it.")
            c.reload()   # the administrator stays signed in for this browser session
            see("Open Tracker team", "#who", c)
            see("Add Hausa and Twi", "#contribs", c)

            step("hostile text from the public stays text in the console and the app")
            P = '<img src=x onerror="window.__xss=1">"\'><svg onload="window.__xss=1"></svg>'
            eq(http_post(base + "/api/contribute", {"type": "report", "text": "Flood " + P, "src": "javascript:window.__xss=1"}), 400, "a script link is refused")
            eq(api("/api/contribute", body={"type": "report", "text": "Flood " + P, "placeText": P, "src": "https://example.org/x"})["status"], 202, "hostile text is accepted as text")
            c.reload(); see("Flood <img src=x", "#contribs", c)
            for pg, where in [(c, "the console"), (page, "the app")]:
                eq(pg.evaluate("""() => ({ran: window.__xss || 0, tags: document.querySelectorAll('img[src="x"], svg[onload], [onerror], [onload]').length,
                    links: [...document.querySelectorAll('[href]')].filter(e => /^\\s*javascript:/i.test(e.getAttribute('href'))).length})"""), {"ran": 0, "tags": 0, "links": 0}, f"nothing injected in {where}")
            page.click(".brand"); page.click("[data-act=outlook]")
            see("2027 rainy season outlook", "h1")

            step("replays published from the console")
            c.set_input_files("#replay-file", str(FIX / "test-terrain-replay.json"))
            see("Published “test-test” with 16 steps.", "#replay-msg", c)
            c.set_input_files("#replay-file", str(FIX / "test-satellite-replay.json"))
            see("Published “test-outlines”", "#replay-msg", c)

            step("data feeds: every source listed; unsafe addresses refused; automatic heat alerts")
            expect(c.locator("#feeds tr")).to_have_count(7)
            see("Open-Meteo forecast", "#feeds tr", c)
            c.fill("#cap-c", "NG"); c.fill("#cap-agency", "Test agency"); c.fill("#cap-url", "https://10.0.0.1/feed.xml"); c.click("#cap-form button")
            see("the address is not on the public internet", "#feeds-msg", c)
            c.check("#auto-heat")
            see("Automatic heat alerts are on.", "#feeds-msg", c)
            eq(api("/api/sent", keys["admin"])["json"]["autoHeatAlerts"], True, "the setting is saved on the server")
            eq(len(api("/api/sources")["json"]["sources"]), 7, "the sources list")
            eq(api("/api/hazards/NG")["status"], 200, "Nigeria's live data")

            step("watching a replay in the app")
            page.reload()
            page.click("[data-act=replays]"); page.click("[data-act=replay-open][data-id=test-test]")
            see("Start ·", "#rp-now")
            page.evaluate("() => { const s = document.querySelector('#rp-slider'); s.value = 3; s.dispatchEvent(new Event('input', {bubbles: true})); }")
            see("3 hours · 29 June 2026 09:00 GMT · 0.4 km² under water", "#rp-now")
            map_idle()
            eq(src_count("replay"), 3, "three depth classes drawn")

            step("every country: the world, Nigeria's reach, Accra's heat")
            page.click(".brand"); page.click("[data-act=world]")
            see("Nigeria", ".card .results"); see("2 towns in dangerous heat · 1 current disaster · 1 river rising fast", ".card .results")
            page.click("[data-act=reach][data-k=NG]")
            see("Heatwave or worse in 2 towns where about 4.0 million people live.", "#say")
            map_idle()
            eq(src_count("heatReach"), 2, "two heat discs")
            page.click(".brand"); page.fill("#q", "accra"); page.locator("#results [data-act=open][data-type=wp]").first.click()
            see("Normal heat", ".heat-card"); see("Today: high 31 °C, feels like 34 °C, wet-bulb 25 °C.", ".heat-card")

            step("the 3D flood projection for Accra")
            page.click("[data-act=project]")
            expect(page.locator(".choice")).to_have_count(4)
            see("Forecast rain: 140 mm", ".choice >> nth=0"); see("Heavy storm: 100 mm", ".choice >> nth=1")
            see("Extreme storm: 200 mm", ".choice >> nth=2"); see("Sea surge: 1 m", ".choice >> nth=3")
            map_idle()
            until("() => MAPV.map.getPitch() > 40 && !!MAPV.map.getTerrain() && !!MAPV.map.getLayer('omtBuildings')", what="3D ground, pitch and buildings")
            page.click("[data-act=proj-sc][data-k=surge]"); page.click("[data-act=proj-run]")
            page.wait_for_selector("#proj-now", timeout=90_000)
            see("At your saved location in this projection (sea surge: 1 m).", "#say")
            stats = page.inner_text(".stats").split("\n")
            eq(stats, ["Area under water at the peak", "0.77 km²", "Water on the ground at the peak", "1.2 million m³", "about 470 Olympic pools", "Deepest water", "1.0 m", "Peak", "hour 5"], "the projection's numbers")
            see("Hour 5 · 0.77 km² under water · 1.2 million m³ of water", "#proj-now")
            eq(page.evaluate("MAPV.map.getLayoutProperty('projImg', 'visibility')"), "visible", "the water is drawn over the 3D map")
            accessible(page, "the 3D projection with its results")
            page.screenshot(path=str(SHOTS / "web-projection.png"), full_page=True, timeout=60_000)   # software-rendered 3D: slow on a busy machine
            page.evaluate("() => { const s = document.querySelector('#proj-slider'); s.value = 2; s.dispatchEvent(new Event('input', {bubbles: true})); }")
            see("Hour 2 · 0 km² under water · 395 thousand m³ of water", "#proj-now")
            see("Rain that ran off the ground: 1.8 million m³.")
            see("Flowed out of the area or into the sea: 1.7 million m³. Still standing at hour 12: 127 thousand m³.")
            with page.expect_download() as dl:
                page.click("[data-act=proj-export]")
            saved = json.loads(pathlib.Path(dl.value.path()).read_text())
            eq((saved["app"], bool(re.fullmatch(r"proj-p1159151403-surge-\d{8}", saved["replay"]["id"])), len(saved["frames"])), ("OpenTracker-replay", True, 13), "the saved projection file: Accra, sea surge, dated, 13 hours")
            eq(max(f["m3"] for f in saved["frames"]), 1175586, "its peak volume in m³")
            eq(api("/api/replays", keys["admin"], saved)["status"], 200, "the server accepts the saved projection")
            page.click("[data-act=proj-sc][data-k=heavy]"); page.click("[data-act=proj-run]")
            checks["n"] += 1
            expect(page.locator("#say")).to_contain_text("(heavy storm: 100 mm)", timeout=90_000)   # a full model run, like the first one

            step("offline: the app shell and the last alerts come from the service worker")
            page.click(".brand")
            page.evaluate("navigator.serviceWorker.ready.then(() => true)")
            ctx.set_offline(True)
            page.reload(wait_until="domcontentloaded")
            see("Open Tracker", "header")
            eq(page.evaluate("fetch('/api/notices').then(r => r.json()).then(j => j.notices.some(n => /Evacuate/.test(n.title)))"), True, "the last alerts are available offline")
            ctx.set_offline(False)

            step("a low-cost phone on slow mobile data: usable within budget")
            slow = b.new_context(viewport={"width": 360, "height": 740}, timezone_id="Africa/Lagos", locale="en-US", service_workers="block")
            slow.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
            slow.route("https://tiles.openfreemap.org/**", omt)
            sp = slow.new_page()
            cdp = slow.new_cdp_session(sp)
            cdp.send("Network.enable")
            cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})
            # Chrome's "Fast 3G" preset: 1.6 Mbit/s down, 750 kbit/s up, 150 ms; and a phone CPU four times slower
            cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 1.6e6 / 8, "uploadThroughput": 750e3 / 8})
            cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
            sent = {}
            cdp.on("Network.loadingFinished", lambda e: sent.__setitem__(e["requestId"], e["encodedDataLength"]))
            t0 = time.monotonic()
            sp.goto(base + "/", wait_until="commit")
            expect(sp.locator("h1")).to_contain_text("Is my area at risk", timeout=30_000)
            expect(sp.locator("#q")).to_be_editable(timeout=30_000)
            usable_s = time.monotonic() - t0
            usable_kb = sum(sent.values()) / 1024
            sp.fill("#q", "kaneshie")
            expect(sp.locator("#results")).to_contain_text("Kaneshie", timeout=30_000)
            print(f"    usable in {usable_s:.1f} s after {usable_kb:.0f} KB on Fast 3G with a 4x slower CPU", flush=True)
            check(usable_s < 10, f"home screen usable within 10 s on slow mobile data (took {usable_s:.1f} s)")
            check(usable_kb < 500, f"under 500 KB sent before the home screen is usable ({usable_kb:.0f} KB)")
            slow.close()
        except Exception:
            try: page.screenshot(path=str(SHOTS / "web-failure.png"), full_page=True, timeout=10_000)   # what the page showed when the check failed
            except Exception: pass
            print("page at failure:", page.inner_text("#app")[:1500].replace("\n", " | "))
            raise
        b.close()
    return [e for e in errors if "ERR_INTERNET_DISCONNECTED" not in e]   # expected while offline


def main():
    if not (APP / "node_modules").exists():
        sys.exit(f"run npm ci in {APP} first")
    proc, base, keys, data = start_server()
    failure, errors = None, []
    try:
        errors = run(base, keys)
    except Exception:
        failure = traceback.format_exc(limit=3)
    finally:
        proc.terminate()
        try:
            proc.wait(10)
        except subprocess.TimeoutExpired:
            proc.kill()
        shutil.rmtree(data, ignore_errors=True)
    if failure or errors:
        print(f"FAIL webapp_test after {checks['n']} checks")
        if failure:
            print(failure)
        for e in errors[:10]:
            print("  ", e)
        sys.exit(1)
    print(f"PASS webapp_test: {checks['n']} checks")


if __name__ == "__main__":
    main()
