/* ===== Projected flood for any town: where water would reach, how deep, how much =====
   Fetches the ground heights around the place (features/terrain.js), runs the flood model (features/floodsim.js)
   for a chosen storm, river rise or sea surge, then shows the water hour by hour on the 3D map with buildings.
   Runs in the public web app, where outside map data can load. */
const PROJ = {key: "", sc: "heavy", area: "town", status: "idle", progress: 0, error: "", result: null, hour: 0, timer: null, token: 0};
const PROJ_AREAS = {
  town: {halfKm: 3, cell: 40, n: "6 × 6 km"},
  wide: {halfKm: 5, cell: 60, n: "10 × 10 km"}
};

/* what the projection is for: a recorded flood area or a town */
function projectionTarget(p) {
  if (!p) return null;
  if (p.type === "hotspot") { const h = IX.byId[p.id]; return h ? {key: "hotspot:" + h.id, n: h.n, ll: h.ll, c: h.c, river: null} : null; }
  if (p.type === "wp") { const w = worldPlace(p.id); return w ? {key: "wp:" + w.id, n: w.n, ll: w.ll, c: w.c, river: w.river} : null; }
  return null;
}
const projectionAvailable = () => !!(mapCfg() && mapCfg().terrain);

/* rough river rise from the forecast flow: depth in a wide channel grows with flow to the power 0.6 */
function riverRiseFrom(rec) {
  if (!rec || !(rec.today > 0) || !(rec.peak7 > 0)) return 2;
  return Math.round(Math.min(4, Math.max(0.5, 3 * (Math.pow(rec.peak7 / rec.today, 0.6) - 1))) * 10) / 10;
}
function projectionScenarios(t, doc) {
  const list = [];
  const near = heatNear(doc, t.ll, 40);
  const mm = near ? Math.round(rain3(near.h)) : 0;
  if (mm >= 5) list.push({id: "forecast", n: `Forecast rain: ${mm} mm`, desc: `The rain forecast for the next 3 days near ${near.h.n}, falling within 12 hours`, rainMm: mm, stormHours: 12, hours: 18});
  list.push({id: "heavy", n: "Heavy storm: 100 mm", desc: "100 mm of rain in 6 hours, a storm many tropical cities see most years", rainMm: 100, stormHours: 6, hours: 12});
  list.push({id: "extreme", n: "Extreme storm: 200 mm", desc: "200 mm of rain in 12 hours, like Accra on 29 June 2026 (169 mm in a day)", rainMm: 200, stormHours: 12, hours: 18});
  const rec = doc ? doc.rivers.find(r => km(r.ll, t.ll) < 10) : null;
  if (t.river || rec) {
    const rise = riverRiseFrom(rec);
    list.push({id: "river", n: `River rises ${rise} m`, desc: rec ? `From the GloFAS river forecast (flow ${rec.trend}), with 50 mm of rain` : "A large river flood, with 50 mm of rain", rainMm: 50, stormHours: 6, hours: 12, riverRise: rise});
  }
  list.push({id: "surge", n: "Sea surge: 1 m", desc: "The sea 1 metre above normal with 100 mm of rain, as in a tropical storm (coasts only)", rainMm: 100, stormHours: 6, hours: 12, surge: 1});
  return list;
}

/* ---------- running ---------- */
async function runProjection(p) {
  const t = projectionTarget(p);
  if (!t || !projectionAvailable()) return;
  const doc = hazardsDoc(t.c) || null;
  const sc = projectionScenarios(t, doc).find(s => s.id === PROJ.sc) || projectionScenarios(t, doc)[0];
  const area = PROJ_AREAS[PROJ.area];
  const token = ++PROJ.token;
  projStop();
  Object.assign(PROJ, {key: t.key, status: "loading", progress: 0, error: "", result: null, hour: 0});
  mapProjection(null);
  render();
  try {
    const g = await TERRAIN.grid(mapCfg().terrain, t.ll, area.halfKm, area.cell);
    if (token !== PROJ.token) return;
    let river = TERRAIN.lineCells(g, mapWaterways(g.bbox));
    if (!river.length && t.river) { const c = g.index(t.river); if (c >= 0) river = [c - 1, c, c + 1, c - g.w, c + g.w].filter(i => i >= 0 && i < g.w * g.h); }
    const sea = FLOODSIM.seaMask(g.dem, g.w, g.h, 0).some(Boolean);
    if (sc.surge && !sea) throw new Error("This area does not reach the sea, so a sea surge cannot reach it. Choose another storm.");
    if (sc.riverRise && !river.length) throw new Error("No river was found in this area on the map. Choose another storm.");
    const run = FLOODSIM.create({dem: g.dem, w: g.w, h: g.h, cell: g.cell, rainMm: sc.rainMm, stormHours: sc.stormHours, hours: sc.hours,
      runoff: 0.6, manning: 0.05, seaLevel: sea ? 0 : null, surge: sc.surge || 0, river: sc.riverRise ? river : [], riverRise: sc.riverRise || 0});
    PROJ.status = "running"; render();
    while (!run.step(1800)) {
      if (token !== PROJ.token) return;
      PROJ.progress = run.time / (sc.hours * 3600);
      const bar = $("#proj-bar"); if (bar) bar.style.width = Math.round(PROJ.progress * 100) + "%";
      await new Promise(r => setTimeout(r, 0));   /* let the page breathe between slices */
    }
    if (token !== PROJ.token) return;
    const frames = run.frames;
    let peakAt = 0;
    frames.forEach((f, k) => { if (f.volume > frames[peakAt].volume) peakAt = k; });
    const mine = window.WEBAPP?.location?.();
    const here = mine && g.index(mine) >= 0 ? {ll: mine, n: "your saved location"} : {ll: t.ll, n: `the centre of ${t.n}`};
    PROJ.result = {t, sc, area, g, frames, peak: FLOODSIM.peak(frames), peakAt, balance: run.balance(), here, hereIdx: g.index(here.ll),
      fixed: run.fixed, made: new Date().toISOString(), buildings: null, sea, rivers: river.length};
    Object.assign(PROJ, {status: "done", hour: peakAt});
    render();
    PROJ.result.buildings = countFloodedBuildings(PROJ.result);
    const b = $("#proj-buildings"); if (b) b.innerHTML = buildingsText(PROJ.result);
  } catch (e) {
    if (token !== PROJ.token) return;
    Object.assign(PROJ, {status: "error", error: e.message || "The projection could not run."});
    render();
  }
}

/* map buildings (from the street map's vector tiles) standing in water at the peak */
function countFloodedBuildings(res) {
  const pts = mapBuildings(res.g.bbox);
  if (!pts.length) return null;
  let wet = 0;
  for (const ll of pts) { const i = res.g.index(ll); if (i >= 0 && !res.fixed[i] && res.peak.depth[i] >= FLOODSIM.WET) wet++; }
  return {wet, seen: pts.length};
}
function buildingsText(res) {
  const b = res.buildings;
  if (!b) return "Buildings: zoom the map in on the area to count the buildings water would reach.";
  return `<b>About ${b.wet.toLocaleString("en-GB")}</b> of the ${b.seen.toLocaleString("en-GB")} buildings on the map here would have water around them at the peak.`;
}

/* ---------- showing ---------- */
const PROJ_COLORS = {};
function rgbOf(cssColor) {
  if (PROJ_COLORS[cssColor]) return PROJ_COLORS[cssColor];
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const g = c.getContext("2d"); g.fillStyle = cssColor; g.fillRect(0, 0, 1, 1);
  return (PROJ_COLORS[cssColor] = Array.from(g.getImageData(0, 0, 1, 1).data.slice(0, 3)));
}
/* one hour of water as a picture laid over the 3D ground */
function projectionImage(res, depth) {
  const {w, h} = res.g, canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d"), img = g.createImageData(w, h);
  const cols = [1, 2, 3, 4].map(k => rgbOf(cssv("--water-" + k)));
  for (let i = 0; i < w * h; i++) {
    const d = depth[i];
    if (res.fixed[i] || d < FLOODSIM.WET) continue;
    const k = d >= 1.2 ? 3 : d >= 0.6 ? 2 : d >= 0.3 ? 1 : 0;
    img.data.set(cols[k], 4 * i);
    img.data[4 * i + 3] = 200;
  }
  g.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}
function projShow(hour) {
  const res = PROJ.result; if (!res) return;
  PROJ.hour = Math.max(0, Math.min(res.frames.length - 1, hour));
  const f = res.frames[PROJ.hour];
  mapProjection(projectionImage(res, f.depth), res.g.bbox);
  const now = $("#proj-now"); if (now) now.innerHTML = projHourText(res, PROJ.hour);
  const sl = $("#proj-slider"); if (sl && +sl.value !== PROJ.hour) sl.value = PROJ.hour;
}
function projHourText(res, k) {
  const f = res.frames[k], d = res.hereIdx >= 0 ? f.depth[res.hereIdx] : 0;
  return `Hour ${k} · <b>${fmtArea(f.km2)}</b> under water · <b>${esc(fmtVolume(f.volume))}</b> of water · at ${esc(res.here.n)}: ${esc(depthWords(d))}${d >= FLOODSIM.WET ? ` (${d.toFixed(2)} m)` : ""}`;
}
function projToggle() {
  if (PROJ.timer) { projStop(); return; }
  const res = PROJ.result; if (!res) return;
  if (PROJ.hour >= res.frames.length - 1) PROJ.hour = 0;
  PROJ.timer = setInterval(() => { if (!PROJ.result || PROJ.hour >= PROJ.result.frames.length - 1 || UI.screen !== "project") { projStop(); return; } projShow(PROJ.hour + 1); }, 900);
  const b = $("#proj-play"); if (b) { b.textContent = "❚❚ Pause"; b.setAttribute("aria-pressed", "true"); }
}
function projStop() {
  clearInterval(PROJ.timer); PROJ.timer = null;
  const b = $("#proj-play"); if (b) { b.textContent = "▶ Play"; b.setAttribute("aria-pressed", "false"); }
}
function projReset() { PROJ.token++; projStop(); Object.assign(PROJ, {status: "idle", result: null, error: "", progress: 0, hour: 0}); mapProjection(null); }

/* ---------- saving as a replay file (administrators import it in the claude.ai page) ---------- */
function projectionReplay(res) {
  const day = res.made.slice(0, 10);
  const id = `proj-${res.t.key.split(":")[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${res.sc.id}-${day.replace(/-/g, "")}`;
  const start = Date.parse(day + "T00:00:00Z");
  return {app: "OpenTracker-replay", version: 1,
    replay: {id, kind: "model", title: `Projected flood: ${res.t.n} (${res.sc.n})`, c: res.t.c, areas: [], bbox: res.g.bbox.map(v => Math.round(v * 1e5) / 1e5),
      source: "Open Tracker flood projection on AWS Terrain Tiles", notes: res.sc.desc, link: "",
      assumptions: projectionAssumptions(res), classes: FLOODSIM.CLASSES, made: res.made, madeWith: "Open Tracker projection 1 (diffusive-wave model)"},
    frames: res.frames.map((f, k) => ({t: new Date(start + k * 3600e3).toISOString(), label: `Hour ${k}`, km2: Math.round(f.km2 * 100) / 100, m3: Math.round(f.volume),
      fc: FLOODSIM.frameCollection(FLOODSIM.classify(f.depth.map((v, i) => (res.fixed[i] ? 0 : v))), res.g.w, res.g.h, res.g.bbox)}))};
}
function projectionAssumptions(res) {
  return [`Ground heights from AWS Terrain Tiles on a ${Math.round(res.g.cell)} m grid over ${res.area.n}; buildings and trees can raise or lower the ground in places.`,
    "60% of the rain runs off; the rest soaks in. Drains and culverts are not modelled: blocked drains make floods worse, working ones smaller.",
    res.sc.riverRise ? `Rivers drawn on the map rise ${res.sc.riverRise} m over ${res.sc.stormHours} hours.` : "Rivers stay at their normal level.",
    res.sea ? `The sea is held at its normal level${res.sc.surge ? ` plus a ${res.sc.surge} m surge` : ""}.` : "No sea in this area.",
    "Water leaves the area at its edges as if the ground carried on gently downhill."];
}
function projExport() {
  const res = PROJ.result; if (!res) return;
  try {
    const file = projectionReplay(res);
    const url = URL.createObjectURL(new Blob([JSON.stringify(file)], {type: "application/json"}));
    const a = Object.assign(document.createElement("a"), {href: url, download: file.replay.id + ".json"});
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("Saved. Import it in Open Tracker Admin → Flood replays.");
  } catch (e) { toast(e.message); }
}
