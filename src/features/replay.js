/* ===== Flood replays: watch a flood grow and shrink =====
   Two kinds, one player:
   - model:     hour by hour, water depth from the SFINCS flood model (modelling/ makes the files)
   - satellite: date by date, water outlines mapped from satellites (satellite/ makes the files)
   A replay = a small record in "replays" (titles, times, areas covered) + one map layer per step, kept apart
   in "geo" and loaded only when someone watches. Imported from a replay file, never typed in. */
const REPLAY_KINDS = {model: "Flood model", satellite: "Satellite map"};
const REPLAY_MAX_FRAMES = 200, REPLAY_FRAME_BYTES = 200000, REPLAY_MAX_POINTS = 40000;
const SAT_CLASSES = [{k: 1, n: "Water seen from space"}];
const RP = {cache: new Map(), timer: null, token: 0};

/* ---------- reading ---------- */
function replays() {
  /* the web app gets replays (and their layers) from its own server; claude.ai from the shared database */
  return (window.WEBAPP ? window.WEBAPP.replays() : data("replays"))
    .filter(r => r && Array.isArray(r.frames) && r.frames.length)
    .sort((a, b) => String(b.frames[0].t).localeCompare(String(a.frames[0].t)));
}
function replayById(id) { return replays().find(r => r.id === id) || null; }
const replayYear = r => +String(r.frames[0].t).slice(0, 4);
function inBbox(ll, b) { return ll[0] >= b[0] && ll[0] <= b[2] && ll[1] >= b[1] && ll[1] <= b[3]; }
/* replays that cover a place: by region/state, or by a flood area inside the replay's box */
function replaysFor(p) {
  const hs = placeHot(p);
  const regs = new Set(p.type === "area" ? [p.id] : hs.map(h => h.r));
  const pts = hs.length ? hs.map(h => h.ll) : p.type === "wp" ? [placeCenter(p).ll] : [];   /* towns anywhere: by position */
  return replays().filter(r => (r.areas || []).some(a => regs.has(a)) || (r.bbox && pts.some(ll => inBbox(ll, r.bbox))));
}
async function loadFrame(r, i) {
  const f = r.frames[i]; if (!f) return null;
  if (RP.cache.has(f.geo)) return RP.cache.get(f.geo);
  let fc = null;
  if (window.WEBAPP) fc = await window.WEBAPP.geo(f.geo);
  else if (DB.api) { const s = await DB.api.collection("geo").doc(f.geo).get(); fc = s.exists ? s.data().fc : null; }
  if (fc) RP.cache.set(f.geo, fc);
  return fc;
}
function replayClasses(r) { return r.kind === "satellite" ? SAT_CLASSES : r.classes || []; }
function frameWhen(r, i) {
  const f = r.frames[i];
  const d = new Date(f.t);
  const date = isNaN(d) ? "" : d.toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric"});
  if (r.kind === "model") return `${i === 0 ? "Start" : i === 1 ? "1 hour" : i + " hours"} · ${date} ${isNaN(d) ? "" : d.toISOString().slice(11, 16) + " GMT"}`;
  return date;
}

/* ---------- checking a replay file (the server applies the same rules) ---------- */
function geomPoints(g) {
  if (!g || !Array.isArray(g.coordinates)) throw new Error("A shape has no coordinates.");
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : null;
  if (!polys) throw new Error("Only areas (Polygon or MultiPolygon) can be shown.");
  let n = 0;
  polys.forEach(poly => poly.forEach(ring => {
    if (!Array.isArray(ring) || ring.length < 4) throw new Error("A shape has a broken outline.");
    ring.forEach(c => {
      if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) throw new Error("Coordinates must be longitude and latitude (EPSG:4326).");
      n++;
    });
  }));
  return n;
}
function checkFrameFc(fc, classes) {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features) || fc.features.length > 50) throw new Error("Each step needs a GeoJSON FeatureCollection (at most 50 shapes).");
  let pts = 0;
  const ks = new Set(classes.map(c => c.k));
  fc.features.forEach(f => { pts += geomPoints(f.geometry); if (!ks.has(f.properties?.k)) throw new Error("A shape has an unknown depth class."); });
  if (pts > REPLAY_MAX_POINTS || JSON.stringify(fc).length > REPLAY_FRAME_BYTES) throw new Error("A step is too detailed. Simplify the shapes and try again.");
}
function validateReplay(b) {
  if (!b || b.app !== "OpenTracker-replay" || b.version !== 1 || !b.replay || !Array.isArray(b.frames)) throw new Error("That isn't an Open Tracker replay file.");
  const r = b.replay, s = (v, n) => typeof v === "string" ? v.trim().slice(0, n) : "";
  if (!/^[a-z0-9-]{2,80}$/.test(r.id || "")) throw new Error("The replay id must use lowercase letters, numbers and dashes.");
  if (!REPLAY_KINDS[r.kind]) throw new Error("The replay kind must be model or satellite.");
  const bbox = Array.isArray(r.bbox) && r.bbox.length === 4 && r.bbox.every(Number.isFinite) && r.bbox[0] < r.bbox[2] && r.bbox[1] < r.bbox[3] ? r.bbox : null;
  if (!bbox) throw new Error("The replay needs a valid bounding box.");
  const classes = r.kind === "satellite" ? SAT_CLASSES : (Array.isArray(r.classes) ? r.classes : []).filter(c => c && [1, 2, 3, 4].includes(c.k)).map(c => ({k: c.k, n: s(c.n, 60), min: Number.isFinite(c.min) ? c.min : null, max: Number.isFinite(c.max) ? c.max : null}));
  if (!classes.length) throw new Error("The replay has no depth classes.");
  if (!b.frames.length || b.frames.length > REPLAY_MAX_FRAMES) throw new Error(`A replay needs 1 to ${REPLAY_MAX_FRAMES} steps.`);
  const frames = b.frames.map(f => {
    if (!f || isNaN(Date.parse(f.t))) throw new Error("Each step needs a valid time.");
    checkFrameFc(f.fc, classes);
    return {t: new Date(f.t).toISOString(), label: s(f.label, 40), km2: Number.isFinite(f.km2) && f.km2 >= 0 ? Math.round(f.km2 * 100) / 100 : 0,
      m3: Number.isFinite(f.m3) && f.m3 >= 0 ? Math.round(f.m3) : null, fc: f.fc};
  }).sort((x, y) => x.t.localeCompare(y.t));
  return {
    meta: {id: r.id, kind: r.kind, title: s(r.title, 120) || "Flood replay", c: /^[A-Z]{2}$/.test(r.c || "") ? r.c : "ALL",
      areas: (Array.isArray(r.areas) ? r.areas : []).filter(a => IX.areaById[a]), bbox: bbox.map(v => Math.round(v * 1e5) / 1e5),
      source: s(r.source, 200), notes: s(r.notes, 500), link: safeUrl(r.link) || "",
      assumptions: (Array.isArray(r.assumptions) ? r.assumptions : []).slice(0, 10).map(a => s(a, 300)).filter(Boolean),
      classes, frameMinutes: r.kind === "model" ? 60 : null, made: s(r.made, 40), madeWith: s(r.madeWith, 80)},
    frames
  };
}

/* ---------- a single satellite outline (GeoJSON) made into a step, simplified to fit ---------- */
function rdp(pts, tol) {   /* Ramer–Douglas–Peucker on one ring, in degrees */
  if (pts.length < 5) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > best) { best = d; bi = i; } }
    if (best > tol) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  const out = pts.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : null;
}
function ringKm2(ring) {   /* shoelace on a local flat projection */
  const lat0 = ring[0][1] * Math.PI / 180, kx = 111.32 * Math.cos(lat0), ky = 110.574;
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * kx * ring[i + 1][1] * ky - ring[i + 1][0] * kx * ring[i][1] * ky;
  return Math.abs(a) / 2;
}
function outlineToFrame(geojson) {
  const geoms = [];
  const take = g => { if (!g) return; if (g.type === "FeatureCollection") g.features.forEach(f => take(f.geometry)); else if (g.type === "Feature") take(g.geometry); else if (g.type === "Polygon") geoms.push([g.coordinates]); else if (g.type === "MultiPolygon") geoms.push(g.coordinates); else if (g.type === "GeometryCollection") g.geometries.forEach(take); };
  take(geojson);
  const polys = [].concat(...geoms);
  if (!polys.length) throw new Error("The file has no areas (Polygon or MultiPolygon).");
  polys.forEach(p => p.forEach(ring => ring.forEach(c => { if (!Array.isArray(c) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) throw new Error("Coordinates must be longitude and latitude (EPSG:4326)."); })));
  const km2 = polys.reduce((sum, p) => sum + Math.max(0, ringKm2(p[0]) - p.slice(1).reduce((h, r) => h + ringKm2(r), 0)), 0);
  for (let tol = 0.00005; tol < 0.05; tol *= 1.7) {
    const simple = polys.map(p => p.map(r => rdp(r, tol)).filter(Boolean)).filter(p => p.length && p[0]);
    const fc = {type: "FeatureCollection", features: [{type: "Feature", properties: {k: 1}, geometry: {type: "MultiPolygon", coordinates: simple.map(p => p.map(r => r.map(c => [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5])))}}]};
    try { checkFrameFc(fc, SAT_CLASSES); return {fc, km2: Math.round(km2 * 100) / 100}; } catch (e) { if (!/too detailed/.test(e.message)) throw e; }
  }
  throw new Error("That outline is too detailed even after simplifying. Cut it to the flooded area first.");
}
function bboxOfFc(fc, prev) {
  const b = prev ? prev.slice() : [180, 90, -180, -90];
  fc.features.forEach(f => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).forEach(p => p[0].forEach(([x, y]) => { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); })));
  return b.map(v => Math.round(v * 1e5) / 1e5);
}

/* ---------- saving (administrators; agency editors ask an administrator) ---------- */
const geoId = id => `${id}--${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
async function saveReplay(meta, frames, keepFrames = []) {
  REPO.require(AUTH.can("data.edit") && !APPROVAL.gate(), "publish flood replays");
  const stored = [];
  for (const f of frames) {
    const id = geoId(meta.id);
    await DB.api.collection("geo").doc(id).set({fc: f.fc, replay: meta.id});
    stored.push({t: f.t, label: f.label, km2: f.km2, m3: Number.isFinite(f.m3) ? f.m3 : null, geo: id});
  }
  const all = keepFrames.concat(stored).sort((a, b) => a.t.localeCompare(b.t));
  await REPO.set("replays", Object.assign({}, meta, {frames: all}));
  RP.cache.clear();
}
async function importReplayFile(file) {
  if (file.size > 20e6) throw new Error("That file is too large (20 MB at most).");
  const v = validateReplay(JSON.parse(await file.text()));
  const old = data("replays").find(r => r.id === v.meta.id);
  await saveReplay(v.meta, v.frames);
  if (old) await deleteGeo(old.frames);    /* a re-import replaces the old layers */
  return v;
}
async function addOutline(form) {
  const v = id => (form.querySelector(id)?.value || "").trim();
  const file = form.querySelector("#ro-file")?.files?.[0];
  if (!file) throw new Error("Choose a GeoJSON file.");
  if (file.size > 30e6) throw new Error("That file is too large (30 MB at most).");
  const date = v("#ro-date");
  if (!date || isNaN(Date.parse(date))) throw new Error("Enter the date the satellite saw the water.");
  let gj; try { gj = JSON.parse(await file.text()); } catch (e) { throw new Error("That file isn't GeoJSON."); }
  const {fc, km2} = outlineToFrame(gj);
  const frame = {t: new Date(date).toISOString(), label: "", km2, fc};
  const target = v("#ro-target");
  if (target) {
    const r = data("replays").find(x => x.id === target && x.kind === "satellite");
    if (!r) throw new Error("Choose a satellite replay to add to.");
    const meta = Object.assign({}, r, {bbox: bboxOfFc(fc, r.bbox)});
    delete meta.frames;
    return saveReplay(meta, [frame], r.frames);
  }
  const title = v("#ro-title"), id = v("#ro-id");
  if (!title) throw new Error("Give the replay a title, for example “Accra floods, June 2026”.");
  if (!/^[a-z0-9-]{2,80}$/.test(id)) throw new Error("The short name can use lowercase letters, numbers and dashes.");
  if (data("replays").some(r => r.id === id)) throw new Error("That short name is already used.");
  const src = v("#ro-link");
  if (src && !safeUrl(src)) throw new Error("The product link must start with http:// or https://");
  return saveReplay({id, kind: "satellite", title: title.slice(0, 120), c: v("#ro-c") || "GH", areas: v("#ro-areas").split(",").map(s => s.trim()).filter(a => IX.areaById[a]),
    bbox: bboxOfFc(fc), source: v("#ro-source").slice(0, 200) || "Satellite flood map", notes: "", link: src, assumptions: [], classes: SAT_CLASSES, frameMinutes: null, made: new Date().toISOString().slice(0, 10), madeWith: ""}, [frame]);
}
async function deleteGeo(frames) { for (const f of frames || []) await DB.api.collection("geo").doc(f.geo).delete().catch(() => {}); }
async function deleteReplay(id) {
  const r = data("replays").find(x => x.id === id); if (!r) return;
  await REPO.del("replays", id);
  await deleteGeo(r.frames);
  RP.cache.clear();
}

/* ---------- public screens ---------- */
function replayPick(r) {
  const peak = Math.max(...r.frames.map(f => f.km2));
  const span = r.kind === "model" ? `${r.frames.length - 1} hours` : `${r.frames.length} satellite map${r.frames.length > 1 ? "s" : ""}`;
  return `<button class="pick" data-act="replay-open" data-id="${esc(r.id)}"><span class="grow"><span class="t">${esc(r.title)}</span><span class="s">${esc(REPLAY_KINDS[r.kind])} · ${esc(frameWhen(r, 0).split(" · ").pop())} · ${span} · up to ${peak} km² under water</span></span><span class="chip">Watch</span></button>`;
}
function viewReplays() {
  if (UI.replay.id && replayById(UI.replay.id)) return viewReplayPlayer(replayById(UI.replay.id));
  const all = replays(), sats = all.filter(r => r.kind === "satellite"), models = all.filter(r => r.kind === "model");
  return `<button class="back" data-act="back">← Back</button>
    <h1>Watch floods over time</h1>
    <button class="btn" data-act="years-map">Play recorded floods year by year</button>
    <div class="card"><h2>Real floods seen from space</h2><p class="small muted">Water outlines mapped from satellite images, date by date. Radar satellites such as Sentinel-1 see through cloud.</p>
      ${sats.length ? `<div class="results">${sats.map(replayPick).join("")}</div>` : `<p>No satellite maps published yet. The team adds them from Copernicus and UNOSAT flood maps.</p>`}</div>
    <div class="card"><h2>What a storm would do, hour by hour</h2><p class="small muted">From the Open Tracker flood model (SFINCS): rain falls, water runs downhill, gathers in low places, then drains away.</p>
      ${models.length ? `<div class="results">${models.map(replayPick).join("")}</div>` : `<p>No model runs published yet for Accra, Cape Coast or Lagos.</p>`}</div>`;
}
function viewReplayPlayer(r) {
  const n = r.frames.length, i = Math.min(UI.replay.i, n - 1);
  const classes = replayClasses(r);
  return `<button class="back" data-act="replay-close">← All replays</button>
    <h1>${esc(r.title)}</h1>
    <p class="small muted">${esc(REPLAY_KINDS[r.kind])} · ${esc(r.source)}${r.link ? ` · <a href="${esc(r.link)}" target="_blank" rel="noopener">Original map</a>` : ""}</p>
    <div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="Flood replay map"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button></div>
      <div class="mapattr">Map data: Natural Earth · MapLibre</div></div>
    <div class="card player">
      <div class="player-row">
        <button class="btn primary inline" id="rp-play" data-act="replay-play" aria-pressed="${!!RP.timer}">${RP.timer ? "❚❚ Pause" : "▶ Play"}</button>
        <button class="sbtn" data-act="replay-step" data-d="-1" aria-label="Step back">◀</button>
        <input id="rp-slider" type="range" min="0" max="${n - 1}" value="${i}" aria-label="${r.kind === "model" ? "Hour" : "Date"}">
        <button class="sbtn" data-act="replay-step" data-d="1" aria-label="Step forward">▶</button>
      </div>
      <p class="player-now" id="rp-now" aria-live="polite">${frameNow(r, i)}</p>
      <div id="rp-spark">${sparkline(r, i)}</div>
      <div class="legend">${classes.map(c => `<span><i class="sw w${c.k}${r.kind === "satellite" ? " sat" : ""}"></i>${esc(c.n)}</span>`).join("")}</div>
    </div>
    <details class="card"><summary><b>How this was made</b></summary>
      <ul class="plain">${(r.assumptions || []).map(a => `<li class="small">${esc(a)}</li>`).join("")}${r.notes ? `<li class="small">${esc(r.notes)}</li>` : ""}${r.madeWith ? `<li class="small muted">${esc(r.madeWith)}${r.made ? " · " + esc(r.made.slice(0, 10)) : ""}</li>` : ""}</ul>
      <p class="small muted">${r.kind === "model" ? "A model shows what this storm would do on today's ground. Real floods also depend on blocked drains, rivers and tides." : "Satellites see open water; water under trees or between buildings can be missed."}</p></details>`;
}
/* one step in words: when, area under water and, for flood projections, the volume of water */
function frameNow(r, i) {
  const f = r.frames[i];
  return `${esc(frameWhen(r, i))} · <b>${f.km2} km²</b> under water${Number.isFinite(f.m3) && f.m3 > 0 ? ` · <b>${esc(fmtVolume(f.m3))}</b> of water` : ""}`;
}
/* area under water over the replay; a dot marks the step on screen */
function sparkline(r, i) {
  const W = 640, H = 90, n = r.frames.length, max = Math.max(0.01, ...r.frames.map(f => f.km2));
  const X = k => n === 1 ? W / 2 : 8 + k * (W - 16) / (n - 1), Y = v => H - 18 - v / max * (H - 30);
  const line = r.frames.map((f, k) => `${k ? "L" : "M"}${X(k).toFixed(1)} ${Y(f.km2).toFixed(1)}`).join("");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Area under water at each step, up to ${max} km²">
    <path d="${line}L${X(n - 1).toFixed(1)} ${H - 18}L${X(0).toFixed(1)} ${H - 18}Z" class="area"/><path d="${line}" class="line"/>
    <circle cx="${X(i).toFixed(1)}" cy="${Y(r.frames[i].km2).toFixed(1)}" r="5" class="dot"/>
    <text x="8" y="${H - 3}" class="tick">${esc(r.kind === "model" ? "Start" : frameWhen(r, 0))}</text><text x="${W - 8}" y="${H - 3}" text-anchor="end" class="tick">${esc(r.kind === "model" ? (n - 1) + " hours" : frameWhen(r, n - 1))}</text>
    <text x="8" y="12" class="tick">${max} km²</text></svg>`;
}

/* ---------- playing ---------- */
async function replayShow(i) {
  const r = replayById(UI.replay.id); if (!r) return;
  UI.replay.i = Math.max(0, Math.min(r.frames.length - 1, i));
  const token = ++RP.token;
  const fc = await loadFrame(r, UI.replay.i).catch(() => null);
  if (token !== RP.token || UI.screen !== "replays") return;   /* a newer step or another screen won */
  mapReplay(fc || {type: "FeatureCollection", features: []}, r.kind);
  const now = $("#rp-now"); if (now) now.innerHTML = frameNow(r, UI.replay.i);
  const sl = $("#rp-slider"); if (sl && +sl.value !== UI.replay.i) sl.value = UI.replay.i;
  const sp = $("#rp-spark"); if (sp) sp.innerHTML = sparkline(r, UI.replay.i);
  loadFrame(r, UI.replay.i + 1).catch(() => {});   /* fetch the next step early */
}
function replayStop() {
  clearInterval(RP.timer); RP.timer = null;
  const b = $("#rp-play"); if (b) { b.textContent = "▶ Play"; b.setAttribute("aria-pressed", "false"); }
}
function replayToggle() {
  if (RP.timer) return replayStop();
  const r = replayById(UI.replay.id); if (!r) return;
  if (UI.replay.i >= r.frames.length - 1) UI.replay.i = 0;
  RP.timer = setInterval(() => {
    if (UI.screen !== "replays" || !replayById(UI.replay.id)) return replayStop();
    const last = replayById(UI.replay.id).frames.length - 1;
    if (UI.replay.i >= last) return replayStop();
    replayShow(UI.replay.i + 1);
  }, 1100);
  const b = $("#rp-play"); if (b) { b.textContent = "❚❚ Pause"; b.setAttribute("aria-pressed", "true"); }
  replayShow(UI.replay.i);
}
function replayMapView() {
  const r = replayById(UI.replay.id);
  const b = r ? r.bbox : ALL_FIT.bounds.flat();
  return {show: "replay", three: false, hot: [], past: [], safe: [], roads: [], dams: [], sel: null, reach: [], fit: {bounds: [[b[0], b[1]], [b[2], b[3]]], maxZoom: 15}};
}

/* ---------- recorded floods year by year ---------- */
const YEARS = {timer: null};
function yearRange() {
  const ys = data("events").concat(data("regionEvents")).map(e => e.year).filter(Boolean).concat(replays().map(replayYear));
  if (!ys.length) return [];
  const lo = Math.max(Math.min(...ys), NOW.getFullYear() - 24), hi = NOW.getFullYear();
  return Array.from({length: hi - lo + 1}, (_, k) => lo + k);
}
function yearSliderHtml() {
  const ys = yearRange(); if (!ys.length) return "";
  const cur = /^\d{4}$/.test(UI.year) ? +UI.year : null;
  const idx = cur ? Math.max(0, ys.indexOf(cur)) : ys.length - 1;
  const sat = cur ? replays().filter(r => r.kind === "satellite" && replayYear(r) === cur) : [];
  return `<div class="card player">
    <div class="player-row">
      <button class="btn primary inline" data-act="years-play" aria-pressed="${!!YEARS.timer}">${YEARS.timer ? "❚❚ Pause" : "▶ Play the years"}</button>
      <input id="year-slider" type="range" min="0" max="${ys.length - 1}" value="${idx}" aria-label="Year">
      <b class="player-year">${cur || "All years"}</b>
    </div>
    <div class="toolbar"><button class="sbtn" data-act="year" data-y="all" aria-pressed="${UI.year === "all"}">All years</button><button class="sbtn" data-act="year" data-y="unknown" aria-pressed="${UI.year === "unknown"}">Year not confirmed</button></div>
    ${sat.length ? `<p class="small">Satellite maps from ${cur}: ${sat.map(r => `<button class="linkbtn" data-act="replay-open" data-id="${esc(r.id)}">${esc(r.title)}</button>`).join(", ")}</p>` : ""}
  </div>`;
}
function yearsStop() { clearInterval(YEARS.timer); YEARS.timer = null; }
function yearsToggle() {
  if (YEARS.timer) { yearsStop(); return render(); }
  const ys = yearRange(); if (!ys.length) return;
  let k = /^\d{4}$/.test(UI.year) ? ys.indexOf(+UI.year) : -1;
  if (k < 0 || k >= ys.length - 1) k = -1;
  const step = () => {
    if (UI.screen !== "map" || UI.show !== "past") return yearsStop();
    k++;
    if (k >= ys.length) { yearsStop(); return render(); }
    UI.year = String(ys[k]); render();
  };
  YEARS.timer = setInterval(step, 1300);
  step();
}
/* the largest satellite outline of the chosen year, drawn under the past-flood markers */
async function yearOverlay() {
  const y = /^\d{4}$/.test(UI.year) ? +UI.year : null;
  const sats = y ? replays().filter(r => r.kind === "satellite" && replayYear(r) === y) : [];
  const fcs = [];
  for (const r of sats) {
    let best = 0; r.frames.forEach((f, k) => { if (f.km2 > r.frames[best].km2) best = k; });
    const fc = await loadFrame(r, best).catch(() => null);
    if (fc) fcs.push(...fc.features);
  }
  if (UI.screen === "map" && UI.show === "past" && String(y) === UI.year) mapReplay({type: "FeatureCollection", features: fcs}, "satellite");
}

/* ---------- admin: Flood replays ---------- */
function adReplays() {
  const list = data("replays").slice().sort((a, b) => String(b.frames[0]?.t).localeCompare(String(a.frames[0]?.t)));
  const sats = list.filter(r => r.kind === "satellite");
  return `<div class="card"><h2>Flood replays</h2>
    <p class="small muted">Replays let people watch a flood grow and shrink. Model runs come from the modelling tools (one file per city and storm). Satellite maps come from Copernicus EMS, Copernicus GFM or UNOSAT flood outlines, one date at a time.</p>
    <div class="toolbar"><label class="sbtn primary" for="rp-import" style="display:inline-flex;align-items:center">Import a replay file</label><input id="rp-import" type="file" accept="application/json,.json" class="sr"></div>
    ${UI.admin.confirm?.k === "rm-replay" ? confirmBox() : ""}
    <div class="tablewrap"><table><thead><tr><th>Replay</th><th>Kind</th><th>Steps</th><th>From</th><th class="n">Most water (km²)</th><th></th></tr></thead><tbody>
    ${list.map(r => `<tr><td>${esc(r.title)}</td><td>${esc(REPLAY_KINDS[r.kind] || r.kind)}</td><td class="num">${r.frames.length}</td><td class="small">${esc(frameWhen(r, 0))}</td><td class="n">${Math.max(...r.frames.map(f => f.km2))}</td>
      <td style="white-space:nowrap"><button class="sbtn" data-act="replay-open" data-id="${esc(r.id)}">Watch</button>${canDelete("replays") ? ` <button class="sbtn danger" data-act="ad-ask" data-k="rm-replay" data-id="${esc(r.id)}">Delete</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="6">No replays yet.</td></tr>`}
    </tbody></table></div></div>
  <form class="card" id="ro-form" novalidate><h2>Add a satellite flood outline</h2>
    <p class="small muted">GeoJSON in longitude/latitude (EPSG:4326), for one date. Large outlines are simplified automatically. Keep the original product link so people can check it.</p>
    <div class="formgrid">
      <label class="field wide"><span>GeoJSON file</span><input id="ro-file" type="file" accept=".geojson,.json,application/geo+json,application/json"></label>
      <label class="field"><span>Date the satellite saw the water</span><input id="ro-date" type="date"></label>
      <label class="field"><span>Add to</span><select id="ro-target"><option value="">A new satellite replay</option>${sats.map(r => `<option value="${esc(r.id)}">${esc(r.title)}</option>`).join("")}</select></label>
      <label class="field wide"><span>Title (new replays), e.g. “Borno floods after the Alau Dam collapse, September 2024”</span><input id="ro-title" maxlength="120"></label>
      <label class="field"><span>Short name (new replays): lowercase, numbers, dashes</span><input id="ro-id" maxlength="80" placeholder="borno-2024"></label>
      <label class="field"><span>Country</span><select id="ro-c"><option value="GH">Ghana</option><option value="NG">Nigeria</option></select></label>
      <label class="field wide"><span>Regions or states covered (IDs, comma separated)</span><input id="ro-areas" placeholder="NG-BO"></label>
      <label class="field wide"><span>Source, e.g. “Copernicus EMS EMSR753, Sentinel-1”</span><input id="ro-source" maxlength="200"></label>
      <label class="field wide"><span>Link to the original product</span><input id="ro-link" type="url" maxlength="500" placeholder="https://"></label>
    </div>
    <p class="small" id="ro-err" role="alert" style="color:var(--vhigh)"></p>
    <div class="toolbar"><button class="sbtn primary" type="submit">Add outline</button></div></form>`;
}
async function replayImportFile(file) {
  try { const v = await importReplayFile(file); toast(`Imported “${v.meta.title}” with ${v.frames.length} steps.`); render(); }
  catch (e) { toast(e instanceof SyntaxError ? "That isn't an Open Tracker replay file." : errText(e)); }
}
async function replayOutlineSubmit(form) {
  const err = form.querySelector("#ro-err");
  try { await addOutline(form); toast("Outline added."); render(); }
  catch (e) { if (err) err.textContent = errText(e); }
}
