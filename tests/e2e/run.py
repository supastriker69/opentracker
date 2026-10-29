"""Runs one browser scenario against dist/opentracker.html with a mock of the claude.ai runtime.
   python3 tests/e2e/run.py s1.py"""
import json, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
HTML = (ROOT / "dist" / "opentracker.html").read_text()
SKEL = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + HTML + '</body></html>'
ML = (ROOT / "assets" / "vendor" / "maplibre-gl-4.7.1.js").read_text()
MOCK = "window.__RULES = " + (ROOT / "config" / "db-rules.json").read_text() + ";\n" + (HERE / "mock.js").read_text()
ROLES = {
 "owner": {"uid":"u-owner","owner":True,"edit":True,"level":"owner"},
 "editor": {"uid":"u-ed","owner":False,"edit":True,"level":"admin"},
 "agent": {"uid":"u-agent","owner":False,"edit":False,"level":"interact"},
 "stranger": {"uid":"u-x","owner":False,"edit":False,"level":"interact"},
 "viewer": {"uid":"u-v","owner":False,"edit":False,"level":"view"},
}
errors = []
def route(r):
    u = r.request.url
    if u.startswith("http://ft.test/"): return r.fulfill(status=200, content_type="text/html", body=SKEL)
    if "maplibre-gl" in u: return r.fulfill(status=200, content_type="application/javascript", body=ML)
    return r.fulfill(status=200, body="")
def step(name): print("--", name, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    ctx.route("**/*", route)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
    page.on("console", lambda m: m.type == "error" and errors.append(("console", m.text)))
    def as_role(r, reset=False):
        page.goto("http://ft.test/")
        page.evaluate("([r, reset]) => { localStorage.setItem('mockrole', JSON.stringify(r)); if (reset) localStorage.removeItem('mockdb'); }", [ROLES[r], reset])
        page.add_init_script(MOCK) if not getattr(page, "_mock", False) else None
        page._mock = True
        page.reload(); page.wait_for_timeout(700)
    def click(sel, nth=0): page.locator(sel).nth(nth).click(); page.wait_for_timeout(250)
    def txt(): return page.inner_text("#app")
    def modes(): return page.inner_text("#modes")
    exec((HERE / sys.argv[1]).read_text())
    b.close()
print("ERRORS:", json.dumps(errors, indent=1) if errors else "none")
