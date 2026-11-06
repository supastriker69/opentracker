# script injection: hostile text and links in every place data comes from must show as plain text and never run.
# Sources covered: every kind of shared record (as a compromised editor could store it), agency posts, access
# requests, public contributions, search words, imported replay files and imported live data (towns, official
# warnings, disasters). Every screen that shows them is opened, as the owner, an agency publisher and the public.
P = '<img src=x onerror="window.__xss=(window.__xss||0)+1">"\'><svg onload="window.__xss=(window.__xss||0)+1"></svg>'
BAD_LINK = "javascript:window.__xss=(window.__xss||0)+1"
TEXT_KEYS = ["n", "t", "desc", "msg", "title", "notice", "note", "text", "name", "label", "station", "why", "where", "advice", "reason", "headline",
             "agency", "river", "lastNotice", "num", "aka"]
LINK_KEYS = ["src", "link", "url", "web"]
FIX = ROOT / "webapp" / "test" / "fixtures"


def hostile(rec):
    """the record with every display text replaced by the payload and every link by a script address"""
    out = dict(rec)
    for k, v in rec.items():
        if k in TEXT_KEYS and isinstance(v, str):
            out[k] = P + " " + v
        elif k in TEXT_KEYS and isinstance(v, list) and all(isinstance(x, str) for x in v):
            out[k] = [P + " " + x for x in v] or [P]
        elif k in LINK_KEYS and isinstance(v, str):
            out[k] = BAD_LINK
    return out


def safe_here(where):
    """nothing injected exists or ran on the current screen, and no link can run a script"""
    counted = page.evaluate("""() => ({
        ran: window.__xss || 0,
        tags: document.querySelectorAll('img[src="x"], svg[onload], [onerror], [onload]').length,
        links: [...document.querySelectorAll('[href], [src], [action], [formaction]')].filter(e => /^\\s*javascript:/i.test(e.getAttribute('href') || e.getAttribute('src') || e.getAttribute('action') || e.getAttribute('formaction') || '')).length
    })""")
    eq(counted, {"ran": 0, "tags": 0, "links": 0}, f"no script ran, no injected element and no script link on: {where}")


as_role("owner", reset=True)
page.add_locator_handler(page.locator(".livealert"), lambda: page.locator("[data-act=live-close]").click())   # hostile alerts pop up; close them
seed()

step("hostile text in every kind of shared record")
d = db()
COLLS = ["hotspots", "events", "regionEvents", "safe", "roads", "dams", "feeds", "contacts", "agencies", "roles"]
targets = {}
for c in COLLS:
    keys = [k for k in d if k.startswith(c + "/")]
    for k in (keys[:2] + [k for k in keys if k.endswith(("/tetegu", "/kaneshie", "/weija", "/nadmo"))])[:4]:
        targets[k] = hostile(d[k])
import datetime
now = datetime.datetime.now(datetime.timezone.utc)
iso = lambda dt: dt.isoformat().replace("+00:00", "Z")
targets["alerts/x1"] = {"level": "warning", "c": "GH", "areas": [], "agency": P, "msg": P, "issued": iso(now), "expires": iso(now + datetime.timedelta(days=1))}
targets["notifications/x1"] = {"level": "warning", "title": P, "msg": P, "c": "GH", "areas": ["GH-AA"], "agency": "nadmo", "at": iso(now), "expires": iso(now + datetime.timedelta(days=1))}
targets["roles/x1"] = {"n": P, "perms": ["data.edit"]}
targets["forecasts/x1"] = {"zone": "acc", "mm24": 80, "mm72": 150, "src": P, "at": iso(now)}
eq(sorted({k.split("/")[0] for k in targets}), sorted(COLLS + ["alerts", "notifications", "forecasts"]), "a record in every collection is made hostile")
page.evaluate("async docs => { const db = await claude.use('db'); for (const [k, v] of Object.entries(docs)) await db.doc(k).set(v); }", targets)
settings = d["config/settings"]
settings["notice"] = P
for lst in settings.get("outlook", {}).get("lists", []):
    lst["n"] = P + " " + lst["n"]
page.evaluate("async s => { const db = await claude.use('db'); await db.doc('config/settings').set(s); }", settings)
db_until(lambda d: d["config/settings"]["notice"] == P and all(d[k] == v for k, v in targets.items()), "the hostile records stored")

step("hostile files: a replay and live data")
rep = json.loads((FIX / "test-projection-replay.json").read_text())
r = rep["replay"]
r.update(title=P + " replay", notes=P, source=P, link=BAD_LINK, assumptions=[P])
for f in rep["frames"]:
    f["label"] = P
(SHOTS / "hostile-replay.json").write_text(json.dumps(rep))
snap = json.loads((FIX / "test-snapshot.json").read_text())
for c, doc in snap["countries"].items():
    for h in doc.get("heat", []):
        h["n"] = P + " " + h["n"]
    for a in doc.get("alerts", []):
        a.update(headline=P, description=P, instruction=P, agency=P, event=P, web=BAD_LINK)
        for area in a.get("areas", []):
            area["desc"] = P
    for x in doc.get("disasters", []):
        x.update(title=P, place=P, link=BAD_LINK)
    for x in doc.get("rivers", []):
        x["n"] = P + " " + x.get("n", "")
for w in snap["world"].get("countries", {}).values():
    if isinstance(w, dict):
        for k in ("top", "say", "n"):
            if isinstance(w.get(k), str):
                w[k] = P + w[k]
(SHOTS / "hostile-live-data.json").write_text(json.dumps(snap))
click("[data-act=ad-tab][data-k=replays]")
upload("#rp-import", SHOTS / "hostile-replay.json")
see("replay", "table")
click("[data-act=ad-tab][data-k=live]")
upload("#hz-import", SHOTS / "hostile-live-data.json")
see("Imported live data for 3 countries.", ".toast")

step("every admin tab shows the hostile data as text")
tabs = page.locator("nav.tabs [data-act=ad-tab]")
names = [tabs.nth(i).get_attribute("data-k") for i in range(tabs.count())]
check(len(names) >= 20, f"all admin tabs found ({len(names)})")
for k in names:
    click(f"[data-act=ad-tab][data-k={k}]")
    page.wait_for_function("() => document.querySelector('#app')")
    safe_here(f"admin tab {k}")
click("[data-act=ad-tab][data-k=hotspots]")
see("<img src=x onerror=", "table")   # shown as text

step("agency posts and an access request with hostile text")
add_person("ngozi", "agency-publisher", "nadmo")
db_until(lambda d: d.get("members/u-agent", {}).get("agency") == "nadmo", "Ngozi is a NADMO publisher")
as_role("agent"); click("[data-act=mode][data-k=agency]")
page.select_option("#ag-areas", ["GH-AA"]); fill("#ag-msg", P); page.click("#ag-form button[type=submit]")
see("Waiting for approval", "table")
click("[data-act=ag-type][data-k=reading]"); fill("#ag-station", P); fill("#ag-value", "2"); fill("#ag-lat", "5.57"); fill("#ag-lon", "-0.23")
page.click("#ag-form button[type=submit]")
expect(page.locator("table tbody tr")).to_have_count(2)
safe_here("the agency portal")
as_role("stranger"); click("[data-act=mode][data-k=agency]")
page.select_option("#ag-req-agency", "lasema"); fill("#ag-req-note", P); page.click("#ag-request button[type=submit]")
see("Request sent")
safe_here("the access request")

step("a contribution and a search with hostile text")
click("[data-act=mode][data-k=simple]"); click(".brand")
click("[data-act=contribute][data-k=suggestion]"); fill("#c-text", P); page.click("#contrib-form button[type=submit]")
see("Thank you. We've received it.")
click(".brand"); fill("#q", P)
see("<img src=x", "#results")   # the hostile records' names match the hostile words, and show as text
safe_here("search results")

step("the owner reviews everything")
as_role("owner"); click("[data-act=mode][data-k=admin]")
for k in ["approvals", "requests", "posts", "contributions", "audit", "analytics", "people"]:
    click(f"[data-act=ad-tab][data-k={k}]")
    page.wait_for_function("() => document.querySelector('#app')")
    safe_here(f"admin tab {k} after the public's input")
click("[data-act=ad-tab][data-k=approvals]")
click("[data-act=ap-post][data-ok='1']")

step("every public screen, as a member of the public")
as_role("viewer")
see(P[:20])   # the site notice, as text
safe_here("home")
click("[data-act=country][data-id=GH]"); safe_here("Ghana's regions")
click("[data-act=open][data-type=country]"); safe_here("Ghana")
click(".brand"); click("[data-act=country][data-id=GH]"); click("[data-act=open][data-type=area]"); safe_here("Greater Accra")
for name in ["tetegu", "kaneshie"]:
    click(".brand"); fill("#q", name); click("#results [data-act=open]")
    for k in ["why", "todo", "heat"]:
        if page.locator(f"[data-act=toggle][data-k={k}]").count():
            click(f"[data-act=toggle][data-k={k}]")
    safe_here(f"the {name} page with details open")
    click("[data-act=to-map]"); map_idle(); safe_here(f"the {name} map")
    page.locator("#mapbox").click(position={"x": 300, "y": 200})
    safe_here(f"the {name} map after a tap")
click(".brand"); click("#bell"); safe_here("alerts")
click(".brand"); click("[data-act=outlook]"); safe_here("outlook")
click("[data-act=open-outlook]"); safe_here("an outlook place")
click(".brand"); click("[data-act=replays]"); safe_here("replays")
click("[data-act=replay-open][data-id=proj-test-valley]"); see("replay", "h1"); safe_here("a hostile replay")
click(".brand"); click("[data-act=world]"); safe_here("the world")
for cc in ["NG", "GH", "IN"]:
    click(".brand"); page.select_option("#country-pick", cc)
    see("Flood and heat reach", "h1"); safe_here(f"{cc}'s reach")
click(".brand"); fill("#q", "kano"); page.locator("#results [data-act=open][data-type=wp]").first.click()
click("[data-act=toggle][data-k=heat]") if page.locator("[data-act=toggle][data-k=heat]").count() else None
safe_here("Kano's page"); click("[data-act=project]"); safe_here("Kano's projection screen")
click(".brand"); click("[data-act=contribute][data-k=report]"); safe_here("the report form")
click("[data-act=mode][data-k=expert]"); safe_here("expert mode")
page.set_viewport_size({"width": 390, "height": 844})
click("[data-act=mode][data-k=simple]"); click(".brand"); safe_here("home on a phone")
eq(page.evaluate("window.__xss || 0"), 0, "no injected script ran at any point")
