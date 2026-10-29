/* ===== Router, events, database start-up ===== */
let lastFitKey = "";
function allowedModes() {
  const modes = [["simple", "Simple"], ["expert", "Expert"]];
  if (DB.api && DB.uid) modes.push(["agency", "Agency"]);
  if (AUTH.anyAdmin()) modes.push(["admin", "Admin"]);
  return modes;
}
function header() {
  const modes = allowedModes();
  $("#modes").innerHTML = modes.map(([k, n]) => `<button data-act="mode" data-k="${k}" aria-pressed="${UI.mode === k}">${n}</button>`).join("");
  const n = unseenCount(), bell = $("#bell");
  if (bell) { bell.innerHTML = `${ICON.bell}<span>Alerts</span>${n ? `<span class="count num">${n > 9 ? "9+" : n}</span>` : ""}`; bell.setAttribute("aria-label", n ? `Alerts, ${n} new` : "Alerts"); bell.setAttribute("aria-pressed", String(UI.mode === "simple" && UI.screen === "alerts")); }
  const ts = document.documentElement.classList.contains("ts-2") ? 2 : document.documentElement.classList.contains("ts-1") ? 1 : 0;
  $("#ts").textContent = ["Text: normal", "Text: large", "Text: larger"][ts];
}

function render() {
  reindex();
  if (!allowedModes().some(m => m[0] === UI.mode)) UI.mode = "simple";   /* access removed while open */
  const root = $("#app");
  let html = "";
  const st = settings();
  const top = st.notice ? `<div class="notice info">${ICON.info}<div>${esc(st.notice)}</div></div>` : "";
  if (UI.mode === "expert") html = `<h1>Expert view</h1>${viewExpert()}`;
  else if (UI.mode === "admin") html = viewAdmin();
  else if (UI.mode === "agency") html = viewAgency();
  else if (UI.screen === "answer") html = viewAnswer();
  else if (UI.screen === "map") html = viewMap();
  else if (UI.screen === "status") html = viewStatus();
  else if (UI.screen === "alerts") html = viewAlerts();
  else if (UI.screen === "contribute") html = viewContribute();
  else if (UI.screen === "outlook") html = viewOutlook();
  else if (UI.screen === "replays") html = viewReplays();
  else if (UI.screen === "world") html = viewWorld();
  else if (UI.screen === "reach") html = viewReach(UI.reachCc);
  else if (UI.screen === "project") html = viewProject();
  else html = viewWhere();
  header();   /* after the view, so counts reflect what it just marked as seen */
  const wide = UI.mode === "expert" || UI.mode === "admin";
  root.innerHTML = `<main class="wrap ${wide ? "wide" : ""}" id="main" tabindex="-1">${top}${html}</main>`;
  const holder = $("#map");
  if (holder) {
    MAPV.onPick = id => {
      if (UI.mode === "expert") { UI.exSel = id; const h = IX.byId[id]; if (h) mapFly(h.ll, 11); render(); }
      else { UI.place = {type: "hotspot", id}; UI.screen = "answer"; UI.open = {}; render(); window.scrollTo(0, 0); }
    };
    MAPV.onPickPlace = id => { if (worldPlace(id)) { reachStop(); UI.place = {type: "wp", id}; UI.open = {}; go("answer"); } };
    MAPV.onPickCountry = c => { if (worldCountry(c)) openReach(c); };
    mapMount(holder);
    const simple = UI.mode === "simple", replaying = simple && UI.screen === "replays";
    const reachCc = simple && UI.screen === "reach" ? UI.reachCc : simple && UI.screen === "answer" && UI.place?.type === "wc" ? UI.place.id : null;
    const view = UI.mode === "expert" ? expertMapView() : replaying ? replayMapView() : reachCc ? reachMapView(reachCc)
      : simple && UI.screen === "world" ? worldMapView() : simple && UI.screen === "project" ? projectMapView() : simpleMapView();
    const key = UI.mode + UI.screen + JSON.stringify(UI.mode === "expert" ? [UI.ex.country, UI.ex.area] : replaying ? UI.replay.id : reachCc || UI.place);
    mapUpdate(view, key !== lastFitKey || !MAPV.ready);
    lastFitKey = key;
    if (replaying) replayShow(UI.replay.i);
    else if (simple && UI.screen === "project" && PROJ.result) projShow(PROJ.hour);   /* the page was redrawn: lay the water back on */
    else if (simple && UI.screen === "project") mapProjection(null);
    else if (simple && UI.screen === "map" && UI.show === "past") yearOverlay();
  }
  anPage();
}
const ALL_FIT = {bounds: [[-3.4, 4.2], [14.7, 13.9]], ll: [5.6, 8.6], z: 4.6};
function pastLayer(hs, year) {
  const agg = {};
  data("events").filter(e => yearMatch(e, year)).forEach(e => (e.ids || []).forEach(id => {
    if (!IX.byId[id] || (hs && !hs.has(id))) return;
    const a = agg[id] = agg[id] || {h: IX.byId[id], n: 0, y: 0};
    a.n++; a.y = Math.max(a.y, e.year || 0);
  }));
  return Object.values(agg).map(a => Object.assign(a, {recent: a.y ? Math.min(.95, .35 + .6 * Math.max(0, a.y - 2000) / (NOW.getFullYear() - 2000)) : .3}));
}
function simpleMapView() {
  const p = UI.place, c = p ? placeCountry(p) : null;
  const hs = c ? IX.hot.filter(h => h.c === c) : IX.hot;
  const ctx = simpleCtx(UI.when === "past" ? "3d" : UI.when);
  const sel = p && p.type === "hotspot" ? IX.byId[p.id] : null;
  return {
    show: UI.show, three: UI.three,
    hot: hs.map(h => ({h, r: computeRisk(h, ctx)})),
    past: pastLayer(c ? new Set(hs.map(h => h.id)) : null, UI.year),
    reach: UI.when === "year" ? hs.map(h => { const r = outlookFor(h); return {ll: h.ll, km: r.reach, level: r.level}; }) : [],
    safe: data("safe").filter(s => !c || s.c === c), roads: data("roads").filter(s => !c || s.c === c),
    dams: UI.show === "risk" ? data("dams").filter(d => !c || d.c === c) : [],
    sel: sel ? {ll: sel.ll, n: sel.n} : null,
    fit: p ? placeCenter(p) : ALL_FIT
  };
}
function expertMapView() {
  const e = UI.ex;
  const rows = exHot();
  const sel = UI.exSel && IX.byId[UI.exSel];
  let fit = ALL_FIT;
  if (e.area) fit = placeCenter({type: "area", id: e.area});
  else if (e.country !== "ALL") fit = placeCenter({type: "country", id: e.country});
  const reach = e.horizon === "year" ? rows.map(({h, r}) => ({ll: h.ll, km: r.reach, level: r.level})) : [];
  return {show: "risk", three: UI.three, hot: rows, reach, past: [], safe: [], roads: [], dams: data("dams").filter(d => e.country === "ALL" || d.c === e.country), sel: sel ? {ll: sel.ll, n: sel.n} : null, fit, pitch: 55};
}

function go(screen) {
  if (screen !== "project") projStop();
  UI.screen = screen; render(); window.scrollTo(0, 0); const m = $("#main"); if (m) m.focus({preventScroll: true});
}
/* a country's flood and heat reach: Ghana and Nigeria keep their own screen for it, others use their country page */
function openReach(cc) {
  reachStop(); RCH.day = 0; UI.open = {};
  if (DETAILED.has(cc)) { UI.reachCc = cc; go("reach"); }
  else { UI.place = {type: "wc", id: cc}; go("answer"); }
}

const ADMIN_ACTS = ["ad-", "pp-", "role-", "rq-", "post-", "audit-"];
document.addEventListener("click", async ev => {
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  anClick(act, el);
  if (act.startsWith("an-")) { ev.preventDefault(); return anAct(act); }
  if (act.startsWith("ap-")) { ev.preventDefault(); return approvalAct(act, el); }
  if (act.startsWith("ct-")) { ev.preventDefault(); return contribAct(act, el); }
  if (ADMIN_ACTS.some(p => act.startsWith(p))) { ev.preventDefault(); return adminAct(act, el); }
  if (act.startsWith("ag-")) { ev.preventDefault(); return agencyAct(act, el); }
  if (act.startsWith("wa-")) { ev.preventDefault(); return window.WEBAPP?.act(act, el); }
  switch (act) {
    case "home": UI.mode = "simple"; UI.pickCountry = null; UI.place = null; UI.q = ""; UI.open = {}; go("where"); break;
    case "mode":
      UI.mode = el.dataset.k;
      if (UI.mode === "expert") UI.three = true;
      if (UI.mode === "simple") UI.three = false;
      lastFitKey = ""; render(); window.scrollTo(0, 0); break;
    case "country": UI.pickCountry = el.dataset.id; go("where"); break;
    case "back-country": UI.pickCountry = null; go("where"); break;
    case "open": {
      const t = el.dataset.type;
      reachStop();
      UI.place = t === "water" ? {type: "water", idx: +el.dataset.idx} : {type: t, id: el.dataset.id};
      if (t === "country") UI.pickCountry = el.dataset.id;
      UI.open = {}; UI.q = "";
      if (UI.when === "past" && UI.screen !== "answer") UI.when = "3d";
      go("answer"); break;
    }
    case "back":
      reachStop();
      if (["map", "status", "alerts", "contribute", "outlook", "replays", "project", "reach"].includes(UI.screen)) { replayStop(); yearsStop(); go(UI.place ? "answer" : "where"); }
      else if (UI.screen === "world") go("where");
      else if (UI.place?.type === "wp") { UI.place = countryPlace(worldPlace(UI.place.id)?.c || ""); if (!UI.place.id) UI.place = null; go(UI.place ? "answer" : "where"); }
      else {
        const c = UI.place ? placeCountry(UI.place) : null;
        UI.pickCountry = c && DETAILED.has(c) && UI.place?.type !== "country" ? c : null;
        UI.place = null; go("where");
      }
      break;
    case "when": UI.when = el.dataset.k; render(); break;
    case "toggle": UI.open[el.dataset.k] = !UI.open[el.dataset.k]; render(); break;
    case "to-map": UI.show = UI.when === "past" ? "past" : "risk"; go("map"); break;
    case "map-safe": UI.show = "safe"; go("map"); break;
    case "change-where": UI.q = ""; UI.pickCountry = UI.place ? placeCountry(UI.place) : null; go("where"); break;
    case "year": yearsStop(); UI.year = el.dataset.y; render(); break;
    case "zoom": mapZoom(+el.dataset.d); break;
    case "three": UI.three = !UI.three; render(); break;
    case "copy": {
      const v = el.dataset.v;
      try { await navigator.clipboard.writeText(v); toast("Copied " + v); }
      catch (e) { const n = el.parentElement.querySelector(".n"); if (n) { const r = document.createRange(); r.selectNodeContents(n); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } toast("Number selected. Copy it from your keyboard menu."); }
      break;
    }
    case "go-status": UI.prevScreen = UI.screen; go("status"); break;
    case "ts": {
      const d = document.documentElement, cur = d.classList.contains("ts-2") ? 2 : d.classList.contains("ts-1") ? 1 : 0, nx = (cur + 1) % 3;
      d.classList.remove("ts-1", "ts-2"); if (nx) d.classList.add("ts-" + nx);
      try { localStorage.setItem("ft-ts", nx ? String(nx) : ""); } catch (e) {}
      header(); if (MAPV.map) MAPV.map.resize(); break;
    }
    case "speak": speak(); break;
    case "alerts": document.querySelectorAll(".livealert").forEach(x => x.remove()); UI.mode = "simple"; go("alerts"); break;
    case "contribute": UI.mode = "simple"; UI.contrib = {type: el.dataset.k || null, sent: false, noPlace: false}; go("contribute"); break;
    case "contrib-type": UI.contrib = {type: el.dataset.k || null, sent: false, noPlace: UI.contrib.noPlace}; render(); break;
    case "outlook": UI.mode = "simple"; go("outlook"); break;
    case "replays": UI.mode = "simple"; UI.replay = {id: null, i: 0}; go("replays"); break;
    case "replay-open": replayStop(); yearsStop(); UI.mode = "simple"; UI.replay = {id: el.dataset.id, i: 0}; go("replays"); break;
    case "replay-close": replayStop(); UI.replay = {id: null, i: 0}; go("replays"); break;
    case "replay-play": replayToggle(); break;
    case "replay-step": replayStop(); replayShow(UI.replay.i + +el.dataset.d); break;
    case "years-map": { const ys = yearRange(); UI.show = "past"; UI.year = ys.length ? String(ys[ys.length - 1]) : "all"; go("map"); break; }
    case "years-play": yearsToggle(); break;
    case "open-outlook": UI.place = {type: "hotspot", id: el.dataset.id}; UI.when = "year"; UI.open = {}; go("answer"); break;
    case "outlook-map": UI.place = {type: "country", id: el.dataset.k}; UI.pickCountry = el.dataset.k; UI.when = "year"; UI.show = "risk"; go("map"); break;
    case "contrib-noplace": UI.contrib.noPlace = true; render(); break;
    case "world": UI.mode = "simple"; reachStop(); go("world"); break;
    case "reach": UI.mode = "simple"; openReach(el.dataset.k); break;
    case "reach-day": reachStop(); RCH.day = +el.dataset.k; render(); break;
    case "reach-play": reachToggle(); break;
    case "project": UI.mode = "simple"; go("project"); break;
    case "proj-sc": if (PROJ.status !== "loading" && PROJ.status !== "running") { PROJ.sc = el.dataset.k; render(); } break;
    case "proj-area": if (PROJ.status !== "loading" && PROJ.status !== "running") { PROJ.area = el.dataset.k; render(); } break;
    case "proj-run": runProjection(UI.place); break;
    case "proj-play": projToggle(); break;
    case "proj-export": projExport(); break;
    case "live-close": document.querySelectorAll(".livealert").forEach(x => x.remove()); break;
    case "alert-me": if (UI.place) { toggleMine(UI.place); render(); } break;
    case "unfollow": MY.places = MY.places.filter(k => k !== el.dataset.k); saveMy(); window.WEBAPP?.sync(); render(); break;
    case "ex-reset": UI.ex = Object.assign(UI.ex, {month: NOW.getMonth(), rain: "auto", mm: 100, tide: "normal", dams: {}, types: {rain: true, river: true, dam: true, coast: true}, minLevel: "low", horizon: "3d"}); render(); break;
    case "ex-focus": { const h = IX.byId[el.dataset.id]; UI.exSel = el.dataset.id; if (h) { mapFly(h.ll, 11.5); } render(); document.getElementById("mapbox")?.scrollIntoView({behavior: "smooth", block: "center"}); break; }
  }
});
document.addEventListener("keydown", ev => {
  if (ev.key === "Enter" && ev.target.matches("tr[data-act]")) ev.target.click();
});
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.id === "rp-slider") { replayStop(); replayShow(+t.value); return; }
  if (t.id === "proj-slider") { projStop(); projShow(+t.value); return; }
  if (t.id === "q") { UI.q = t.value; const r = $("#results"); if (r) r.innerHTML = resultsHtml(); anSearch(UI.q, search(UI.q).length); }
  if (t.id === "mm") { const b = t.closest("label")?.querySelector("b"); if (b) b.textContent = t.value + " mm"; }
  if (t.id === "pp-q") { peopleSearch(t.value); return; }
  if (t.id === "au-q") { UI.admin.auditF.q = t.value; const pos = t.selectionStart; render(); const n = $("#au-q"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
  if (t.id === "ad-q") { UI.admin.q = t.value; const pos = t.selectionStart; render(); const n = $("#ad-q"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
});
document.addEventListener("change", ev => {
  const t = ev.target;
  if (t.id === "year-slider") { yearsStop(); const ys = yearRange(); UI.year = String(ys[+t.value] ?? "all"); render(); return; }
  if (t.id === "country-pick" && worldCountry(t.value)) { UI.mode = "simple"; openReach(t.value); return; }
  if (t.id === "rp-import" && t.files?.[0]) { replayImportFile(t.files[0]); t.value = ""; return; }
  if (t.id === "hz-import" && t.files?.[0]) { liveImport(t.files[0]); t.value = ""; return; }
  if (t.id === "show") { yearsStop(); UI.show = t.value; render(); return; }
  if (t.id === "when" && UI.screen === "map") { UI.when = t.value; render(); return; }
  if (t.dataset.ex) {
    const k = t.dataset.ex, v = t.value;
    UI.ex[k] = ["month", "mm"].includes(k) ? +v : v;
    if (k === "country") UI.ex.area = "";
    render(); return;
  }
  if (t.dataset.dam !== undefined && UI.mode === "expert") { if (t.value) UI.ex.dams[t.dataset.dam] = t.value; else delete UI.ex.dams[t.dataset.dam]; render(); return; }
  if (t.dataset.type && UI.mode === "expert") { UI.ex.types[t.dataset.type] = t.checked; render(); return; }
  if (t.id === "ad-import" && t.files?.[0]) { adminImport(t.files[0]); t.value = ""; return; }
  if (t.id === "pp-role") { UI.admin.people.role = t.value; return; }
  if (t.id === "pp-agency") { UI.admin.people.agency = t.value; return; }
  if (t.id === "au-coll" || t.id === "au-by") { UI.admin.auditF[t.id === "au-coll" ? "coll" : "by"] = t.value; render(); return; }
  if (t.dataset.member) { memberChange(t); return; }
  if (t.id === "ap-on" || t.dataset.apAgency) { approvalChange(t); return; }
  if (t.id === "ct-filter") { AD_CONTRIB.filter = t.value; render(); return; }
  if (t.id === "an-range") { AN.range = t.value; render(); return; }
  if (t.id === "an-staff") { AN.staff = t.checked; render(); return; }
});
document.addEventListener("submit", ev => {
  const f = ev.target;
  if (["ad-form", "ad-model", "ad-role"].includes(f.id)) { ev.preventDefault(); adminSubmit(f); }
  else if (f.id === "ag-form" || f.id === "ag-request") { ev.preventDefault(); agencySubmit(f); }
  else if (f.id === "contrib-form") { ev.preventDefault(); submitContribution(f); }
  else if (f.id === "ro-form") { ev.preventDefault(); replayOutlineSubmit(f); }
  else ev.preventDefault();   /* no form ever leaves the page */
});

function speak() {
  const synth = window.speechSynthesis;
  if (!synth) { toast("Reading aloud isn't available on this device."); return; }
  if (synth.speaking) { synth.cancel(); return; }
  const m = $("#main"); if (!m) return;
  const parts = [m.querySelector("h1")?.innerText, m.querySelector("#say")?.innerText, ...[...m.querySelectorAll(".why li")].map(l => l.innerText)].filter(Boolean);
  const txt = parts.length > 1 ? parts.join(". ") : m.innerText.slice(0, 600);
  try { const u = new SpeechSynthesisUtterance(txt); u.lang = "en-GB"; u.rate = .95; synth.speak(u); } catch (e) { toast("Reading aloud isn't available on this device."); }
}

/* shared database: editors' changes reach every signed-in viewer live */
let dataTimer = null;
function afterData() {
  clearTimeout(dataTimer);
  dataTimer = setTimeout(() => {
    syncAgencySubs(); syncContribSub();
    const a = document.activeElement;
    /* never redraw under someone who is typing; their next action redraws with the new data */
    const editing = a && a.matches?.("textarea, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range])");
    if (editing || (UI.mode === "admin" && UI.admin.edit)) { reindex(); header(); checkNewNotices(); return; }
    render();
    checkNewNotices();
  }, 120);
}
async function startDb() {
  if (window.WEBAPP) { await window.WEBAPP.start(); render(); return; }   /* self-hosted web app: data comes from its server */
  if (!window.claude || typeof window.claude.use !== "function") return;
  let db = null, user = null, dl = null, room = null;
  try { [db, user, dl, room] = await Promise.all(["db", "user", "downloads", "room"].map(n => claude.use(n).catch(() => null))); } catch (e) {}
  DB.user = user; DB.downloads = dl;
  if (user) {
    try { DB.canEdit = !!(await user.canEdit()); } catch (e) {}
    try { DB.uid = await user.id(); } catch (e) {}
    try { AUTH.isOwner = !!(await user.isOwner()); } catch (e) {}
  }
  if (!db) { render(); return; }
  DB.api = db;
  db.doc("config/settings").onSnapshot(s => { DB.cfg = s.exists ? s.data() : null; afterData(); }, () => {});
  /* "members" is readable by Editors only; for everyone else that subscription simply errors and stays empty */
  COLLS.forEach(k => db.collection(k).onSnapshot(s => { DB.cols[k] = s.docs.map(d => Object.assign({}, d.data(), {id: d.id})); afterData(); }, () => {}));
  syncAgencySubs(); syncContribSub();
  render();
  anRoom(room);
  anStart(db, DB.uid);
}

render();
startDb();
