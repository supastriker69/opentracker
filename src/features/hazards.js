/* ===== Live flood and heat data for every country =====
   The data feeds (webapp/lib/feeds) build one summary per country: heat for the next 7 days at each town, river
   flow, official warnings (CAP), current disasters (GDACS) and satellite scenes. The web app reads them from its
   server; the claude.ai page reads a snapshot an administrator imports (Admin → Live data).
   This module loads them on demand and turns them into the projected reach of heat and floods. */
const HZ = {docs: new Map(), pending: new Set(), stale: new Set()};

const HEAT_LEVELS = [
  {k: 0, n: "Normal", word: "Normal heat"},
  {k: 1, n: "Hot", word: "Hot"},
  {k: 2, n: "Heatwave", word: "Heatwave"},
  {k: 3, n: "Dangerous heat", word: "Dangerous heat"},
  {k: 4, n: "Extreme danger", word: "Extreme heat danger"}
];
const HEAT_ADVICE = [
  ["Drink water through the day.", "Check Open Tracker again when hot weather is forecast."],
  ["Drink water often, even before you feel thirsty.", "Stay in shade between late morning and late afternoon.", "Never leave children or animals in a parked car."],
  ["Drink water often and eat light meals.", "Stay out of the sun from 11 am to 4 pm; rest in the coolest room.", "Check every day on older people, babies, pregnant women and anyone unwell.", "Wear light, loose clothes and a hat outdoors."],
  ["Avoid hard work or sport outdoors; do it early in the morning if you must.", "Cool down with water on your skin and moving air.", "Check on older people, babies and anyone unwell twice a day.", "Know the signs of heatstroke: hot dry skin, confusion, fainting. Call the emergency number at once."],
  ["Stay in the coolest place you can reach for the hottest hours; go to a cooled public place if home is too hot.", "Do no hard work outdoors.", "Keep everyone drinking water; wet skin and fan it to cool down.", "Heatstroke is an emergency: call the emergency number below and cool the person while you wait."]
];
const FLOOD_WORDS = {warning: "Flood warning signs", watch: "Flood watch signs", none: "No flood signs"};

/* ---------- loading ---------- */
async function loadHazards(key) {
  if (window.WEBAPP) return window.WEBAPP.hazards(key);
  if (DB.api) { const s = await DB.api.collection("hazards").doc(key).get(); return s.exists ? s.data() : null; }
  return null;
}
/* the summary for a country code or "world": the document, null when there is none, undefined while loading.
   A stale summary is shown while its fresh copy loads. */
function hazardsDoc(key) {
  const have = HZ.docs.has(key);
  if ((!have || HZ.stale.has(key)) && !HZ.pending.has(key)) {
    HZ.pending.add(key);
    loadHazards(key).then(doc => validHazards(doc, key), () => (have ? HZ.docs.get(key) : null)).then(doc => {
      const changed = !have || JSON.stringify(doc) !== JSON.stringify(HZ.docs.get(key));
      HZ.docs.set(key, doc); HZ.pending.delete(key); HZ.stale.delete(key);
      if (changed) afterData();
    });
  }
  return have ? HZ.docs.get(key) : undefined;
}
function hazardsForget() { for (const k of HZ.docs.keys()) HZ.stale.add(k); }

/* only well-formed summaries are used; every text in them is escaped when shown */
function validHazards(doc, key) {
  if (!doc || typeof doc !== "object") return null;
  if (key === "world") return doc.countries && typeof doc.countries === "object" ? doc : null;
  const list = v => (Array.isArray(v) ? v : []);
  const pt = ll => Array.isArray(ll) && ll.length === 2 && ll.every(Number.isFinite);
  return {c: key, updated: typeof doc.updated === "string" ? doc.updated : null,
    heat: list(doc.heat).filter(h => h && pt(h.ll) && Array.isArray(h.days)),
    rivers: list(doc.rivers).filter(r => r && pt(r.ll)),
    alerts: list(doc.alerts).filter(a => a && typeof a.id === "string"),
    disasters: list(doc.disasters).filter(e => e && typeof e.id === "string"),
    scenes: doc.scenes && typeof doc.scenes === "object" ? doc.scenes : {},
    sources: list(doc.sources).filter(s => typeof s === "string")};
}

/* ---------- reading the summaries ---------- */
const num = v => (typeof v === "number" && Number.isFinite(v) ? v : null);

/* the heat record of the town nearest to a point (within maxKm) */
function heatNear(doc, ll, maxKm = 75) {
  if (!doc) return null;
  let best = null;
  for (const h of doc.heat) { const d = km(ll, h.ll); if (d <= maxKm && (!best || d < best.d)) best = {h, d}; }
  return best;
}

/* rain expected over the next 3 days at a heat record */
const rain3 = h => h.days.slice(0, 3).reduce((s, d) => s + (num(d.rain) || 0), 0);

function pointInRing(ll, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > ll[1]) !== (yj > ll[1]) && ll[0] < (xj - xi) * (ll[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function alertCovers(a, ll) {
  const areas = Array.isArray(a.areas) ? a.areas : [];
  const shaped = areas.some(ar => (ar.polygons || []).length || (ar.circles || []).length);
  if (!shaped) return true;   /* no shape: the warning covers the issuing country */
  return areas.some(ar => (ar.polygons || []).some(r => pointInRing(ll, r)) || (ar.circles || []).some(c => km(ll, c.ll) <= c.km));
}

/* Everything that says a flood may reach this country (or this point): each sign has a level, a place, how far
   it reaches (km) and a plain sentence. Official warnings come first. */
function floodSigns(doc, ll = null, radiusKm = 60) {
  if (!doc) return [];
  const out = [];
  const near = p => !ll || (p && km(ll, p) <= radiusKm);
  for (const a of doc.alerts.filter(x => x.hazard === "flood")) {
    if (ll && !alertCovers(a, ll)) continue;
    out.push({kind: "official", level: ["Extreme", "Severe"].includes(a.severity) ? "warning" : "watch", text: `${a.event || "Flood warning"} from ${a.agency}${a.headline ? ": " + a.headline : ""}`, alert: a});
  }
  for (const e of doc.disasters.filter(x => (x.type === "FL" || x.type === "TC") && x.current)) {
    if (ll && !(near(e.ll) || (e.bbox && ll[0] >= e.bbox[0] && ll[0] <= e.bbox[2] && ll[1] >= e.bbox[1] && ll[1] <= e.bbox[3]))) continue;
    out.push({kind: "disaster", level: e.level === "Green" ? "watch" : "warning", ll: e.ll, km: 40, bbox: e.bbox, text: `${e.title} (GDACS ${e.level.toLowerCase()} alert)`, event: e});
  }
  for (const r of doc.rivers) {
    if (!near(r.ll) || !["rising fast", "rising"].includes(r.trend)) continue;
    const ratio = num(r.today) && num(r.peak7) ? r.peak7 / r.today : null;
    out.push({kind: "river", level: r.trend === "rising fast" ? "warning" : "watch", ll: r.river || r.ll, km: r.trend === "rising fast" ? 25 : 15,
      text: `River near ${r.n} ${r.trend}${ratio ? `: flow up to ${ratio.toFixed(1)} times today's within a week` : ""}`});
  }
  for (const h of doc.heat) {
    const mm = rain3(h);
    if (mm < 50 || !near(h.ll)) continue;
    out.push({kind: "rain", level: mm >= 100 ? "warning" : "watch", ll: h.ll, km: mm >= 100 ? 25 : 15, mm, text: `${Math.round(mm)} mm of rain expected in ${h.n} over 3 days`});
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "warning" ? -1 : 1) || (a.kind === "official" ? -1 : b.kind === "official" ? 1 : 0));
}
const floodLevel = signs => (signs.some(s => s.level === "warning") ? "warning" : signs.length ? "watch" : "none");

/* how far the heat reaches on one forecast day: towns at heatwave level or worse, and the people living in them */
function heatReach(doc, day = 0) {
  if (!doc) return {towns: [], people: 0, worst: 0};
  const towns = doc.heat.map(h => ({h, d: h.days[day]})).filter(x => x.d && x.d.level >= 2).sort((a, b) => b.d.level - a.d.level || b.h.pop - a.h.pop);
  return {towns, people: towns.reduce((s, x) => s + (x.h.pop || 0), 0), worst: towns.length ? towns[0].d.level : Math.max(0, ...doc.heat.map(h => h.days[day]?.level || 0))};
}
/* How far a town's forecast heat reaches on the map. Heatwaves cover whole regions and the forecast models' cells are
   9–25 km wide, so a town's reading stands for its surroundings: wider for worse heat and for bigger towns (35 to 110 km). */
const heatReachKm = (level, pop) => Math.max(35, Math.min(110, 25 + 15 * level + 4 * Math.log10(Math.max(1e4, pop || 0) / 1e4)));

/* ---------- words and numbers ---------- */
const heatChip = lv => `<span class="chip heat-${lv}">${esc(HEAT_LEVELS[lv]?.n || "No data")}</span>`;
const floodChip = lv => `<span class="chip flood-${lv}">${esc(FLOOD_WORDS[lv])}</span>`;
const signChip = lv => `<span class="chip flood-${lv}">${lv === "warning" ? "Warning" : "Watch"}</span>`;
function fmtPeople(n) { return n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)} million` : n >= 1e3 ? `${Math.round(n / 1e3)} thousand` : String(n); }
function fmtVolume(m3) {
  if (m3 >= 1e9) return `${(m3 / 1e9).toFixed(1)} billion m³`;
  if (m3 >= 1e6) return `${(m3 / 1e6).toFixed(1)} million m³`;
  if (m3 >= 1e3) return `${Math.round(m3 / 1e3)} thousand m³`;
  return `${Math.round(m3)} m³`;
}
function fmtArea(km2) { return km2 <= 0 ? "0 km²" : km2 < 0.01 ? "under 0.01 km²" : `${km2.toFixed(2)} km²`; }
const pools = m3 => Math.round(m3 / 2500);   /* an Olympic pool holds about 2,500 m³ */
function depthWords(m) {
  if (m < FLOODSIM.WET) return "dry or a thin film of water";
  return FLOODSIM.CLASSES.slice().reverse().find(c => m >= c.min).n.toLowerCase();
}
/* "today", "tomorrow" or "on Sat, 31 Oct", to follow a word in a sentence or heading */
const dayPhrase = (iso, i) => (i < 2 ? dayName(iso, i).toLowerCase() : "on " + dayName(iso, i));
function dayName(iso, i) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  const d = new Date(iso + "T12:00:00Z");
  return isNaN(d) ? iso : d.toLocaleDateString("en-GB", {weekday: "short", day: "numeric", month: "short"});
}
function hazardsUpdated(doc) { return doc && doc.updated ? `Updated ${fmtDate(doc.updated)}` : ""; }

/* ---------- claude.ai page: importing the live data the web app's feeds gathered (Admin → Live data) ---------- */
const SNAPSHOT_MAX_DOC = 900 * 1024;   /* bytes per country record in the shared database */
async function importSnapshot(file) {
  REPO.require(AUTH.can("data.edit") && !APPROVAL.gate(), "import live data");
  if (file.size > 60e6) throw new Error("That file is too large (60 MB at most).");
  let snap;
  try { snap = JSON.parse(await file.text()); } catch (e) { throw new Error("That isn't an Open Tracker live data file."); }
  if (!snap || snap.app !== "OpenTracker-snapshot" || snap.version !== 1 || !snap.countries || typeof snap.countries !== "object") throw new Error("That isn't an Open Tracker live data file.");
  const world = validHazards(snap.world, "world");
  if (!world) throw new Error("The file has no world summary.");
  const docs = [];
  for (const [cc, raw] of Object.entries(snap.countries)) {
    if (!/^[A-Z]{2}$/.test(cc) || !worldCountry(cc)) continue;
    const doc = validHazards(raw, cc);
    if (!doc) continue;
    if (JSON.stringify(doc).length > SNAPSHOT_MAX_DOC) throw new Error(`${countryName(cc)}'s data is too large for the shared database; lower FEED_PLACES on the web app.`);
    docs.push([cc, doc]);
  }
  for (const [cc, doc] of docs) await DB.api.collection("hazards").doc(cc).set(doc);
  await DB.api.collection("hazards").doc("world").set(world);   /* last: the world map points at the countries */
  await REPO.audit("imported live data", "hazards", "snapshot", null, {countries: docs.length, gathered: String(snap.at || "").slice(0, 40)});
  hazardsForget();
  return {countries: docs.length, at: snap.at};
}
