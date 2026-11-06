"""Browser scenarios against dist/opentracker.html, with a stand-in for the claude.ai runtime (mock.js).

    python3 tests/e2e/run.py            every scenario (s1.py … s9.py)
    python3 tests/e2e/run.py s3.py      one scenario

Every check waits for the page instead of sleeping: the `see`, `gone`, `until` and `db_until` helpers below retry
until they pass or time out (10 s). A scenario fails on the first check that does not hold, and on any JavaScript
error or console error on the page. The exit code is non-zero when anything failed.
Screenshots go to $SHOTS (default: tests/e2e/out/), which is ignored by git."""
import json, os, pathlib, sys, time, traceback
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
SHOTS = pathlib.Path(os.environ.get("SHOTS", HERE / "out")); SHOTS.mkdir(parents=True, exist_ok=True)
HTML = (ROOT / "dist" / "opentracker.html").read_text()
SKEL = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + HTML + '</body></html>'
ML = {f: (ROOT / "assets" / "vendor" / "maplibre-gl-6.15.0" / f).read_text() for f in ["maplibre-gl.mjs", "maplibre-gl-worker.mjs"]}
MOCK = "window.__RULES = " + (ROOT / "config" / "db-rules.json").read_text() + ";\n" + (HERE / "mock.js").read_text()
ROLES = {
    "owner": {"uid": "u-owner", "owner": True, "edit": True, "level": "owner"},
    "editor": {"uid": "u-ed", "owner": False, "edit": True, "level": "admin"},
    "agent": {"uid": "u-agent", "owner": False, "edit": False, "level": "interact"},
    "stranger": {"uid": "u-x", "owner": False, "edit": False, "level": "interact"},
    "viewer": {"uid": "u-v", "owner": False, "edit": False, "level": "view"},
}
TIMEOUT = 10_000
expect.set_options(timeout=TIMEOUT)


def route(r):
    u = r.request.url
    if u.startswith("http://ft.test/"):
        return r.fulfill(status=200, content_type="text/html", body=SKEL)
    if "cdn.jsdelivr.net/npm/maplibre-gl@" in u:   # the CDN copy of MapLibre, served from the vendored files
        return r.fulfill(status=200, content_type="text/javascript", body=ML[u.split("?")[0].rsplit("/", 1)[1]], headers={"Access-Control-Allow-Origin": "*"})
    return r.fulfill(status=200, body="")


def run_scenario(b, name):
    """runs one scenario file; returns (checks passed, failure text or None, page errors)"""
    errors, counted = [], {"n": 0}
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    ctx.route("**/*", route)
    page = ctx.new_page()
    page.set_default_timeout(TIMEOUT)
    page.on("pageerror", lambda e: errors.append(f"page error: {e}"))
    page.on("console", lambda m: m.type == "error" and errors.append(f"console error: {m.text}"))

    # ---------- helpers the scenarios use ----------
    def check(cond, what):
        counted["n"] += 1
        assert cond, what

    def eq(actual, expected, what):
        counted["n"] += 1
        assert actual == expected, f"{what}: expected {expected!r}, got {actual!r}"

    def see(text, where="#app"):
        """the element shows this text (waits for it)"""
        counted["n"] += 1
        expect(page.locator(where).first).to_contain_text(text)

    def gone(text, where="#app"):
        """the element does not show this text (waits until it is gone)"""
        counted["n"] += 1
        expect(page.locator(where).first).not_to_contain_text(text)

    def until(js, arg=None, what=None):
        """waits until a JavaScript expression is true in the page"""
        counted["n"] += 1
        try:
            page.wait_for_function(js, arg=arg, timeout=TIMEOUT)
        except Exception:
            raise AssertionError(f"timed out waiting for: {what or js}")

    def db():
        return json.loads(page.evaluate("localStorage.getItem('mockdb')") or "{}")

    def db_until(pred, what):
        """waits until the shared database satisfies pred(db) and returns it"""
        counted["n"] += 1
        end = time.monotonic() + TIMEOUT / 1000
        while True:
            d = db()
            if pred(d):
                return d
            if time.monotonic() > end:
                raise AssertionError(f"timed out waiting for the database: {what}")
            page.wait_for_timeout(50)   # polling interval, not a fixed wait for a result

    def as_role(r, reset=False):
        page.goto("http://ft.test/")
        page.evaluate("([r, reset]) => { localStorage.setItem('mockrole', JSON.stringify(r)); if (reset) localStorage.removeItem('mockdb'); }", [ROLES[r], reset])
        if not getattr(page, "_mock", False):
            page.add_init_script(MOCK)
            page._mock = True
        page.reload()
        until("() => DB.settled && document.querySelector('#modes button') && document.querySelector('h1')", what="the app to start and show the shared data")

    def click(sel, nth=0):
        page.locator(sel).nth(nth).click()

    def fill(sel, value):
        page.locator(sel).first.fill(value)

    def txt():
        return page.inner_text("#app")

    def modes():
        return page.inner_text("#modes").split("\n")

    def modes_are(names):
        """the mode switcher shows exactly these modes (waits for the person's role to apply)"""
        counted["n"] += 1
        expect(page.locator("#modes button")).to_have_text(names)

    def seed():
        """as an administrator: set up the shared database from the built-in data"""
        click("[data-act=mode][data-k=admin]")
        click("[data-act=ad-seed]")
        db_until(lambda d: len(d) > 150 and "config/settings" in d, "the database set up")
        see("Flood areas")

    def add_person(q, role, agency=None):
        if not page.locator("[data-act=ad-tab][data-k=people]").count():
            click("[data-act=mode][data-k=admin]")
        click("[data-act=ad-tab][data-k=people]")
        page.select_option("#pp-role", role)
        if agency:
            page.select_option("#pp-agency", agency)
        fill("#pp-q", q)
        expect(page.locator("#pp-hits [data-act=pp-add]").first).to_be_visible()
        click("#pp-hits [data-act=pp-add]")

    def src_count(sid):
        until("id => MAPV.ready && MAPV.map.getSource(id)", sid, f"map source {sid}")
        return page.evaluate("id => MAPV.map.getSource(id).getData().then(d => d.features.length)", sid)

    def map_idle():
        until("() => MAPV.ready && !MAPV.map.isMoving()", what="the map to settle")

    def shot(file, full=True):
        page.screenshot(path=str(SHOTS / file), full_page=full)

    def step(label):
        print("  -", label, flush=True)

    scope = dict(globals(), page=page, check=check, eq=eq, see=see, gone=gone, until=until, db=db, db_until=db_until,
                 as_role=as_role, click=click, fill=fill, txt=txt, modes=modes, modes_are=modes_are, seed=seed, add_person=add_person,
                 src_count=src_count, map_idle=map_idle, shot=shot, step=step, expect=expect, ROOT=ROOT, SHOTS=SHOTS, json=json, pathlib=pathlib)
    failure = None
    try:
        exec(compile((HERE / name).read_text(), str(HERE / name), "exec"), scope)
    except Exception:
        failure = traceback.format_exc(limit=3)
    ctx.close()
    return counted["n"], failure, errors


def main():
    names = sys.argv[1:] or sorted(p.name for p in HERE.glob("s[0-9]*.py"))
    failed = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        for name in names:
            print(name, flush=True)
            n, failure, errors = run_scenario(b, name)
            if failure or errors:
                failed.append(name)
                print(f"FAIL {name} after {n} checks")
                if failure:
                    print(failure)
                for e in errors[:10]:
                    print("  ", e)
            else:
                print(f"PASS {name}: {n} checks")
        b.close()
    print(f"\n{len(names) - len(failed)} of {len(names)} scenarios passed" + (f"; failed: {', '.join(failed)}" if failed else ""))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
