"""Browser test of the self-hosted web app against a running server (default http://127.0.0.1:8099).
   python3 tests/web/webapp_test.py <admin-key-file> <agency-key-file>"""
import io, json, math, sys, pathlib
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
BASE = "http://127.0.0.1:8099"
ADMIN, AGENCY = (pathlib.Path(p).read_text().strip() for p in sys.argv[1:3])
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={"width": 390, "height": 844}, geolocation={"latitude": 5.567, "longitude": -0.243}, permissions=["geolocation", "notifications"])
    ctx.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    # outside map services, stood in for: an empty street map, and made-up ground heights (Terrarium PNG) around Accra:
    # a valley running north-south through the town, ground rising east and west, sea to the south
    def terrain(route):
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
    ctx.route("https://s3.amazonaws.com/elevation-tiles-prod/**", terrain)
    tilejson = {"tilejson": "3.0.0", "tiles": ["https://tiles.openfreemap.org/planet/test/{z}/{x}/{y}.pbf"], "minzoom": 0, "maxzoom": 14,
                "vector_layers": [{"id": k, "fields": {}} for k in ["water", "waterway", "transportation", "building", "landcover", "place", "transportation_name"]]}
    ctx.route("https://tiles.openfreemap.org/**", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(tilejson), headers={"Access-Control-Allow-Origin": "*"})
              if r.request.url.endswith("/planet") else r.fulfill(status=200, body=b"", headers={"Access-Control-Allow-Origin": "*"}))
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
    page.on("console", lambda m: m.type == "error" and errors.append(("console", m.text)))
    click = lambda s: (page.locator(s).first.click(), page.wait_for_timeout(300))
    page.goto(BASE + "/"); page.wait_for_timeout(1500)
    print("title:", page.title(), "| modes:", page.inner_text("#modes").replace("\n", " "))
    print("sw:", page.evaluate("navigator.serviceWorker.getRegistration().then(r => !!r)"))
    print("manifest:", page.evaluate("fetch('/manifest.webmanifest').then(r=>r.json()).then(m=>m.display+' '+m.icons.length)"))
    # agency sends notice through the console
    c = ctx.new_page(); c.on("pageerror", lambda e: errors.append(("console-page", str(e))))
    c.goto(BASE + "/console.html"); c.fill("#key", AGENCY); c.click("#login-form button"); c.wait_for_timeout(500)
    print("console who:", c.inner_text("#who"), "|", c.inner_text("#approval-note"))
    c.select_option("#n-level", "warning"); c.fill("#n-title", "Evacuate Odaw banks"); c.fill("#n-msg", "Move to Kaneshie Sports Complex now.")
    c.check("#n-areas input[value='GH-AA']"); c.click("#send-btn"); c.wait_for_timeout(600); print("send:", c.inner_text("#send-msg"))
    # admin approves
    c.click("#signout"); c.fill("#key", ADMIN); c.click("#login-form button"); c.wait_for_timeout(500)
    print("pending rows:", c.locator("#pending tr").count()); c.click("[data-decide='1']"); c.wait_for_timeout(600); print("decide:", c.inner_text("#decide-msg"))
    # publish data backup with a notice field change
    backup = {"app": "Open Tracker", "settings": {"notice": "Published from Admin test"}, "members": [{"id": "secret"}]}
    path = pathlib.Path("/tmp/claude-0/-home-claude/5c845408-6012-5115-aa5b-d1771075bc64/scratchpad/backup.json"); path.write_text(json.dumps(backup))
    c.set_input_files("#data-file", str(path)); c.wait_for_timeout(600); print("publish:", c.inner_text("#admin-msg"))
    # the public app picks it up
    page.reload(); page.wait_for_timeout(1500)
    print("notice banner:", "Published from Admin test" in page.inner_text("#app"))
    print("bell:", page.inner_text("#bell").replace("\n", " "))
    click("#bell"); t = page.inner_text("#app"); print("alert listed:", "Evacuate Odaw banks" in t, "| from:", "Ministry of the Interior (Ghana)" in t)
    print("controls:", page.inner_text("#app")[page.inner_text("#app").find("Get alerts on your phone"):][:400].replace("\n", " | "))
    click("[data-act=wa-locate]"); page.wait_for_timeout(800)
    print("after locate:", page.inner_text("#app")[page.inner_text("#app").find("Your location"):][:160].replace("\n", " | "))
    if page.locator("[data-act=wa-push]").count():   # headless Chromium reports notifications as denied, so this runs only in a headed browser
        click("[data-act=wa-push]"); page.wait_for_timeout(3000)
        print("push sub:", page.evaluate("navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription()).then(s => s ? s.endpoint.slice(0,40) : null)"))
    else: print("push: permission", page.evaluate("Notification.permission"), "in this browser; subscription step skipped")
    page.screenshot(path="/tmp/claude-0/-home-claude/5c845408-6012-5115-aa5b-d1771075bc64/scratchpad/web-alerts.png", full_page=True)
    # open-source contributions from the public, reviewed in the console
    click(".brand"); click("[data-act=contribute][data-k=suggestion]"); page.fill("#c-text", "Add Hausa and Twi"); page.click("#contrib-form button[type=submit]"); page.wait_for_timeout(600)
    print("contribution:", "Thank you" in page.inner_text("#app"))
    c.reload(); c.wait_for_timeout(800); print("console contributions:", "Add Hausa and Twi" in c.inner_text("#contribs"))
    click(".brand"); click("[data-act=outlook]"); print("outlook:", page.inner_text("h1"))
    # flood replays published from the console (made-up test fixtures), watched in the app
    fix = pathlib.Path(__file__).resolve().parents[2] / "webapp" / "test" / "fixtures"
    c.click("#signout"); c.fill("#key", ADMIN); c.click("#login-form button"); c.wait_for_timeout(500)
    c.set_input_files("#replay-file", str(fix / "test-terrain-replay.json")); c.wait_for_timeout(800); print("replay upload:", c.inner_text("#replay-msg"))
    c.set_input_files("#replay-file", str(fix / "test-satellite-replay.json")); c.wait_for_timeout(800)
    # data feeds: every source listed with its status; unsafe warning-feed addresses refused; heat alerts switch
    print("feeds listed:", c.locator("#feeds tr").count(), "| first:", c.inner_text("#feeds tr >> nth=0").split("\n")[0])
    c.fill("#cap-c", "NG"); c.fill("#cap-agency", "Test agency"); c.fill("#cap-url", "https://10.0.0.1/feed.xml"); c.click("#cap-form button"); c.wait_for_timeout(500)
    print("private feed refused:", c.inner_text("#feeds-msg"))
    c.check("#auto-heat"); c.wait_for_timeout(500); print("auto heat:", c.inner_text("#feeds-msg"))
    print("sources api:", page.evaluate("fetch('/api/sources').then(r=>r.json()).then(j=>j.sources.length)"), "| hazards api:", page.evaluate("fetch('/api/hazards/NG').then(r=>r.status)"))
    page.reload(); page.wait_for_timeout(1500)
    if page.locator(".livealert").count(): click("[data-act=live-close]")   # a new alert pops up over the page; close it
    click("[data-act=replays]"); click("[data-act=replay-open][data-id=test-test]"); page.wait_for_timeout(1500)
    page.evaluate("() => { const s = document.querySelector('#rp-slider'); s.value = 3; s.dispatchEvent(new Event('input', {bubbles: true})); }"); page.wait_for_timeout(1000)
    print("web replay:", page.inner_text("#rp-now"), "| layers:", page.evaluate("MAPV.map.getSource('replay')._data.features.length"))
    # every country: live flood and heat data, a country's reach, and the 3D flood projection for a town
    click(".brand"); click("[data-act=world]"); page.wait_for_timeout(1200); print("world watch:", page.inner_text(".card .results")[:80].replace("\n", " | "))
    click("[data-act=reach][data-k=NG]"); page.wait_for_timeout(1200); print("NG reach:", page.inner_text("#say").replace("\n", " | "), "| heat discs:", page.evaluate("MAPV.map.getSource('heatReach')._data.features.length"))
    click(".brand"); page.fill("#q", "accra"); page.wait_for_timeout(300); page.locator("#results [data-act=open][data-type=wp]").first.click(); page.wait_for_timeout(1200)
    print("Accra heat:", page.inner_text(".heat-card").replace("\n", " | "))
    click("[data-act=project]"); page.wait_for_timeout(1500)
    print("scenarios:", page.locator(".choice").all_inner_texts()[:5])
    print("3D:", page.evaluate("[MAPV.map.getPitch() > 40, !!MAPV.map.getTerrain(), !!MAPV.map.getLayer('omtBuildings')]"))
    click("[data-act=proj-sc][data-k=surge]"); click("[data-act=proj-run]")
    page.wait_for_selector("#proj-now", timeout=90000); page.wait_for_timeout(800)
    print("projection:", page.inner_text("#say").replace("\n", " | "))
    print("stats:", page.inner_text(".stats").replace("\n", " | "))
    print("hour:", page.inner_text("#proj-now"), "| overlay:", page.evaluate("MAPV.map.getLayoutProperty('projImg', 'visibility')"))
    page.screenshot(path="/tmp/claude-0/-home-claude/5c845408-6012-5115-aa5b-d1771075bc64/scratchpad/web-projection.png", full_page=True)
    page.evaluate("() => { const s = document.querySelector('#proj-slider'); s.value = 2; s.dispatchEvent(new Event('input', {bubbles: true})); }"); page.wait_for_timeout(500)
    print("hour 2:", page.inner_text("#proj-now"))
    print("balance:", page.inner_text(".card:has(h2:text('Where the water went')) ul").replace("\n", " | "))
    with page.expect_download() as dl: click("[data-act=proj-export]")
    saved = json.loads(pathlib.Path(dl.value.path()).read_text())
    print("saved replay:", saved["replay"]["id"], len(saved["frames"]), "steps, peak", max(f["m3"] for f in saved["frames"]), "m³")
    r = page.evaluate("f => fetch('/api/replays', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + f.k}, body: JSON.stringify(f.b)}).then(r => r.status)", {"k": ADMIN, "b": saved})
    print("server accepts the saved replay:", r)
    click("[data-act=proj-sc][data-k=heavy]"); click("[data-act=proj-run]"); page.wait_for_selector("#proj-now", timeout=90000); page.wait_for_timeout(500)
    print("heavy storm:", page.inner_text("#say").replace("\n", " | "))
    # offline: app shell from the service worker
    click(".brand"); page.wait_for_timeout(500)   # leave the 3D screen: software WebGL in this test browser can hold up a reload
    page.evaluate("navigator.serviceWorker.ready.then(() => true)")   # the app shell is cached before going offline
    ctx.set_offline(True); page.reload(wait_until="domcontentloaded"); page.wait_for_selector("header", timeout=15000); page.wait_for_timeout(1500); print("offline renders:", "Open Tracker" in page.inner_text("header"), "| alerts cached:", page.evaluate("fetch('/api/notices').then(r => r.json()).then(j => j.notices.some(n => /Evacuate/.test(n.title)))"))
    ctx.set_offline(False)
    b.close()
errors = [e for e in errors if "ERR_INTERNET_DISCONNECTED" not in e[1]]   # expected during the offline check
print("ERRORS:", json.dumps(errors, indent=1) if errors else "none")
