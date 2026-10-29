/* ===== Analytics: anonymous visit tracking (collector) and the admin dashboard =====
   Collector: each signed-in visitor who is allowed to write keeps ONE document, analytics/<their id>
   (database rule: they write only their own; only Editors and the Owner read the collection).
   A visit is one opening of the page. Pages, searches, feature use and the exit point are merged into
   that visit with debounced update() calls, so two open tabs never overwrite each other.
   Live "online now" uses room presence, which is never stored. Device Do Not Track / GPC is respected. */
const AN = {
  on: false, ref: null, sid: null, sess: null, timer: null, busy: false, again: false, dirty: false,
  lastKey: "", qTimer: null, pendingQ: null, room: null, peers: [], peersSub: null,
  rows: null, loading: false, err: false, range: "7", staff: false
};
const AN_MAX_SESS = 30, AN_MAX_PAGES = 60, AN_MAX_Q = 30, AN_FLUSH_MS = 5000, AN_DUR_CAP = 4 * 3600;
const AN_PRIVATE = () => navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;

function anDevice() {
  const w = Math.min(window.screen?.width || innerWidth, innerWidth);
  const touch = !!window.matchMedia?.("(pointer: coarse)").matches;
  return w < 700 ? "phone" : touch ? "tablet" : "computer";
}
function anTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; } }
function anSecs() { return Math.max(0, Math.round((Date.now() - Date.parse(AN.sess.start)) / 1000)); }

/* where the viewer is right now, as [screen, place key, risk level shown] */
function anWhere() {
  const s = UI.mode === "simple" ? UI.screen : UI.mode;
  const p = UI.mode === "simple" && UI.place && s !== "where" ? UI.place : null;
  const key = p ? (p.type === "water" ? "water:" + p.idx : p.type + ":" + p.id) : "";
  let lvl = "";
  if (p && s === "answer" && UI.when !== "past") { const hs = placeHot(p); if (hs.length) lvl = maxLevel(hs.map(h => riskOf(h, simpleCtx(UI.when)))); }
  return [s, key, lvl];
}

async function anStart(db, uid) {
  if (!db || !uid || AN.on || AN_PRIVATE()) return;
  const ref = db.doc("analytics/" + uid);
  let prev = null;
  try { const s = await ref.get(); prev = s.exists ? s.data() : null; } catch (e) { return; }
  const now = new Date().toISOString();
  const old = prev && prev.s && typeof prev.s === "object" ? prev.s : {};
  const keys = Object.keys(old).filter(k => old[k] && old[k].start).sort((a, b) => String(old[a].start).localeCompare(String(old[b].start)));
  AN.sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  AN.sess = {start: now, end: now, dev: anDevice(), w: innerWidth, lang: String(navigator.language || "").slice(0, 12), tz: anTz(),
    dark: !!window.matchMedia?.("(prefers-color-scheme: dark)").matches, ret: keys.length > 0, staff: false,
    n: 0, pages: [], q: [], ev: {}, exit: null, warn: 0};
  AN.lastKey = ""; anRecord(anWhere());   /* the first page goes out with the first write */
  try {
    if (!prev || keys.length >= AN_MAX_SESS) {
      const keep = {}; keys.slice(-(AN_MAX_SESS - 1)).forEach(k => keep[k] = old[k]);
      keep[AN.sid] = AN.sess;
      await ref.set({first: prev?.first || now, last: now, s: keep});
    } else await ref.update({last: now, s: {[AN.sid]: AN.sess}});
  } catch (e) { return; }   /* this viewer can't write (view-only access): stay silent, count nothing */
  AN.ref = ref; AN.on = true;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") anFlush(true); });
  window.addEventListener("pagehide", () => anFlush(true));
  anPage();   /* in case the page changed while the first write was in flight */
}
async function anRoom(room) {
  if (!room || AN_PRIVATE()) return;
  AN.room = room;
  anPresence();
}
function anPresence() {
  if (!AN.room) return;
  const [s, p] = anWhere();
  const c = UI.mode === "simple" && UI.place ? placeCountry(UI.place) || "" : "";
  AN.room.presence({s, p, c, d: anDevice()}).catch(() => {});
}

function anDirty() {
  AN.dirty = true;
  if (!AN.timer) AN.timer = setTimeout(() => { AN.timer = null; anFlush(false); }, AN_FLUSH_MS);
}
async function anFlush(final) {
  if (!AN.on) return;
  if (final) { clearTimeout(AN.timer); AN.timer = null; AN.dirty = true; }
  if (!AN.dirty) return;
  if (AN.busy) { AN.again = true; return; }       /* one write at a time per document */
  AN.busy = true; AN.dirty = false;
  AN.sess.staff = AN.sess.staff || AUTH.anyAdmin() || !!AUTH.agency();   /* roles can arrive after the visit starts */
  AN.sess.end = new Date().toISOString();
  try { await AN.ref.update({last: AN.sess.end, s: {[AN.sid]: AN.sess}}); }
  catch (e) { if (e?.code === "invalid_argument" || e?.code === "not_granted" || e?.code === "revoked") AN.on = false; }
  AN.busy = false;
  if (AN.again) { AN.again = false; AN.dirty = true; anFlush(false); }
}

/* called after every render */
function anPage() {
  const w = anWhere(), key = w.join("|");
  if (key === AN.lastKey) return;
  anPresence();
  if (!AN.on) { AN.lastKey = key; return; }
  if (anRecord(w)) anDirty();
}
/* adds one page view to the current visit; false if it is the page already recorded */
function anRecord(w) {
  const key = w.join("|");
  if (key === AN.lastKey) return false;
  AN.lastKey = key;
  const S = AN.sess;
  S.n++;
  if (S.pages.length < AN_MAX_PAGES) S.pages.push([w[0], w[1], w[2], anSecs()]);
  S.exit = [w[0], w[1]];
  S.staff = AUTH.anyAdmin() || !!AUTH.agency();
  if (w[0] === "answer" && UI.place) {
    const ar = UI.place.type === "area" ? UI.place.id : UI.place.type === "hotspot" ? IX.byId[UI.place.id]?.r : null;
    if (activeAlerts(placeCountry(UI.place), ar).length) S.warn = 1;
  }
  return true;
}
/* searches are recorded once the visitor stops typing */
function anSearch(q, n) {
  if (!AN.on) return;
  clearTimeout(AN.qTimer);
  AN.pendingQ = {q, n};
  AN.qTimer = setTimeout(anSearchCommit, 1200);
}
function anSearchCommit() {
  clearTimeout(AN.qTimer); AN.qTimer = null;
  const p = AN.pendingQ; AN.pendingQ = null;
  if (!p || !AN.on) return;
  const q = norm(p.q).slice(0, 60);
  if (q.length < 2) return;
  const Q = AN.sess.q, last = Q[Q.length - 1];
  if (last && (last[0] === q || q.startsWith(last[0]) && anSecs() - last[2] < 20)) { last[0] = q; last[1] = p.n; anDirty(); return; }   /* refining the same search */
  if (Q.length < AN_MAX_Q) { Q.push([q, p.n, anSecs(), 0]); anDirty(); }
}
function anPick() {
  if (!AN.on) return;
  if (AN.pendingQ) anSearchCommit();
  const Q = AN.sess.q, last = Q[Q.length - 1];
  if (last && !last[3]) { last[3] = 1; anDirty(); }
}
function anEvent(name) {
  if (!AN.on) return;
  const k = String(name).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
  if (!k) return;
  AN.sess.ev[k] = (AN.sess.ev[k] || 0) + 1;
  anDirty();
}
const AN_EVENTS = {contribute: "open-contribute", "alert-me": "follow-place", alerts: "open-alerts", "wa-push": "turn-on-push", "wa-install": "install-app", "wa-locate": "use-location", speak: "read-aloud", ts: "text-size", three: "3d", copy: "copy-number", "map-safe": "safe-places", year: "past-year", "to-map": "open-map", "go-status": "data-status"};
function anClick(act, el) {
  if (!AN.on) return;
  if (act === "open" && UI.q) anPick();
  let k = AN_EVENTS[act];
  if (act === "when") k = "when-" + el.dataset.k;
  if (act === "mode") k = "mode-" + el.dataset.k;
  if (act === "toggle" && !UI.open[el.dataset.k]) k = "open-" + el.dataset.k;
  if (act === "alert-me" && UI.place && isMine(UI.place)) k = null;   /* count follows, not unfollows */
  if (k) anEvent(k);
}

/* ===================== admin dashboard ===================== */
const AN_RANGES = [["1", "Last 24 hours"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["all", "All time"]];
const AN_SCREENS = {contribute: "Contribute", alerts: "Alerts", where: "Choosing a place", answer: "Risk answer", map: "Map", status: "Data status", expert: "Expert view", agency: "Agency portal", admin: "Admin"};
const AN_FEATURES = [["open-contribute", "Opened Contribute"], ["follow-place", "Followed a place for alerts"], ["open-alerts", "Opened Alerts"], ["install-app", "Installed the web app"], ["turn-on-push", "Turned on phone alerts"], ["use-location", "Used their location"],
  ["open-todo", "Opened “What should I do?”"], ["open-safe", "Opened “Nearest safe place”"], ["copy-number", "Copied an emergency number"], ["open-map", "Opened the map"],
  ["safe-places", "Showed safe places on the map"], ["read-aloud", "Used Read aloud"], ["text-size", "Changed text size"], ["3d", "Switched the map to 3D"],
  ["when-today", "Checked “Today”"], ["when-season", "Checked “Next 3 months”"], ["when-past", "Looked at past floods"], ["past-year", "Picked a past-flood year"],
  ["data-status", "Opened data status"], ["mode-expert", "Opened Expert view"], ["mode-agency", "Opened the Agency portal"]];
/* device time zone → country (the browser gives no location without asking, and Open Tracker never asks) */
const TZ_COUNTRY = {
  "Africa/Accra": "Ghana", "Africa/Lagos": "Nigeria", "Africa/Abidjan": "Côte d'Ivoire or Ghana", "Africa/Lome": "Togo", "Africa/Porto-Novo": "Benin",
  "Africa/Ouagadougou": "Burkina Faso", "Africa/Niamey": "Niger", "Africa/Dakar": "Senegal", "Africa/Bamako": "Mali", "Africa/Conakry": "Guinea",
  "Africa/Freetown": "Sierra Leone", "Africa/Monrovia": "Liberia", "Africa/Banjul": "Gambia", "Africa/Bissau": "Guinea-Bissau", "Africa/Nouakchott": "Mauritania",
  "Africa/Douala": "Cameroon", "Africa/Ndjamena": "Chad", "Africa/Kinshasa": "DR Congo", "Africa/Nairobi": "Kenya", "Africa/Johannesburg": "South Africa",
  "Africa/Cairo": "Egypt", "Atlantic/Cape_Verde": "Cabo Verde", "Europe/London": "United Kingdom", "Europe/Dublin": "Ireland", "Europe/Paris": "France",
  "Europe/Berlin": "Germany", "Europe/Amsterdam": "Netherlands", "America/New_York": "United States", "America/Chicago": "United States",
  "America/Denver": "United States", "America/Los_Angeles": "United States", "America/Toronto": "Canada", "Asia/Dubai": "United Arab Emirates",
  "Asia/Kolkata": "India", "Asia/Shanghai": "China", "Australia/Sydney": "Australia"
};
function anCountry(tz) { return TZ_COUNTRY[tz] || (tz ? "Other (" + tz.split("/")[0] + ")" : "Unknown"); }
const AN_HOUR_FMT = {};
function anLocalHour(iso, tz) {
  try {
    const f = AN_HOUR_FMT[tz] || (AN_HOUR_FMT[tz] = new Intl.DateTimeFormat("en-GB", {hour: "numeric", hourCycle: "h23", timeZone: tz || undefined}));
    return +f.format(new Date(iso)) % 24;
  } catch (e) { return new Date(iso).getHours(); }
}
function anPlaceLabel(key) {
  const i = key.indexOf(":"), t = key.slice(0, i), id = key.slice(i + 1);
  if (t === "water") return (FT.waters[+id]?.n || "River search");
  const p = {type: t, id};
  return (t === "hotspot" ? IX.byId[id] : t === "area" ? IX.areaById[id] : FT.countries[id]) ? placeName(p) : key;
}
function anExitLabel(e) { return e ? (AN_SCREENS[e[0]] || e[0]) + (e[1] ? " · " + anPlaceLabel(e[1]) : "") : "Left within seconds"; }

async function anLoad() {
  if (!DB.api || AN.loading) return;
  AN.loading = true;
  try {
    const snap = await DB.api.collection("analytics").get();
    AN.rows = snap.docs.map(d => ({id: d.id, d: d.data()}));
    AN.err = false;
  } catch (e) { AN.err = true; }
  AN.loading = false;
  if (UI.mode === "admin" && UI.admin.tab === "analytics") render();
}
function anSubscribePeers() {
  if (!AN.room || AN.peersSub) return;
  try {
    AN.peersSub = AN.room.onPeers(ch => {
      AN.peers = ch.peers.filter(p => p.kind === "viewer");
      const box = $("#an-live"); if (box) box.innerHTML = anLiveHtml();
    }, () => {});
  } catch (e) {}
}

function anSessions() {
  const days = AN.range === "all" ? Infinity : +AN.range;
  const from = Date.now() - days * 864e5;
  const out = [];
  (AN.rows || []).forEach(({id, d}) => Object.values(d?.s || {}).forEach(s => {
    if (!s || typeof s.start !== "string") return;
    const t = Date.parse(s.start); if (!(t >= from)) return;
    if (s.staff && !AN.staff) return;
    out.push(Object.assign({}, s, {vid: id, t, dur: Math.min(AN_DUR_CAP, Math.max(0, (Date.parse(s.end) - t) / 1000 || 0))}));
  }));
  return out.sort((a, b) => a.t - b.t);
}
const tally = () => { const m = new Map(); return {add(k, v = 1) { m.set(k, (m.get(k) || 0) + v); }, top(n) { return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n); }, size: () => m.size, get: k => m.get(k) || 0}; };
function anCompute(S) {
  const r = {visits: S.length, visitors: new Set(S.map(s => s.vid)).size, ret: S.filter(s => s.ret).length};
  const durs = S.map(s => s.dur).sort((a, b) => a - b);
  r.avgDur = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
  r.medDur = durs.length ? durs[Math.floor(durs.length / 2)] : 0;
  r.ppv = S.length ? S.reduce((a, s) => a + (s.n || 0), 0) / S.length : 0;
  r.bounce = S.length ? S.filter(s => (s.n || 0) <= 1).length / S.length : 0;
  r.warn = S.filter(s => s.warn).length;
  const T = k => (r[k] = tally());
  ["screens", "places", "regions", "countries", "levels", "loc", "lang", "dev", "exits", "terms", "picks", "zero", "feat"].forEach(T);
  r.hours = Array(24).fill(0);
  r.days = new Map();
  let nq = 0;
  S.forEach(s => {
    const day = new Date(s.t); day.setHours(0, 0, 0, 0); r.days.set(+day, (r.days.get(+day) || 0) + 1);
    r.hours[anLocalHour(s.start, s.tz)]++;
    r.loc.add(anCountry(s.tz)); r.lang.add(String(s.lang || "unknown").split("-")[0] || "unknown"); r.dev.add(s.dev || "unknown");
    r.exits.add(anExitLabel(s.exit));
    const seenP = new Set();
    (s.pages || []).forEach(([sc, p, lv]) => {
      r.screens.add(AN_SCREENS[sc] || sc);
      if (p && !seenP.has(p)) {
        seenP.add(p); r.places.add(p);
        const t = p.slice(0, p.indexOf(":")), id = p.slice(p.indexOf(":") + 1);
        const reg = t === "area" ? id : t === "hotspot" ? IX.byId[id]?.r : null; if (reg) r.regions.add(reg);
        const c = t === "country" ? id : reg ? IX.areaById[reg]?.c : null; if (c) r.countries.add(c);
      }
      if (sc === "answer" && lv) r.levels.add(lv);
    });
    (s.q || []).forEach(([q, n, , pick]) => { nq++; r.terms.add(q); if (pick) r.picks.add(q); if (!n) r.zero.add(q); });
    Object.keys(s.ev || {}).forEach(k => r.feat.add(k));
  });
  r.nq = nq;
  const has = f => S.filter(f).length;
  const pg = (s, sc) => (s.pages || []).some(p => p[0] === sc);
  r.funnel = [["Opened Open Tracker", S.length], ["Chose a place", has(s => (s.pages || []).some(p => p[1]))], ["Saw a risk answer", has(s => pg(s, "answer"))],
    ["Read what to do or safe places", has(s => s.ev?.["open-todo"] || s.ev?.["open-safe"] || s.ev?.["safe-places"])], ["Opened the map", has(s => pg(s, "map"))],
    ["Copied an emergency number", has(s => s.ev?.["copy-number"])]];
  return r;
}

/* ---- small charts: SVG and CSS bars styled by theme tokens ---- */
function anCols(vals, labels, title) {
  const W = 640, H = 150, n = vals.length, max = Math.max(1, ...vals), bw = W / n;
  const step = Math.max(1, Math.ceil(n / 12));
  return `<figure class="anchart"><svg viewBox="0 0 ${W} ${H + 20}" role="img" aria-label="${esc(title)}">
    ${vals.map((v, i) => `<rect x="${(i * bw + bw * .12).toFixed(1)}" y="${(H - v / max * H).toFixed(1)}" width="${(bw * .76).toFixed(1)}" height="${(v / max * H).toFixed(1)}" rx="2"><title>${esc(labels[i])}: ${v}</title></rect>`).join("")}
    ${labels.map((l, i) => i % step ? "" : `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H + 15}" text-anchor="middle">${esc(l)}</text>`).join("")}
  </svg><figcaption class="small muted">Highest: ${max === 1 && !vals.some(v => v) ? 0 : max}</figcaption></figure>`;
}
function anBars(rows, total, label = x => x) {
  if (!rows.length) return `<p class="muted small">No data yet for this period.</p>`;
  const max = Math.max(...rows.map(r => r[1]));
  return `<ul class="anbars">${rows.map(([k, v]) => `<li><span class="l">${esc(label(k))}</span><span class="b"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span><span class="v num">${v}${total ? ` <span class="muted">${Math.round(v / total * 100)}%</span>` : ""}</span></li>`).join("")}</ul>`;
}
function anDur(s) { s = Math.round(s); return s < 60 ? s + " s" : s < 3600 ? Math.floor(s / 60) + " min " + (s % 60) + " s" : (s / 3600).toFixed(1) + " h"; }
function anLiveHtml() {
  const P = AN.peers;
  if (!AN.room) return `<p class="small muted">Live counts aren't available in this view.</p>`;
  const sc = tally(), pl = tally();
  P.forEach(p => { sc.add(AN_SCREENS[p.presence?.s] || "Opening the page"); if (p.presence?.p) pl.add(String(p.presence.p)); });
  return `<div class="kpis"><div class="kpi live"><b class="num">${P.length}</b><span>online now</span></div><div class="kpi"><b class="num">${P.filter(p => p.presence?.d === "phone").length}</b><span>on phones</span></div><div class="kpi"><b class="num">${P.filter(p => p.guest).length}</b><span>from outside your organisation</span></div></div>
    <div class="grid2"><div><h3>What they're looking at</h3>${anBars(sc.top(8), P.length)}</div><div><h3>Places open right now</h3>${anBars(pl.top(8), 0, anPlaceLabel)}</div></div>`;
}

function adAnalytics() {
  anSubscribePeers();
  if (!AN.rows && !AN.err) { anLoad(); return `<div class="card"><p>Loading analytics…</p></div>`; }
  if (AN.err) return `<div class="card"><p>Analytics could not be loaded.</p><button class="sbtn" data-act="an-reload">Try again</button></div>`;
  const S = anSessions(), r = anCompute(S);
  const days = AN.range === "all" ? Math.min(90, Math.max(7, Math.ceil((Date.now() - (S[0]?.t || Date.now())) / 864e5) + 1)) : Math.max(+AN.range, 1);
  const dayVals = [], dayLabels = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); dayVals.push(r.days.get(+d) || 0); dayLabels.push(d.toLocaleDateString("en-GB", {day: "numeric", month: "short"})); }
  const termRows = r.terms.top(15);
  const confirm = UI.admin.confirm && UI.admin.confirm.k?.startsWith("an-") ? confirmBox() : "";
  return `
  <div class="card"><h2>Analytics</h2>
    <p class="small muted">Who is counted: everyone signed in whose access lets them use Open Tracker's shared data (members of your organisation, Contributors and Editors). Viewers from outside and visitors who aren't signed in can't be counted by this platform. Devices that ask not to be tracked are not counted. No names are stored or shown.</p>
    <div class="toolbar">
      <label class="field" style="min-width:180px"><span>Period</span><select id="an-range">${AN_RANGES.map(([k, n]) => `<option value="${k}" ${AN.range === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <div class="checks" style="align-self:end"><label><input type="checkbox" id="an-staff" ${AN.staff ? "checked" : ""}> Include staff and agency visits</label></div>
      <button class="sbtn" data-act="an-reload" style="align-self:end">Refresh</button>
      <button class="sbtn" data-act="an-export" style="align-self:end">Download visits (CSV)</button>
    </div>
  </div>
  <div class="card"><h2>Right now</h2><div id="an-live">${anLiveHtml()}</div></div>
  <div class="card"><h2>Visits</h2>
    <div class="kpis">
      <div class="kpi"><b class="num">${r.visits}</b><span>visits</span></div>
      <div class="kpi"><b class="num">${r.visitors}</b><span>different people</span></div>
      <div class="kpi"><b class="num">${r.visits ? Math.round(r.ret / r.visits * 100) : 0}%</b><span>returning visits</span></div>
      <div class="kpi"><b class="num">${anDur(r.avgDur)}</b><span>average time (median ${anDur(r.medDur)})</span></div>
      <div class="kpi"><b class="num">${r.ppv.toFixed(1)}</b><span>pages per visit</span></div>
      <div class="kpi"><b class="num">${Math.round(r.bounce * 100)}%</b><span>left after one page</span></div>
      <div class="kpi"><b class="num">${r.nq}</b><span>searches</span></div>
      <div class="kpi"><b class="num">${r.warn}</b><span>visits that saw an official warning</span></div>
    </div>
    <h3>Visits per day</h3>${anCols(dayVals, dayLabels, "Visits per day")}
    <h3>Busiest hours (visitor's local time)</h3>${anCols(r.hours, r.hours.map((_, h) => String(h).padStart(2, "0") + ":00"), "Visits by hour")}
  </div>
  <div class="grid2">
    <div class="card"><h2>Where visitors are</h2><p class="small muted">From the device time zone.</p>${anBars(r.loc.top(12), r.visits)}<h3>Languages</h3>${anBars(r.lang.top(6), r.visits, l => ({en: "English", fr: "French", ha: "Hausa", yo: "Yoruba", ig: "Igbo", tw: "Twi", ak: "Akan", ee: "Ewe"})[l] || l)}</div>
    <div class="card"><h2>Places people checked</h2>${anBars(r.countries.top(4), 0, c => FT.countries[c]?.n || c)}<h3>Regions and states</h3>${anBars(r.regions.top(10), 0, id => IX.areaById[id]?.n || id)}<h3>Pages for a place</h3>${anBars(r.places.top(10), 0, anPlaceLabel)}</div>
  </div>
  <div class="grid2">
    <div class="card"><h2>What people searched for</h2>
      ${termRows.length ? `<div class="tablewrap"><table><thead><tr><th>Search</th><th class="n">Times</th><th class="n">Picked a result</th></tr></thead><tbody>${termRows.map(([q, n]) => `<tr><td>${esc(q)}</td><td class="n">${n}</td><td class="n">${Math.round(r.picks.get(q) / n * 100)}%</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">No searches yet for this period.</p>`}
      <h3>Searches that found nothing</h3><p class="small muted">Add these as “other names” on a flood area so people find it next time.</p>${anBars(r.zero.top(10))}
    </div>
    <div class="card"><h2>Where people left off</h2><p class="small muted">The last page of each visit.</p>${anBars(r.exits.top(10), r.visits)}<h3>Most viewed pages</h3>${anBars(r.screens.top(8))}</div>
  </div>
  <div class="grid2">
    <div class="card"><h2>Journey</h2><p class="small muted">How far visits got.</p>${anBars(r.funnel, r.visits)}<h3>Risk levels people were shown</h3>${anBars(r.levels.top(4), 0, k => LEVELS.find(l => l.k === k)?.word || k)}</div>
    <div class="card"><h2>Features used</h2><p class="small muted">Visits that used each feature.</p>${anBars(AN_FEATURES.map(([k, n]) => [n, r.feat.get(k)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]), r.visits)}<h3>Devices</h3>${anBars(r.dev.top(4), r.visits, d => ({phone: "Phone", tablet: "Tablet", computer: "Computer"})[d] || d)}</div>
  </div>
  ${AUTH.can("backup.manage") ? `<div class="card"><h2>Keep analytics tidy</h2><p class="small muted">Each person keeps their last ${AN_MAX_SESS} visits. You can also remove older records.</p>
    <div class="toolbar"><button class="sbtn" data-act="ad-ask" data-k="an-prune">Delete visits older than 90 days</button><button class="sbtn danger" data-act="ad-ask" data-k="an-clear">Delete all analytics</button></div>${confirm}</div>` : ""}`;
}
function anCsv() {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const vids = new Map();
  const head = ["start", "end", "seconds", "visitor", "returning", "device", "language", "time_zone", "country_from_time_zone", "pages", "path", "searches", "left_off", "features", "saw_warning", "staff"];
  return [head.join(",")].concat(anSessions().map(s => {
    if (!vids.has(s.vid)) vids.set(s.vid, "V" + (vids.size + 1));   /* visitor ids are replaced by V1, V2 … in exports */
    return [s.start, s.end, Math.round(s.dur), vids.get(s.vid), s.ret ? "yes" : "no", s.dev, s.lang, s.tz, anCountry(s.tz), s.n,
      (s.pages || []).map(p => p[0] + (p[1] ? ":" + p[1] : "")).join(" > "), (s.q || []).map(q => q[0]).join(" | "), anExitLabel(s.exit),
      Object.keys(s.ev || {}).join(" "), s.warn ? "yes" : "no", s.staff ? "yes" : "no"].map(cell).join(",");
  })).join("\n");
}
/* admin housekeeping; both are recorded in the audit log */
async function anHousekeep(all) {
  REPO.require(AUTH.can("backup.manage"), "delete analytics");
  const snap = await DB.api.collection("analytics").get();
  const cut = Date.now() - 90 * 864e5;
  let removed = 0;
  for (const d of snap.docs) {
    const v = d.data() || {}, s = v.s || {};
    if (all) { removed += Object.keys(s).length; await DB.api.doc("analytics/" + d.id).delete(); continue; }
    const keep = {}; Object.entries(s).forEach(([k, x]) => { if (x && Date.parse(x.start) >= cut) keep[k] = x; else removed++; });
    if (Object.keys(keep).length === Object.keys(s).length) continue;
    if (Object.keys(keep).length) await DB.api.doc("analytics/" + d.id).set(Object.assign({}, v, {s: keep}));
    else await DB.api.doc("analytics/" + d.id).delete();
  }
  await REPO.audit(all ? "deleted all analytics" : "deleted analytics older than 90 days", "analytics", "-", null, {visits: removed});
  AN.rows = null;
  toast(`Removed ${removed} visit${removed === 1 ? "" : "s"}.`);
}
async function anAct(act) {
  try {
    if (act === "an-reload") { AN.rows = null; AN.err = false; return render(); }
    if (act === "an-export") return saveFile(`opentracker-visits-${new Date().toISOString().slice(0, 10)}.csv`, anCsv(), "text/csv");
  } catch (e) { toast(errText(e)); }
}
