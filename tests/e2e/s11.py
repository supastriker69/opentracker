# accessibility: every screen, for the public, agencies and administrators, in light and dark, at every text size and
# on a phone, checked with axe-core against WCAG 2.2 A and AA (and axe's best practices). Any violation fails.
AXE = (ROOT / "tools" / "lint" / "node_modules" / "axe-core" / "axe.min.js").read_text()
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"]
scanned = []


def accessible(label):
    """no accessibility violation of any impact on the screen as it is now"""
    if not page.evaluate("!!window.axe"):
        page.add_script_tag(content=AXE)
    page.evaluate("window.scrollTo(0, 0)")   # as a person arrives on the screen (scrolled content passes under the sticky header)
    found = page.evaluate("""tags => axe.run(document, {preload: false, runOnly: {type: 'tag', values: tags}}).then(r => r.violations.map(v =>
        `${v.impact} ${v.id}: ${v.help} (${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join('; ')})`))""", TAGS)
    if __import__("os").environ.get("A11Y_REPORT"):   # list every finding instead of stopping at the first
        for f in found: print("   A11Y", label, "::", f)
    else:
        eq(found, [], f"accessibility of: {label}")
    scanned.append(label)


def simple_screens(tag):
    click("[data-act=mode][data-k=simple]"); click(".brand"); see("Is my area at risk", "h1"); accessible(f"home {tag}")
    fill("#q", "acc"); see("Accra", "#results"); accessible(f"search results {tag}")
    click(".brand"); click("[data-act=country][data-id=GH]"); see("Choose a region", "h2"); accessible(f"regions {tag}")
    click("[data-act=open][data-type=country]"); see("Ghana", "h1"); accessible(f"a country {tag}")
    click(".brand"); click("[data-act=country][data-id=GH]"); click("[data-act=open][data-type=area]"); see("Greater Accra Region", "h1"); accessible(f"a region {tag}")
    click(".brand"); fill("#q", "kaneshie"); click("#results [data-act=open]"); see("Kaneshie", "h1")
    for k in ["todo", "heat", "past"]:
        if page.locator(f"[data-act=toggle][data-k={k}]").count():
            click(f"[data-act=toggle][data-k={k}]")
    accessible(f"a flood area with details open {tag}")
    for when in ["today", "3m", "year", "past"]:
        if page.locator(f"[data-act=when][data-k='{when}']").count():
            click(f"[data-act=when][data-k='{when}']"); accessible(f"a flood area, {when} {tag}")
    click("[data-act=to-map]"); map_idle(); accessible(f"the map {tag}")
    click(".brand"); click("#bell"); see("Alerts", "h1"); accessible(f"alerts {tag}")
    click(".brand"); click("[data-act=outlook]"); see("rainy season outlook", "h1"); accessible(f"the outlook {tag}")
    click("[data-act=open-outlook]"); accessible(f"an outlook place {tag}")
    click(".brand"); click("[data-act=replays]"); see("Watch floods over time", "h1"); accessible(f"replays {tag}")
    click("[data-act=replay-open]"); see("·", "#rp-now"); accessible(f"a replay playing {tag}")
    click("[data-act=replay-close]"); click("[data-act=years-map]"); map_idle(); accessible(f"floods by year {tag}")
    click(".brand"); click("[data-act=world]"); map_idle(); accessible(f"the world {tag}")
    click(".brand"); page.select_option("#country-pick", "NG"); see("Flood and heat reach", "h1"); accessible(f"a country's reach {tag}")
    click(".brand"); fill("#q", "kano"); page.locator("#results [data-act=open][data-type=wp]").first.click(); see("Kano", "h1")
    if page.locator("[data-act=toggle][data-k=heat]").count():
        click("[data-act=toggle][data-k=heat]")
    accessible(f"a town {tag}")
    click("[data-act=project]"); see("Projected flood", "h1"); accessible(f"the projection screen {tag}")
    click(".brand"); click("[data-act=contribute][data-k=report]"); accessible(f"the report form {tag}")
    page.click("#contrib-form button[type=submit]"); accessible(f"the report form with an error {tag}")
    click("[data-act=mode][data-k=expert]"); accessible(f"expert mode {tag}")


as_role("owner", reset=True)
seed()
click("[data-act=ad-tab][data-k=live]")
upload("#hz-import", ROOT / "webapp" / "test" / "fixtures" / "test-snapshot.json")
see("Imported live data", ".toast")
click("[data-act=ad-tab][data-k=replays]")
upload("#rp-import", ROOT / "webapp" / "test" / "fixtures" / "test-satellite-replay.json")
see("Test outlines", "table")
add_person("ngozi", "agency-publisher", "nadmo")
db_until(lambda d: d.get("members/u-agent", {}).get("agency") == "nadmo", "Ngozi is a NADMO publisher")

step("every administration screen")
click("[data-act=mode][data-k=admin]")
tabs = page.locator("nav.tabs [data-act=ad-tab]")
for k in [tabs.nth(i).get_attribute("data-k") for i in range(tabs.count())]:
    click(f"[data-act=ad-tab][data-k={k}]")
    accessible(f"admin: {k}")
    if page.locator("[data-act=ad-edit]").count():
        click("[data-act=ad-edit]"); accessible(f"admin: editing a {k} record")
        click("[data-act=ad-cancel]")
click("[data-act=ad-tab][data-k=roles]"); click("[data-act=role-new]"); accessible("admin: a new role")

step("the agency portal and an access request")
as_role("agent"); click("[data-act=mode][data-k=agency]")
for t in ["warning", "forecast", "dam", "reading"]:
    if page.locator(f"[data-act=ag-type][data-k={t}]").count():
        click(f"[data-act=ag-type][data-k={t}]")
    accessible(f"agency portal: {t}")
as_role("stranger"); click("[data-act=mode][data-k=agency]"); accessible("an access request")

step("every public screen, light")
as_role("viewer")
simple_screens("(light)")

step("every public screen, dark")
page.emulate_media(color_scheme="dark")
simple_screens("(dark)")

step("larger text and a phone")
page.emulate_media(color_scheme="light")
page.set_viewport_size({"width": 390, "height": 844})
for size in ["large", "larger"]:
    click("[data-act=mode][data-k=simple]"); click(".brand"); click("#ts")
    see(f"Text: {size}", "#ts")
    accessible(f"home, text {size}, phone")
    fill("#q", "kaneshie"); click("#results [data-act=open]"); accessible(f"a flood area, text {size}, phone")
    until("() => document.documentElement.scrollWidth <= 390", what=f"no sideways scrolling with text {size}")
check(len(scanned) >= 70, f"screens scanned: {len(scanned)}")
