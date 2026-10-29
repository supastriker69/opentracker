/* ===== Flood and heat for every country: the world, a country's projected reach, a town, and the 3D projection ===== */
const RCH = {day: 0, timer: null};   /* the country reach screen: chosen forecast day and its play timer */

/* the line under a screen when live data is missing, depending on where Open Tracker runs */
function liveDataMissing(name) {
  return window.WEBAPP
    ? `Live flood and heat data for ${esc(name)} appears once this site's data feeds have run.`
    : `Live flood and heat data shows here once an administrator imports the latest snapshot from the Open Tracker website (Admin → Live data).`;
}
function loadingCard(what) { return `<div class="card"><p class="muted" role="status">Loading ${esc(what)}…</p></div>`; }
function sourcesNote(doc) {
  const names = (doc?.sources || []).map(id => ({"open-meteo-forecast": "Open-Meteo forecasts", "open-meteo-baselines": "ERA5 past weather (Copernicus)", "open-meteo-rivers": "GloFAS river forecasts (Copernicus)",
    gdacs: "GDACS", cap: "official warnings (CAP)", "satellite-scenes": "Copernicus Sentinel satellites", weatherex: "WeatherEx"}[id])).filter(Boolean);
  return `<p class="small muted">Heat levels and flood signs are Open Tracker estimates from open data, not official warnings. ${names.length ? "Data: " + esc(names.join(", ")) + ". " : ""}${esc(hazardsUpdated(doc))}</p>`;
}

/* ---------- the world ---------- */
function viewWorld() {
  const doc = hazardsDoc("world");
  const rows = doc ? Object.entries(doc.countries).map(([c, v]) => ({c, v})).sort((a, b) => (b.v.heat ?? -1) - (a.v.heat ?? -1) || (b.v.alerts + b.v.disasters) - (a.v.alerts + a.v.disasters)) : [];
  const watch = rows.filter(r => (r.v.heat ?? 0) >= 2 || r.v.alerts || r.v.disasters || r.v.risingRivers);
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Flood and heat around the world</h1>
    <p class="muted">Each country is coloured by the worst heat expected in its towns over the next 3 days. Tap a country to see how far heat and floods could reach there.</p>
    ${doc === undefined ? loadingCard("the world summary") : doc === null ? `<div class="notice info">${ICON.info}<div>${liveDataMissing("every country")}</div></div>` : ""}
    <div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="World map of heat and floods"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button></div>
      <div class="mapattr">Natural Earth · MapLibre</div></div>
    ${heatLegend()}
    <div class="card"><h2>Countries to watch</h2>
      ${watch.length ? `<div class="results">${watch.slice(0, 40).map(r => countryPick(r.c, r.v)).join("")}</div>` : `<p class="muted">${doc ? "No country has a heatwave, a rising river or a flood warning in the data right now." : "Nothing to show yet."}</p>`}
    </div>
    <div class="card"><h2>Any country</h2>${countrySelect("")}</div>
    ${doc ? sourcesNote({sources: [], updated: doc.updated}) : ""}`;
}
function countryPick(c, v) {
  const bits = [v.dangerPlaces ? `${v.dangerPlaces} town${v.dangerPlaces > 1 ? "s" : ""} in dangerous heat` : "", v.floodAlerts ? `${v.floodAlerts} official flood warning${v.floodAlerts > 1 ? "s" : ""}` : "",
    v.disasters ? `${v.disasters} current disaster${v.disasters > 1 ? "s" : ""}` : "", v.risingRivers ? `${v.risingRivers} river${v.risingRivers > 1 ? "s" : ""} rising fast` : ""].filter(Boolean);
  return `<button class="pick" data-act="reach" data-k="${esc(c)}"><span class="grow"><span class="t">${esc(countryName(c))}</span><span class="s">${esc(bits.join(" · ") || "Live data available")}</span></span>${Number.isFinite(v.heat) ? heatChip(v.heat) : ""}</button>`;
}
function countrySelect(selected) {
  const opts = Object.entries(WORLD.countries).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([c, v]) => `<option value="${esc(c)}" ${c === selected ? "selected" : ""}>${esc(v.n)}</option>`).join("");
  return `<label class="field"><span>Choose a country</span><select id="country-pick"><option value="">Choose…</option>${opts}</select></label>`;
}
function heatLegend() {
  return `<div class="legend" aria-label="Heat levels">${HEAT_LEVELS.map(l => `<span><i class="sw heat-sw heat-${l.k}"></i>${esc(l.n)}</span>`).join("")}</div>`;
}
function worldMapView() {
  const doc = hazardsDoc("world");
  const world = {};
  if (doc) for (const [c, v] of Object.entries(doc.countries)) if (Number.isFinite(v.heat)) world[c] = v.heat;
  return {show: "none", world, fit: {ll: [15, 18], z: 1.3}, pitch: 0};
}

/* ---------- a country: how far heat and floods could reach ---------- */
function viewReach(cc) {
  const doc = hazardsDoc(cc), name = countryName(cc);
  const days = doc && doc.heat[0] ? doc.heat[0].days : [];
  const day = Math.min(RCH.day, Math.max(0, days.length - 1));
  const reach = heatReach(doc, day), signs = floodSigns(doc), fl = floodLevel(signs);
  const p = {type: DETAILED.has(cc) ? "country" : "wc", id: cc};
  const dayBtns = days.length ? `<div class="when days" role="group" aria-label="Day">${days.map((d, i) => `<button data-act="reach-day" data-k="${i}" aria-pressed="${i === day}">${esc(dayName(d.date, i))}</button>`).join("")}</div>
      <button class="sbtn" id="reach-play" data-act="reach-play" aria-pressed="${!!RCH.timer}">${RCH.timer ? "❚❚ Pause" : "▶ Play the week"}</button>` : "";
  const towns = doc ? doc.heat.map(h => ({h, d: h.days[day]})).filter(x => x.d).sort((a, b) => b.d.level - a.d.level || b.h.pop - a.h.pop) : [];
  return `
    <button class="back" data-act="back">← Back</button>
    <nav class="crumbs" aria-label="You are here"><button data-act="world">World</button><span aria-hidden="true">›</span><span>${esc(name)}</span></nav>
    <h1>Flood and heat reach: ${esc(name)}</h1>
    ${alertBanners(p)}
    ${doc === undefined ? loadingCard("live data for " + name) : doc === null ? `<div class="notice info">${ICON.info}<div>${liveDataMissing(name)}</div></div>` : ""}
    ${dayBtns}
    <div class="row two">
      <div class="card heat-${reach.worst}" id="say"><h2>Heat ${days[day] ? esc(dayPhrase(days[day].date, day)) : ""}</h2>
        ${doc ? `<p class="big-line">${heatChip(reach.worst)}</p><p>${reach.towns.length ? `Heatwave or worse in <b>${reach.towns.length}</b> town${reach.towns.length > 1 ? "s" : ""} where about <b>${esc(fmtPeople(reach.people))}</b> people live.` : "No town is in a heatwave on this day."}</p>` : `<p class="muted">No data yet.</p>`}</div>
      <div class="card flood-${fl}"><h2>Floods, next days</h2>
        ${doc ? `<p class="big-line">${floodChip(fl)}</p><p>${signs.length ? `${signs.filter(s => s.kind === "official").length} official warning${signs.filter(s => s.kind === "official").length === 1 ? "" : "s"} · ${signs.filter(s => s.kind === "river").length} river${signs.filter(s => s.kind === "river").length === 1 ? "" : "s"} rising · ${signs.filter(s => s.kind === "rain").length} place${signs.filter(s => s.kind === "rain").length === 1 ? "" : "s"} with heavy rain · ${signs.filter(s => s.kind === "disaster").length} current disaster${signs.filter(s => s.kind === "disaster").length === 1 ? "" : "s"}` : "No flood signs in the data."}</p>` : `<p class="muted">No data yet.</p>`}</div>
    </div>
    <div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="Map of heat and flood reach in ${esc(name)}"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button></div>
      <div class="mapattr">Natural Earth · MapLibre</div></div>
    <div class="legend">${HEAT_LEVELS.slice(2).map(l => `<span><i class="sw heat-sw heat-${l.k}"></i>${esc(l.n)} reach</span>`).join("")}<span><i class="sw flood-sw flood-warning"></i>Flood warning reach</span><span><i class="sw flood-sw flood-watch"></i>Flood watch reach</span></div>
    ${signs.length ? `<div class="card"><h2>Where floods could reach</h2><ul class="plain signs">${signs.slice(0, 40).map(s => `<li>${signChip(s.level)} ${esc(s.text)}</li>`).join("")}</ul></div>` : ""}
    ${towns.length ? `<div class="card"><h2>Heat by town ${days[day] ? esc(dayPhrase(days[day].date, day)) : ""}</h2><p class="small muted">Tap a town for its week and the projected flood in 3D.</p>
      <div class="results">${towns.slice(0, 40).map(({h, d}) => `<button class="pick" data-act="open" data-type="wp" data-id="${esc(h.id)}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">High ${esc(fmtTemp(d.tmax))}, feels like ${esc(fmtTemp(d.feels))}</span></span>${heatChip(d.level)}</button>`).join("")}</div></div>` : ""}
    ${DETAILED.has(cc) ? `<button class="btn" data-act="open" data-type="country" data-id="${cc}">Recorded flood areas in ${esc(name)}</button>` : ""}
    <div class="card"><h2>Find a town in ${esc(name)}</h2><div class="results">${(WIX.byCountry.get(cc) || []).slice(0, 12).map(w => `<button class="pick" data-act="open" data-type="wp" data-id="${esc(w.id)}"><span class="grow"><span class="t">${esc(w.n)}</span><span class="s">${esc(w.a1)}</span></span><span aria-hidden="true">→</span></button>`).join("") || `<p class="muted">Search for your town on the home screen.</p>`}</div></div>
    ${emergencyHtml(cc)}
    ${alertMeHtml(p)}
    ${doc ? sourcesNote(doc) : ""}`;
}
const fmtTemp = v => (Number.isFinite(v) ? `${Math.round(v)} °C` : "—");
function reachMapView(cc) {
  const doc = hazardsDoc(cc), c = worldCountry(cc);
  const day = RCH.day;
  const heatTowns = doc ? doc.heat.filter(h => h.days[day]).map(h => ({id: h.id, ll: h.ll, level: h.days[day].level, pop: h.pop})) : [];
  return {show: "none", heatTowns, floodSigns: floodSigns(doc), fit: c ? {bounds: [[c.b[0], c.b[1]], [c.b[2], c.b[3]]], ll: c.ll, z: 5, maxZoom: 7} : {ll: [0, 15], z: 1.6}};
}
function reachToggle() {
  if (RCH.timer) { reachStop(); render(); return; }
  RCH.timer = setInterval(() => { if (UI.screen !== "reach" && !(UI.screen === "answer" && UI.place?.type === "wc")) { reachStop(); return; } RCH.day = (RCH.day + 1) % 7; render(); }, 1600);
  render();
}
function reachStop() { clearInterval(RCH.timer); RCH.timer = null; }

/* ---------- heat and flood cards for one spot (towns, and Ghana's and Nigeria's flood areas) ---------- */
function heatCardHtml(ll, cc) {
  const doc = hazardsDoc(cc);
  if (doc === undefined) return loadingCard("the heat forecast");
  const near = heatNear(doc, ll);
  if (!near) return `<div class="card"><h2>Heat this week</h2><p class="muted">${doc ? "No heat forecast for a town within 75 km yet." : liveDataMissing(countryName(cc))}</p></div>`;
  const h = near.h, today = h.days[0], lv = today.level;
  const open = UI.open.heat;
  return `
    <div class="riskcard heat-card heat-${lv}"><div><div class="big">${esc(HEAT_LEVELS[lv].word)}</div>
      <div class="sub">Today${near.d > 3 ? ` in ${esc(h.n)}` : ""}: high ${esc(fmtTemp(today.tmax))}, feels like ${esc(fmtTemp(today.feels))}${Number.isFinite(today.wetBulb) ? `, wet-bulb ${esc(fmtTemp(today.wetBulb))}` : ""}.</div></div></div>
    <div class="card"><h2>Heat this week${near.d > 3 ? ` near ${esc(h.n)}` : ""}</h2>
      <div class="week" role="list">${h.days.map((d, i) => `<div class="day heat-${d.level}" role="listitem"><b>${esc(dayName(d.date, i))}</b><span>${esc(HEAT_LEVELS[d.level].n)}</span><span class="num">${esc(fmtTemp(d.tmax))}</span><span class="small">feels ${esc(fmtTemp(d.feels))}</span></div>`).join("")}</div>
      ${today.why?.length ? `<p class="small">Why: ${esc(today.why.join("; "))}.</p>` : ""}
      <p class="small muted">${h.local ? `Judged against ${esc(h.n)}'s own usual heat from past weather, and against limits for the human body.` : `Still learning ${esc(h.n)}'s usual heat; for now judged against limits for the human body only.`}</p>
      <button class="sbtn" data-act="toggle" data-k="heat" aria-expanded="${!!open}">What should I do in the heat?</button>
      ${open ? `<ul class="steps">${HEAT_ADVICE[Math.max(1, lv)].map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
    </div>`;
}
function floodCardHtml(ll, cc, withProject) {
  const doc = hazardsDoc(cc);
  if (doc === undefined) return "";
  const signs = floodSigns(doc, ll, 60), lv = floodLevel(signs), near = heatNear(doc, ll, 40);
  return `<div class="card flood-${lv}"><h2>Flood signs near here</h2>
    <p>${floodChip(lv)}${near ? ` <span class="small">Rain in the next 3 days: <b>${Math.round(rain3(near.h))} mm</b>${near.d > 3 ? ` near ${esc(near.h.n)}` : ""}</span>` : ""}</p>
    ${signs.length ? `<ul class="plain signs">${signs.slice(0, 8).map(s => `<li>${signChip(s.level)} ${esc(s.text)}${s.alert?.instruction ? `<br><span class="small">${esc(s.alert.instruction)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="small muted">${doc ? "No official flood warning, rising river or heavy rain in the data within 60 km." : liveDataMissing(countryName(cc))}</p>`}
    ${withProject ? `<button class="btn primary" data-act="project">${ICON.info}See where a flood would reach here, in 3D</button>` : ""}
  </div>`;
}

/* ---------- a town anywhere ---------- */
function viewWorldPlace(p) {
  const w = worldPlace(p.id);
  if (!w) { UI.place = null; return viewWhere(); }
  const crumbs = crumbsFor(p);
  const hot = DETAILED.has(w.c) ? IX.hot.filter(h => km(h.ll, w.ll) < 15).slice(0, 6) : [];
  return `
    <button class="back" data-act="back">← Back</button>
    <nav class="crumbs" aria-label="You are here">${crumbs.map((x, i) => i < crumbs.length - 1 ? `<button data-act="open" data-type="${x.p.type}" data-id="${esc(x.p.id ?? "")}">${esc(x.n)}</button><span aria-hidden="true">›</span>` : `<span>${esc(x.n)}</span>`).join("")}</nav>
    <h1>${esc(w.n)}</h1>
    <p class="muted">${esc([w.a1, countryName(w.c)].filter(Boolean).join(", "))}${w.pop ? ` · about ${esc(fmtPeople(w.pop))} people` : ""}</p>
    ${alertBanners(p)}
    ${heatCardHtml(w.ll, w.c)}
    ${floodCardHtml(w.ll, w.c, true)}
    ${hot.length ? `<div class="card"><h2>Recorded flood areas nearby</h2><div class="results">${hot.map(h => `<button class="pick" data-act="open" data-type="hotspot" data-id="${h.id}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">${esc(placeName({type: "area", id: h.r}))}</span></span>${chip(riskOf(h).level)}</button>`).join("")}</div></div>` : ""}
    ${replaysCard(p)}
    ${alertMeHtml(p)}
    <button class="btn" data-act="reach" data-k="${esc(w.c)}">Flood and heat reach across ${esc(countryName(w.c))}</button>
    ${emergencyHtml(w.c)}
    ${contributeCta(p)}
    ${hazardsDoc(w.c) ? sourcesNote(hazardsDoc(w.c)) : ""}`;
}

/* ---------- the projected flood in 3D ---------- */
function viewProject() {
  const p = UI.place, t = projectionTarget(p);
  if (!t) return `<button class="back" data-act="back">← Back</button><h1>Projected flood</h1><p>Choose a town or a flood area first.</p>`;
  if (PROJ.key && PROJ.key !== t.key) projReset();
  const doc = hazardsDoc(t.c) || null;
  const scs = projectionScenarios(t, doc);
  if (!scs.some(s => s.id === PROJ.sc)) PROJ.sc = scs[0].id;
  const avail = projectionAvailable(), res = PROJ.status === "done" ? PROJ.result : null;
  const busy = PROJ.status === "loading" || PROJ.status === "running";
  const models = replaysFor(p).filter(r => r.kind === "model");
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Projected flood: ${esc(t.n)}</h1>
    <p class="muted">Where water would reach, how deep it would get and how much water there would be, on the real ground around ${esc(t.n)}.</p>
    ${avail ? `
    <div class="card"><h2>Choose what happens</h2>
      <div class="choices" role="radiogroup" aria-label="Storm">${scs.map(s => `<button class="choice" role="radio" data-act="proj-sc" data-k="${s.id}" aria-checked="${PROJ.sc === s.id}"><b>${esc(s.n)}</b><span class="small">${esc(s.desc)}</span></button>`).join("")}</div>
      <div class="when" role="group" aria-label="Area">${Object.entries(PROJ_AREAS).map(([k, a]) => `<button data-act="proj-area" data-k="${k}" aria-pressed="${PROJ.area === k}">${esc(a.n)}</button>`).join("")}</div>
      <button class="btn primary" data-act="proj-run" ${busy ? "disabled" : ""}>${busy ? "Working…" : res ? "Run again" : "Show the projected flood"}</button>
      ${busy ? `<div class="progress" role="progressbar" aria-label="Projection progress"><div id="proj-bar" style="width:${Math.round(PROJ.progress * 100)}%"></div></div><p class="small muted" role="status">${PROJ.status === "loading" ? "Fetching the ground heights…" : "Working out where the water goes, hour by hour…"}</p>` : ""}
      ${PROJ.status === "error" ? `<div class="notice alert" role="alert">${ICON.warn}<div>${esc(PROJ.error)}</div></div>` : ""}
    </div>` : `<div class="notice info">${ICON.info}<div><b>The 3D projection runs on the Open Tracker website.</b> It needs the street map and ground heights, which this page cannot load. Projections saved there and imported here appear below.</div></div>`}
    <div class="mapbox tall" id="mapbox"><div id="map" role="region" aria-label="3D map of the projected flood around ${esc(t.n)}"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button></div>
      <div class="mapattr">${avail ? "© OpenStreetMap contributors · OpenFreeMap · AWS Terrain Tiles · MapLibre" : "Natural Earth · MapLibre"}</div></div>
    ${res ? projectionResultHtml(res) : ""}
    ${models.length ? `<div class="card"><h2>Saved flood projections and models here</h2><div class="results">${models.slice(0, 6).map(replayPick).join("")}</div></div>` : ""}`;
}
function projectionResultHtml(res) {
  const pk = res.frames[res.peakAt], here = res.hereIdx >= 0 ? res.peak.depth[res.hereIdx] : 0, hereHour = res.hereIdx >= 0 ? res.peak.hour[res.hereIdx] : 0;
  const b = res.balance, n = res.frames.length;
  return `
    <div class="riskcard flood-proj lv-${here >= 1.2 ? "vhigh" : here >= 0.3 ? "high" : here >= FLOODSIM.WET ? "med" : "low"}" id="say"><div>
      <div class="big">${here >= FLOODSIM.WET ? `Water ${esc(depthWords(here))}` : "Stays dry"}</div>
      <div class="sub">At ${esc(res.here.n)}${here >= FLOODSIM.WET ? `: up to ${here.toFixed(2)} m deep, highest at hour ${hereHour}` : ` in this projection (${esc(res.sc.n.toLowerCase())})`}.</div></div></div>
    <div class="stats">
      <div><span class="small">Area under water at the peak</span><b class="num">${fmtArea(pk.km2)}</b></div>
      <div><span class="small">Water on the ground at the peak</span><b class="num">${esc(fmtVolume(pk.volume))}</b><span class="small">about ${pools(pk.volume).toLocaleString("en-GB")} Olympic pools</span></div>
      <div><span class="small">Deepest water</span><b class="num">${pk.maxDepth.toFixed(1)} m</b></div>
      <div><span class="small">Peak</span><b class="num">hour ${res.peakAt}</b></div>
    </div>
    <p class="small" id="proj-buildings">${buildingsText(res)}</p>
    <div class="card player">
      <div class="player-row">
        <button class="btn primary inline" id="proj-play" data-act="proj-play" aria-pressed="${!!PROJ.timer}">${PROJ.timer ? "❚❚ Pause" : "▶ Play"}</button>
        <input id="proj-slider" type="range" min="0" max="${n - 1}" value="${PROJ.hour}" aria-label="Hour">
      </div>
      <p class="player-now" id="proj-now" aria-live="polite">${projHourText(res, PROJ.hour)}</p>
      <div class="legend">${FLOODSIM.CLASSES.map(c => `<span><i class="sw w${c.k}"></i>${esc(c.n)}</span>`).join("")}</div>
    </div>
    <div class="card"><h2>Where the water went</h2>
      <ul class="plain small"><li>Rain that ran off the ground: <b>${esc(fmtVolume(b.rain))}</b>${b.river > 0 ? `; water from the rising river: <b>${esc(fmtVolume(b.river))}</b>` : ""}${b.sea < 0 ? `; water pushed in by the sea: <b>${esc(fmtVolume(-b.sea))}</b>` : ""}.</li>
        <li>Flowed out of the area${b.sea > 0 ? " or into the sea" : ""}: <b>${esc(fmtVolume(b.edge + Math.max(0, b.sea)))}</b>. Still standing at hour ${n - 1}: <b>${esc(fmtVolume(b.stored))}</b>.</li></ul>
      <div class="toolbar"><button class="sbtn" data-act="proj-export">Save as a replay file</button></div>
    </div>
    <details class="card"><summary><b>How this projection was made</b></summary>
      <ul class="plain">${projectionAssumptions(res).map(a => `<li class="small">${esc(a)}</li>`).join("")}</ul>
      <p class="small muted">A projection shows what this storm would do on today's ground. Follow official warnings: they know the drains, dams and defences.</p></details>`;
}
function projectMapView() {
  const t = projectionTarget(UI.place);
  const avail = projectionAvailable();
  return {show: "none", streets: avail, terrain: avail, three: true, pitch: 60,
    sel: t ? {ll: t.ll, n: t.n} : null, fit: t ? {ll: t.ll, z: avail ? 13.6 : 11} : {ll: [0, 15], z: 1.6}};
}

/* ---------- live cards on Ghana's and Nigeria's detailed pages ---------- */
function liveCardsFor(p) {
  const c = placeCountry(p);
  if (!c) return "";
  if (p.type === "country") return `<button class="btn" data-act="reach" data-k="${c}">Flood and heat reach across ${esc(countryName(c))}</button>`;
  const ll = placeCenter(p).ll;
  return heatCardHtml(ll, c) + floodCardHtml(ll, c, p.type === "hotspot");
}
