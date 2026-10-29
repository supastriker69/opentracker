/* ===== Open Tracker app core: data store, forecast model, search, Simple mode ===== */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const LEVELS = [
  {k:"low", n:"Low", word:"Low risk"},
  {k:"med", n:"Medium", word:"Medium risk"},
  {k:"high", n:"High", word:"High risk"},
  {k:"vhigh", n:"Very high", word:"Very high risk"}
];
const HORIZONS = [
  {k:"today", n:"Today"}, {k:"3d", n:"Next 3 days"}, {k:"season", n:"Next 3 months"}, {k:"year", n:"Next rainy season"}, {k:"past", n:"Past floods"}
];
const SHOWS = [
  {k:"risk", n:"Flood risk"}, {k:"safe", n:"Safe places"}, {k:"past", n:"Past floods"}, {k:"roads", n:"Roads to avoid"}
];

/* ---------- icons (shape + colour, so colour is never the only cue) ---------- */
const ICON = {
  low: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  med: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5L22.5 21h-21z" fill="currentColor"/><path d="M12 9v5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.5" fill="#fff"/></svg>',
  high: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5L22.5 12 12 22.5 1.5 12z" fill="currentColor"/><path d="M12 7.5v6" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1.5" fill="#fff"/></svg>',
  vhigh: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.6 1.5h8.8l6.1 6.1v8.8l-6.1 6.1H7.6l-6.1-6.1V7.6z" fill="currentColor"/><path d="M9 7v6M15 7v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="9" cy="16.6" r="1.4" fill="#fff"/><circle cx="15" cy="16.6" r="1.4" fill="#fff"/></svg>',
  none: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="3 3"/><path d="M9.5 9.3a2.6 2.6 0 115 1c-.6.9-2.5 1.4-2.5 3" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="17" r="1.3" fill="currentColor"/></svg>',
  warn: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5L22.5 21h-21z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.3" fill="currentColor"/></svg>',
  info: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.4" fill="currentColor"/></svg>'
};
ICON.bell = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const icon = (k, sz = 22) => (ICON[k] || ICON.none).replaceAll("SZ", sz);
const chip = (lv, txt) => `<span class="chip lv-${lv}">${icon(lv, 16)}${esc(txt ?? (LEVELS.find(l => l.k === lv)?.n || "Not enough data"))}</span>`;

/* ---------- data store: built-in dataset, replaced by the shared database when it has been set up ---------- */
const DEFAULT_SETTINGS = {
  wE: .5, wV: .5, wH: .5, tail: .7,
  cut: {med: .12, high: .30, vhigh: .55},
  freshHours: 36,
  climate: clone(FT.climate),
  notice: "",
  approval: {on: true, agencies: {}}   /* agency changes wait for an administrator unless turned off */
};
const BUILT = {
  hotspots: FT.hotspots.map(clone),
  events: FT.events.map(clone),
  regionEvents: FT.regionEvents.map((e, i) => Object.assign({id: "re" + (i + 1)}, clone(e))),
  safe: FT.safe.map((s, i) => Object.assign({id: "safe" + (i + 1)}, clone(s))),
  roads: FT.roads.map((s, i) => Object.assign({id: "road" + (i + 1)}, clone(s))),
  dams: FT.dams.map(d => Object.assign({status: "season", lastNotice: ""}, clone(d))),
  feeds: FT.feeds.map((f, i) => Object.assign({id: "feed" + (i + 1), status: "off", note: "", last: ""}, clone(f))),
  contacts: [].concat(...Object.entries(FT.emergency).map(([c, a]) => a.map((x, i) => ({id: c.toLowerCase() + "-c" + (i + 1), c, n: x.n, num: x.num})))),
  alerts: [],
  forecasts: [],
  agencies: FT.agencies.map(clone),
  roles: [],
  members: [],
  notifications: [],
  changes: [],
  approvals: [],
  reviews: [],
  replays: []
};
/* data collections editors manage; "members" is readable by editors only (database rule) */
const COLLS = ["hotspots","events","regionEvents","safe","roads","dams","feeds","contacts","alerts","forecasts","agencies","roles","members","notifications","changes","approvals","reviews","replays"];
const DB = {api: null, user: null, cfg: null, cols: {}, canEdit: false, uid: null, downloads: null};

function data(key) {
  if (DB.cfg) return DB.cols[key] || [];
  return BUILT[key];
}
function settings() { return Object.assign(clone(DEFAULT_SETTINGS), DB.cfg ? DB.cfg : {}); }

/* indexes rebuilt on every data change */
let IX = {};
function reindex() {
  const hot = data("hotspots");
  const byId = {}; hot.forEach(h => byId[h.id] = h);
  const evByHot = {};
  data("events").forEach(e => (e.ids || []).forEach(id => (evByHot[id] = evByHot[id] || []).push(e)));
  const damById = {}; data("dams").forEach(d => damById[d.id] = d);
  IX = {hot, byId, evByHot, damById, areaById: Object.fromEntries(FT.areas.map(a => [a.id, a]))};
  OUTLOOK_CACHE.clear();
  buildSearch();
}

/* ---------- forecast model ---------- */
function rainScenarioFor(zone) {
  /* admin-entered forecast for a zone, if fresh */
  const st = settings();
  const fresh = f => { const age = (Date.now() - Date.parse(f.at)) / 36e5; return age >= -1 && age <= (st.freshHours || 36); };
  const list = officialForecasts().filter(f => f.zone === zone && f.at && fresh(f))
    .sort((a, b) => (a.model ? 1 : 0) - (b.model ? 1 : 0) || String(b.at).localeCompare(String(a.at)));   /* official first, then newest */
  return list[0] || null;
}
function pDay(M, T1, tail) {
  if (!(M > 0)) return 0;
  const mu = M / 30, f = Math.min(.7, M / 150), m = mu / f;
  return f * Math.exp(-Math.pow(T1 / m, tail));
}
const logistic = x => 1 / (1 + Math.exp(-x));

/* ctx: {month, horizon, rain:'auto'|'mm', mm, tide:'normal'|'spring', dams:{id:status}} */
function computeRisk(h, ctx) {
  if (ctx.horizon === "year") return outlookFor(h);   /* the coming rainy season has its own model */
  const st = settings();
  const m = ctx.month;
  const hz = ctx.horizon === "past" ? "3d" : ctx.horizon;
  const clim = (st.climate[h.z] || FT.climate[h.z] || {m: Array(12).fill(0)}).m;
  const drivers = h.d || [];
  const coastF = drivers.includes("coast") ? (ctx.tide === "spring" ? .7 : .85) : 1;
  const T3 = (+h.t || 70) * coastF, T1 = .75 * T3;
  const causes = [];
  let Prain = 0, rainNote = "";
  /* rain */
  if (drivers.includes("rain")) {
    let det = null;
    if (hz !== "season") {
      if (ctx.rain === "mm") det = {mm: hz === "today" ? ctx.mm / 2 : ctx.mm, src: "your scenario"};
      else {
        const f = rainScenarioFor(h.z);
        if (f) det = {mm: hz === "today" ? +f.mm24 : +f.mm72, src: f.src || "an official bulletin", at: f.at};
      }
    }
    if (det && det.mm >= 0) {
      const Tx = hz === "today" ? T1 : T3;
      Prain = logistic((det.mm - Tx) / (0.2 * Tx));
      rainNote = `Forecast rain: about ${Math.round(det.mm)} mm ${hz === "today" ? "today" : "over the next 3 days"} (from ${det.src}). Flooding here usually starts around ${Math.round(Tx)} mm.`;
    } else {
      let q = 1;
      const days = hz === "today" ? [[m, 1]] : hz === "3d" ? [[m, 3]] : [[m, 30], [(m + 1) % 12, 30], [(m + 2) % 12, 31]];
      days.forEach(([mm, n]) => { q *= Math.pow(1 - pDay(clim[mm], T1, st.tail), n); });
      Prain = 1 - q;
      const mon = MONTHS[m];
      rainNote = hz === "season"
        ? (Prain < .15 ? "Rain rarely floods this area in the coming months." : Prain < .45 ? "Heavy rain sometimes floods this area in the coming months." : "Heavy rain is likely to flood this area at least once in the coming months.")
        : (Prain < .03 ? `Typical ${mon} rain rarely floods this area.` : Prain < .12 ? `Heavy ${mon} downpours sometimes flood this area.` : `${mon} downpours often flood this area.`);
    }
    causes.push({k: "rain", t: rainNote, p: Prain});
  }
  /* dams */
  let Pdam = 0;
  drivers.filter(d => IX.damById[d]).forEach(id => {
    const dam = IX.damById[id];
    const official = damState(dam);
    const status = (ctx.dams && ctx.dams[id]) || official.status || "season";
    let p, t;
    if (status === "season") {
      const s = dam.season || Array(12).fill(0);
      p = hz === "season" ? Math.max(s[m], s[(m + 1) % 12], s[(m + 2) % 12]) : s[m];
      t = p >= .5 ? `${dam.n} often releases water at this time of year.` : p >= .2 ? `${dam.n} sometimes releases water at this time of year.` : `${dam.n} rarely releases water at this time of year.`;
    } else {
      p = FT.damStatus[status]?.p ?? .05;
      t = status === "normal" ? `${dam.n}: water level normal.` : status === "alert" ? `${dam.n} is on alert for a possible release.` : status === "release" ? `${dam.n} is releasing water.` : `${dam.n} is making a major release.`;
      if (!(ctx.dams && ctx.dams[id]) && official.notice) t += ` ${official.notice}`;
    }
    if (p > Pdam) Pdam = p;
    causes.push({k: "dam", t, p});
  });
  /* rivers without a modelled dam */
  let Priver = 0;
  if (drivers.includes("river")) {
    const M = hz === "season" ? Math.max(clim[m], clim[(m + 1) % 12], clim[(m + 2) % 12]) : clim[m];
    Priver = Math.min(.5, Math.max(0, (M - 120) / 400));
    if (Priver > .05) causes.push({k: "river", t: `Rivers here are often high in ${hz === "season" ? "the coming months" : MONTHS[m]}.`, p: Priver});
  }
  if (drivers.includes("coast")) causes.push({k: "coast", t: ctx.tide === "spring" ? "Very high tides are slowing water draining to the sea." : "High tides can slow water draining to the sea.", p: 0});
  const P = 1 - (1 - Prain) * (1 - Pdam) * (1 - Priver);
  const E = Math.min(1, (+h.exp || 2) / 3), V = Math.min(1, Math.max(0, +h.vul || .5));
  const evs = IX.evByHot[h.id] || [];
  const Hh = Math.min(1, evs.length / 4);
  if (evs.length) {
    const yrs = evs.map(e => e.year).filter(Boolean).sort((a, b) => b - a);
    causes.push({k: "history", t: `Flooded ${evs.length} time${evs.length > 1 ? "s" : ""} in our records${yrs.length ? `, most recently in ${yrs[0]}` : ""}.`, p: 0});
  }
  const score = P * (st.wE * E + st.wV * V) * (1 + st.wH * Hh);
  const c = st.cut;
  const level = score >= c.vhigh ? "vhigh" : score >= c.high ? "high" : score >= c.med ? "med" : "low";
  return {P, Prain, Pdam, Priver, E, V, H: Hh, score, level, causes, nEvents: evs.length};
}
const LVL_RANK = {low: 0, med: 1, high: 2, vhigh: 3};
function maxLevel(rs) { return rs.reduce((a, r) => LVL_RANK[r.level] > LVL_RANK[a] ? r.level : a, "low"); }

/* ---------- places ---------- */
function placeHot(p) {
  if (!p) return [];
  if (p.type === "hotspot") return IX.byId[p.id] ? [IX.byId[p.id]] : [];
  if (p.type === "area") return IX.hot.filter(h => h.r === p.id);
  if (p.type === "country") return IX.hot.filter(h => h.c === p.id);
  if (p.type === "water") { const w = FT.waters[p.idx]; return (w?.ids || []).map(id => IX.byId[id]).filter(Boolean); }
  return [];   /* towns and countries outside Ghana and Nigeria have no recorded hotspots yet */
}
function placeName(p) {
  if (!p) return "";
  if (p.type === "hotspot") return IX.byId[p.id]?.n || "Unknown area";
  if (p.type === "area") { const a = IX.areaById[p.id]; return a ? `${a.n} ${a.c === "GH" ? "Region" : a.id === "NG-FC" ? "" : "State"}`.trim() : ""; }
  if (p.type === "country") return FT.countries[p.id].n;
  if (p.type === "water") return FT.waters[p.idx]?.n || "";
  if (p.type === "wc") return countryName(p.id);
  if (p.type === "wp") return worldPlace(p.id)?.n || "";
  return "";
}
function placeCountry(p) {
  if (!p) return null;
  if (p.type === "country") return p.id;
  if (p.type === "area") return IX.areaById[p.id]?.c;
  if (p.type === "hotspot") return IX.byId[p.id]?.c;
  if (p.type === "water") return placeHot(p)[0]?.c;
  if (p.type === "wc") return p.id;
  if (p.type === "wp") return worldPlace(p.id)?.c || null;
  return null;
}
function crumbsFor(p) {
  const out = [];
  if (!p) return out;
  const c = placeCountry(p);
  if (c && p.type !== "wc") out.push({p: countryPlace(c), n: countryName(c)});
  if (p.type === "hotspot") { const h = IX.byId[p.id]; if (h) out.push({p: {type: "area", id: h.r}, n: placeName({type: "area", id: h.r})}); }
  if (p.type !== "country") out.push({p, n: placeName(p)});
  return out;
}
function placeCenter(p) {
  if (p.type === "wc") { const c = worldCountry(p.id); return c ? {bounds: [[c.b[0], c.b[1]], [c.b[2], c.b[3]]], ll: c.ll, z: 5, maxZoom: 7} : {ll: [0, 15], z: 1.6}; }
  if (p.type === "wp") { const w = worldPlace(p.id); return w ? {ll: w.ll, z: 11} : {ll: [0, 15], z: 1.6}; }
  const hs = placeHot(p);
  if (p.type === "hotspot" && hs[0]) return {ll: hs[0].ll, z: 12.5};
  if (p.type === "country") return {ll: FT.countries[p.id].ll, z: FT.countries[p.id].z};
  if (p.type === "area") {
    const a = IX.areaById[p.id];
    if (hs.length) return fitOf(hs.map(h => h.ll), 7);
    return {ll: a.ll, z: 7.5};
  }
  return fitOf(hs.map(h => h.ll), 7);
}
function fitOf(pts, fallbackZ) {
  if (!pts.length) return {ll: [3, 8], z: 4.6};
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return {bounds: [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], ll: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2], z: fallbackZ};
}
function km(a, b) {
  const R = 6371, t = Math.PI / 180, dLat = (b[1] - a[1]) * t, dLon = (b[0] - a[0]) * t;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function eventsFor(p) {
  const ids = new Set(placeHot(p).map(h => h.id));
  const evs = data("events").filter(e => (e.ids || []).some(id => ids.has(id)));
  let regs = [];
  if (p.type === "area") regs = data("regionEvents").filter(e => e.r === p.id);
  if (p.type === "country") regs = data("regionEvents").filter(e => (e.r || "").startsWith(p.id));
  return evs.concat(regs.map(r => Object.assign({regionOnly: true}, r))).sort((a, b) => (b.year || 0) - (a.year || 0) || String(b.date).localeCompare(String(a.date)));
}

/* ---------- search ---------- */
let SEARCH = [], WORLD_SEARCH = null;
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function buildSearch() {
  SEARCH = [];
  Object.entries(FT.countries).forEach(([id, c]) => SEARCH.push({p: {type: "country", id}, t: c.n, s: "Country", keys: [c.n, id === "GH" ? "gh" : "ng"]}));
  FT.areas.forEach(a => SEARCH.push({p: {type: "area", id: a.id}, t: placeName({type: "area", id: a.id}), s: `${a.c === "GH" ? "Region" : "State"}, ${FT.countries[a.c].n}`, keys: [a.n, a.id === "NG-FC" ? "Abuja" : ""]}));
  IX.hot.forEach(h => SEARCH.push({p: {type: "hotspot", id: h.id}, t: h.n, s: `${placeName({type: "area", id: h.r})}, ${FT.countries[h.c]?.n || ""}`, keys: [h.n, ...(h.aka || [])]}));
  FT.waters.forEach((w, i) => SEARCH.push({p: {type: "water", idx: i}, t: w.n, s: "River, lagoon or dam", keys: [w.n, ...w.aka]}));
  SEARCH.forEach(x => x.nk = x.keys.filter(Boolean).map(norm));
  if (!WORLD_SEARCH) { WORLD_SEARCH = worldSearchEntries(); WORLD_SEARCH.forEach(x => x.nk = x.keys.filter(Boolean).map(norm)); }   /* built once */
  SEARCH.push(...WORLD_SEARCH);
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({length: a.length + 1}, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function search(q) {
  const n = norm(q);
  if (n.length < 2) return [];
  const out = [];
  SEARCH.forEach(x => {
    let best = 0;
    x.nk.forEach(k => {
      if (k === n) best = Math.max(best, 100);
      else if (k.startsWith(n)) best = Math.max(best, 80);
      else if (k.split(" ").some(w => w.startsWith(n))) best = Math.max(best, 70);
      else if (k.includes(n)) best = Math.max(best, 50);
      else if (n.length >= 4) {
        const tol = n.length >= 7 ? 2 : 1;
        if (k.split(" ").some(w => lev(w, n) <= tol) || lev(k, n) <= tol) best = Math.max(best, 40);
      }
    });
    if (best) out.push([best + (x.p.type === "country" || x.p.type === "wc" ? 5 : x.p.type === "area" ? 3 : 0), x]);
  });
  return out.sort((a, b) => b[0] - a[0]).slice(0, 8).map(a => a[1]);
}

/* ---------- UI state ---------- */
const NOW = new Date();
const UI = {
  mode: "simple", screen: "where", pickCountry: null, place: null, when: "3d", show: "risk", year: "all",
  q: "", open: {}, three: false,
  ex: {month: NOW.getMonth(), rain: "auto", mm: 100, tide: "normal", dams: {}, country: "ALL", area: "", types: {rain: true, river: true, dam: true, coast: true}, minLevel: "low", horizon: "3d", year: "all"},
  admin: {tab: "overview", edit: null, q: "", confirm: null, auditF: {coll: "", by: "", q: ""}, people: {q: "", hits: [], role: "data-editor", agency: ""}},
  ag: {type: "warning"},
  contrib: {type: null, sent: false, noPlace: false},
  replay: {id: null, i: 0}
};
try { const ts = localStorage.getItem("ft-ts"); if (ts) document.documentElement.classList.add("ts-" + ts); } catch (e) {}

function simpleCtx(horizon) {
  return {month: NOW.getMonth(), horizon: horizon || UI.when, rain: "auto", tide: "normal", dams: {}};
}
function riskOf(h, ctx) { return computeRisk(h, ctx || simpleCtx()); }

/* ---------- rendering helpers ---------- */
function toast(msg) {
  document.querySelectorAll(".toast").forEach(x => x.remove());   /* one message at a time */
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function activeAlerts(country, areaId) {
  const now = Date.now();
  return officialAlerts().filter(a => (!a.expires || Date.parse(a.expires) > now) && (!country || a.c === country || a.c === "ALL") && (!areaId || !a.areas || !a.areas.length || a.areas.includes(areaId)));
}
function alertBanners(p) {
  const c = placeCountry(p);
  const areaId = p?.type === "area" ? p.id : p?.type === "hotspot" ? IX.byId[p.id]?.r : null;
  return activeAlerts(c, areaId).map(a => `<div class="notice ${a.level === "warning" ? "alert" : a.level === "watch" ? "" : "info"}" role="alert">${a.level === "info" ? ICON.info : ICON.warn}<div><b>${esc(a.level === "warning" ? "Official flood warning" : a.level === "watch" ? "Official flood watch" : "Official notice")} · ${esc(a.agency || "")}</b>${esc(a.msg)}<div class="small muted">${a.issued ? "Issued " + esc(fmtDate(a.issued)) : ""}${a.expires ? " · until " + esc(fmtDate(a.expires)) : ""}</div></div></div>`).join("");
}
/* only http(s) links are ever rendered */
function safeUrl(u) { return /^https?:\/\/[^\s"'<>]+$/i.test(String(u || "")) ? String(u) : ""; }
function fmtDate(s) {
  const d = new Date(s); if (isNaN(d)) return s;
  return d.toLocaleString("en-GB", {day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"});
}
function evDate(e) {
  if (!e.year) return "Year not confirmed";
  if (/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return new Date(e.date + "T12:00:00").toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric"});
  if (/^\d{4}-\d{2}$/.test(e.date)) return MONTHS[+e.date.slice(5) - 1] + " " + e.year;
  return String(e.year);
}
function srcHost(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "source"; } }
function dataNote() {
  const anyFc = Object.keys(settings().climate).some(z => rainScenarioFor(z));
  const live = data("feeds").some(f => f.status === "on") || Object.keys(publisherMap()).length > 0;
  const head = live ? "Some official data is connected" : "Official live data is not connected yet";
  const body = anyFc
    ? "Official rain forecasts are used where they are available. Elsewhere Open Tracker uses typical weather for " + MONTHS[NOW.getMonth()] + ", river and dam patterns, and past floods."
    : "Open Tracker estimates risk from typical weather for " + MONTHS[NOW.getMonth()] + ", river and dam patterns, and past floods. When official rain, river and dam readings are connected, they will show here first.";
  return `<div class="notice">${ICON.info}<div><b>${head}</b>${body} <button class="linkbtn" data-act="go-status">See data status</button></div></div>`;
}

