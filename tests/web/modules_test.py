"""The browser app's ES modules, loaded unbundled in Chromium, exactly as written in src/.

The bundler turns top-level const into var, so in the built app a module that used another before it had loaded
would quietly see undefined. Loaded natively, the same mistake throws "Cannot access ... before initialization".
This loads both sites' entries (src/app.js for claude.ai, src/app-web.js for your own domain) and fails on any
load-order, missing-export or syntax error, then checks the claude.ai entry starts and shows the home page.

    python3 tests/web/modules_test.py      (after python3 tools/build.py, which makes the page data in dist/)"""
import mimetypes
import pathlib
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "dist" / "opentracker-webapp" / "public"
GEO, INDEX = PUBLIC / "geo.js", PUBLIC / "index.html"
MOCK = "window.__RULES = " + (ROOT / "config" / "db-rules.json").read_text() + ";\n" + (ROOT / "tests" / "e2e" / "mock.js").read_text()
FATAL = ("the app did not start", "before initialization", "is not defined", "does not provide an export", "SyntaxError", "Failed to fetch dynamically imported module")


def page_for(entry: str) -> str:
    """the built web app's page, with its bundle swapped for the unbundled entry"""
    html = INDEX.read_text(encoding="utf-8")
    html = re.sub(r'<script src="/app\.js\?v=[^"]*"></script>', f'<script>const MAPLIB_URL = "/no-map.mjs";</script>'
                  f'<script type="module" src="/src/{entry}"></script>', html)
    assert f"/src/{entry}" in html, "the page's app script was not found"
    return re.sub(r'(<link rel="(?:manifest|stylesheet|icon|apple-touch-icon)" href=")/[^"]*"', r'\1/none"', html)


def serve(route):
    path = route.request.url.split("modules.test", 1)[1].split("?")[0]
    if path.startswith("/page/"):
        return route.fulfill(status=200, content_type="text/html", body=page_for(path[len("/page/"):]))
    if path.startswith("/geo.js"):
        return route.fulfill(status=200, content_type="text/javascript", body=GEO.read_text(encoding="utf-8"))
    f = (ROOT / path.lstrip("/")).resolve()
    if not path.startswith("/src/") or ROOT / "src" not in f.parents or not f.is_file():
        return route.fulfill(status=404, body="")
    return route.fulfill(status=200, content_type=mimetypes.guess_type(f.name)[0] or "text/javascript", body=f.read_bytes())


def main() -> int:
    if not GEO.exists():
        print("run python3 tools/build.py first (the page data comes from dist/)")
        return 1
    failures = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for entry in ["app.js", "app-web.js"]:
            ctx = b.new_context()
            ctx.route("http://modules.test/**", serve)
            ctx.add_init_script(MOCK)
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: m.type == "error" and errors.append(m.text))
            page.goto(f"http://modules.test/page/{entry}")
            try:   # a module that fails to load stops the whole graph, so the app never starts: report why
                page.wait_for_function("() => window.OpenTracker", timeout=20000)
            except Exception:
                errors.append("the app did not start")
            loaded = page.evaluate("() => !!window.OpenTracker && Object.isFrozen(window.OpenTracker) && 'REPO' in window.OpenTracker")
            fatal = [e for e in errors if any(k in e for k in FATAL)]
            ok = loaded and not fatal
            if entry == "app.js" and ok:
                page.wait_for_function("() => document.querySelector('h1') && document.querySelector('#modes button')", timeout=20000)
                ok = ok and "Is my area at risk" in page.inner_text("h1")
            print(("ok  " if ok else "FAIL") + f"  src/{entry}: loaded {loaded}" + (f", errors: {fatal}" if fatal else ""))
            if not ok:
                failures.append(entry)
            ctx.close()
        b.close()
    print(f"{2 - len(failures)} of 2 entries load as plain ES modules")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
