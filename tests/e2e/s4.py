# visit analytics: what is counted (and what is not), and the owner's analytics screen
as_role("owner", reset=True)
seed()
add_person("ngozi", "agency-publisher", "nadmo")
db_until(lambda d: d.get("members/u-agent", {}).get("agency") == "nadmo", "Ngozi is a NADMO publisher")

def sessions(d, uid):
    return list(d.get(f"analytics/{uid}", {}).get("s", {}).values())

def searched(d, uid, q):
    return sum(q in json.dumps(s) for s in sessions(d, uid))

step("four visits: two by a member of the public, one by agency staff, one by a viewer")
visits = {"u-x": 0, "u-agent": 0}
for who, uid in [("stranger", "u-x"), ("stranger", "u-x"), ("agent", "u-agent"), ("viewer", "u-v")]:
    as_role(who)
    fill("#q", "kaneshie")
    click("#results [data-act=open]")
    see("Kaneshie", "h1")
    click("[data-act=toggle][data-k=todo]")
    click("[data-act=to-map]"); see("Map", "h1")
    click("[data-act=back]"); click(".brand")
    fill("#q", "zzqqx")
    see("No match", "#results")
    page.wait_for_timeout(1300)   # the search counts once the person stops typing (1.2 s); this is that rule, not a guess
    page.evaluate("Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
    if uid in visits:
        visits[uid] += 1
        db_until(lambda d: searched(d, uid, "zzqqx") == visits[uid], f"{who}'s visit {visits[uid]} saved")
        eq(page.evaluate("JSON.stringify(window.__presence)"), '{"s":"where","p":"","c":"","d":"computer"}', "live presence: screen and device only, no person")
d = db()
check("analytics/u-v" not in d, "a viewer's visit is not stored (viewers cannot write)")
s = [x for x in sessions(d, "u-x") if "zzqqx" in json.dumps(x)][-1]
eq(s["staff"], False, "a member of the public is not marked as staff")
check(all(x["staff"] for x in sessions(d, "u-agent")), "agency staff are marked as staff")
check(all(set(x) >= {"start", "end", "dev", "pages", "q", "exit"} and not any(k in x for k in ("name", "email", "uid")) for x in sessions(d, "u-x")), "sessions hold no name or account id")

step("the owner's analytics screen")
as_role("owner"); click("[data-act=mode][data-k=admin]"); click("[data-act=ad-tab][data-k=analytics]")
see("Who is counted")
t = txt()
import re
kpi = lambda label: re.search(r"(\S+)\n" + re.escape(label) + r"\n", t)
eq(kpi("visits").group(1), "4", "public visits (staff left out)")
eq(kpi("different people").group(1), "1", "one person")
eq(kpi("searches").group(1), "4", "searches")
check(re.search(r"kaneshie\t2\t100%", t), "kaneshie searched twice, a result picked each time")
check(re.search(r"zzqqx\t2\t0%", t), "zzqqx searched twice, nothing found")
see("Searches that found nothing"); see("Add these as “other names” on a flood area")
check(re.search(r"Pages for a place\nKaneshie\n2\n", t), "Kaneshie's page opened twice")
shot("s4-analytics.png")
page.check("#an-staff")
expect(page.locator(".kpi b").nth(3)).not_to_have_text("4")
check(int(page.locator(".kpi b").nth(3).inner_text()) > 4, "counting staff adds their visits")
click("[data-act=an-export]")
until("() => (window.__saved || []).some(f => /analytics|visits/.test(f.filename) && /\\.csv$/.test(f.filename) && f.size > 100)", what="the visits CSV downloaded")
click("[data-act=ad-ask][data-k=an-prune]"); click("[data-act=ad-yes]")
see("Removed 0 visits.", ".toast")
eq(searched(db(), "u-x", "zzqqx"), 2, "today's visits are kept when old ones are deleted")
page.set_viewport_size({"width": 390, "height": 844})
until("() => document.documentElement.scrollWidth <= 390", what="no sideways scrolling on a phone")
shot("s4-analytics-phone.png", full=False)
