/* ===== Simple mode: three filters, plain words ===== */
/* ---------- Simple mode screens ---------- */
function viewWhere() {
  const c = UI.pickCountry;
  let body = "";
  if (!c) {
    body = `
      <div class="search">
        <label for="q">Type your town, area, region, state, river or country</label>
        <input id="q" type="search" autocomplete="off" placeholder="For example: Kaneshie, Lekki, Mumbai, Houston" value="${esc(UI.q)}" aria-describedby="qhelp">
        <span id="qhelp" class="small muted">Choose from the list that appears.</span>
        <div class="results" id="results" aria-live="polite">${resultsHtml()}</div>
      </div>
      <button class="btn primary outlook-btn" data-act="world">${ICON.info}Flood and heat around the world</button>
      <button class="btn outlook-btn" data-act="outlook">${ICON.info}See the ${outlookSettings().year} rainy season outlook (Ghana and Nigeria)</button>
      <button class="btn outlook-btn" data-act="replays">${ICON.info}Watch floods over time</button>
      <h2>Or choose a country</h2>
      <div class="countries">
        <button class="btn" data-act="country" data-id="GH">Ghana</button>
        <button class="btn" data-act="country" data-id="NG">Nigeria</button>
      </div>
      ${countrySelect("")}`;
  } else {
    const cc = FT.countries[c];
    const areas = FT.areas.filter(a => a.c === c).map(a => {
      const hs = IX.hot.filter(h => h.r === a.id);
      const lv = hs.length ? maxLevel(hs.map(h => riskOf(h, simpleCtx("3d")))) : "none";
      return {a, hs, lv};
    }).sort((x, y) => (LVL_RANK[y.lv] ?? -1) - (LVL_RANK[x.lv] ?? -1) || y.hs.length - x.hs.length || x.a.n.localeCompare(y.a.n));
    body = `
      <button class="back" data-act="back-country">← Back</button>
      <h2>Choose a ${cc.unit} in ${esc(cc.n)}</h2>
      <p class="muted">Sorted by flood risk for the next 3 days. The number shows known flood areas.</p>
      <button class="btn primary" data-act="open" data-type="country" data-id="${c}">See all of ${esc(cc.n)}</button>
      <div class="list">${areas.map(({a, hs, lv}) => `
        <button class="pick" data-act="open" data-type="area" data-id="${a.id}">
          <span class="grow"><span class="t">${esc(a.n)}</span><span class="s">${hs.length ? hs.length + " known flood area" + (hs.length > 1 ? "s" : "") : "No areas recorded yet"}</span></span>
          ${hs.length ? chip(lv) : ""}
        </button>`).join("")}</div>`;
  }
  return `
    <h1>Is my area at risk of flooding or dangerous heat?</h1>
    ${body}
    ${c ? "" : contributeCta(null)}`;
}
function resultsHtml() {
  if (norm(UI.q).length < 2) return "";
  const r = search(UI.q);
  if (!r.length) return `<p class="muted">No match for “${esc(UI.q)}”. Check the spelling, or choose a country below.</p>`;
  return r.map(x => `<button class="pick" data-act="open" data-type="${x.p.type}" data-id="${x.p.id ?? ""}" data-idx="${x.p.idx ?? ""}"><span class="grow"><span class="t">${esc(x.t)}</span><span class="s">${esc(x.s)}</span></span><span aria-hidden="true">→</span></button>`).join("");
}

const ADVICE = {
  low: ["Keep the drains and gutters near your home clear of rubbish.", "Save the emergency number below in your phone.", "Check Open Tracker again when heavy rain is forecast."],
  med: ["Move documents, phones and valuables off the floor.", "Clear drains and gutters around your home.", "Plan where you would go if water rises, and how you would get there.", "Do not park in low spots or beside drains."],
  high: ["Pack a small bag: documents, medicine, phone charger, drinking water.", "Never walk or drive through moving water. Even knee-deep water can sweep people and cars away.", "If water enters your home, switch off electricity at the main switch.", "Do not shelter at fuel stations.", "Follow instructions from NADMO, NEMA or your state emergency agency."],
  vhigh: ["If water is rising, move to higher ground or a safe place now.", "Take children, older people and anyone who needs help with you.", "Never walk or drive through moving water.", "Switch off electricity at the main switch before you leave.", "If you are trapped, go to the highest point and call the emergency number below."]
};

function viewAnswer() {
  const p = UI.place;
  if (!p) { UI.screen = "where"; return viewWhere(); }
  if (p.type === "wc") return viewReach(p.id);         /* any country: its flood and heat reach */
  if (p.type === "wp") return viewWorldPlace(p);       /* any town: heat, flood signs, 3D projection */
  const hs = placeHot(p);
  const ctx = simpleCtx();
  const isOne = p.type === "hotspot";
  const c = placeCountry(p);
  const whenBtns = `<div class="when" role="group" aria-label="When">${HORIZONS.map(h => `<button data-act="when" data-k="${h.k}" aria-pressed="${UI.when === h.k}">${h.n}</button>`).join("")}</div>`;
  const crumbs = crumbsFor(p);
  let main = "";
  const evs = eventsFor(p);
  if (UI.when === "past") {
    main = `
      <div class="card">
        <h2>${evs.length ? `${evs.length} flood${evs.length > 1 ? "s" : ""} recorded here` : "No floods recorded here yet"}</h2>
        ${evs.length ? "" : `<p>We have no published reports of floods ${isOne ? "in this area" : "here"} yet. That does not mean it never floods.</p>`}
        ${evList(evs, 50)}
      </div>`;
  } else if (!hs.length) {
    main = `
      <div class="riskcard lv-none">${icon("none", 56)}<div><div class="big">Not enough data yet</div><div class="sub">We have no recorded flood areas here yet. Low land near rivers, lagoons and big drains can still flood in heavy rain.</div></div></div>`;
  } else if (isOne) {
    const h = hs[0], r = riskOf(h, ctx);
    const L = LEVELS.find(l => l.k === r.level);
    main = `
      <div class="riskcard lv-${r.level}" id="say">${icon(r.level, 56)}<div><div class="big">${L.word}</div><div class="sub">of flooding ${UI.when === "today" ? "today" : UI.when === "3d" ? "in the next 3 days" : UI.when === "year" ? `in the ${outlookSettings().year} rainy season (about ${Math.round(r.P * 100)}% chance)` : "in the next 3 months"}.</div></div></div>
      <div class="card">
        <h3>Why?</h3>
        <ul class="plain why">${r.causes.map(x => `<li>${esc(x.t)}</li>`).join("")}${r.outlook ? `<li>${esc(reachText(r))}</li><li>${esc("Months to watch: " + monthRange(r.months) + ".")}</li>` : ""}${h.why ? `<li>${esc(h.why)}</li>` : ""}</ul>
      </div>
      ${actionsHtml(r.level, p)}`;
  } else {
    const rs = hs.map(h => ({h, r: riskOf(h, ctx)})).sort((a, b) => b.r.score - a.r.score);
    const lv = maxLevel(rs.map(x => x.r));
    const counts = LEVELS.map(l => [l, rs.filter(x => x.r.level === l.k).length]).filter(x => x[1]);
    main = `
      <div class="riskcard lv-${lv}" id="say">${icon(lv, 56)}<div><div class="big">Highest: ${LEVELS.find(l => l.k === lv).word}</div><div class="sub">${counts.map(([l, n]) => `${n} ${l.n.toLowerCase()}`).join(" · ")} — across ${rs.length} known flood area${rs.length > 1 ? "s" : ""}, ${UI.when === "today" ? "today" : UI.when === "3d" ? "next 3 days" : "next 3 months"}.</div></div></div>
      <div class="card">
        <h2>Areas to watch</h2>
        <p class="small muted">Tap an area to see why and what to do.</p>
        <div class="results">${rs.slice(0, 40).map(({h, r}) => `<button class="pick" data-act="open" data-type="hotspot" data-id="${h.id}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">${esc(placeName({type: "area", id: h.r}))}</span></span>${chip(r.level)}</button>`).join("")}</div>
      </div>
      ${actionsHtml(lv, p)}`;
  }
  return `
    <button class="back" data-act="back">← Back</button>
    <nav class="crumbs" aria-label="You are here">${crumbs.map((x, i) => i < crumbs.length - 1 ? `<button data-act="open" data-type="${x.p.type}" data-id="${x.p.id ?? ""}" data-idx="${x.p.idx ?? ""}">${esc(x.n)}</button><span aria-hidden="true">›</span>` : `<span>${esc(x.n)}</span>`).join("")}</nav>
    <h1>${esc(placeName(p))}</h1>
    ${alertBanners(p)}
    ${whenBtns}
    ${main}
    ${UI.when !== "past" ? liveCardsFor(p) : ""}
    ${alertMeHtml(p)}
    ${UI.when !== "past" && evs.length ? `<div class="card"><h2>Past floods here</h2>${evList(evs, 4)}${evs.length > 4 ? `<button class="sbtn" data-act="when" data-k="past">See all ${evs.length}</button>` : ""}</div>` : ""}
    ${nearReadings(p)}
    ${replaysCard(p)}
    <button class="btn" data-act="to-map">See it on the map</button>
    ${emergencyHtml(c)}
    ${contributeCta(p)}
    ${UI.when !== "past" ? dataNote() : ""}`;
}
function replaysCard(p) {
  const list = replaysFor(p);
  return list.length ? `<div class="card"><h2>Watch floods here over time</h2><div class="results">${list.slice(0, 6).map(replayPick).join("")}</div></div>` : "";
}
function nearReadings(p) {
  const c = placeCenter(p).ll;
  const list = officialReadings().filter(r => r.ll && km(c, r.ll) < 40).slice(0, 5);
  return list.length ? `<div class="card"><h2>Latest official readings nearby</h2>${readingsHtml(list)}</div>` : "";
}
function evList(evs, n) {
  return `<div class="plain" style="display:flex;flex-direction:column;gap:10px">${evs.slice(0, n).map(e => `
    <div class="event"><span class="y">${esc(evDate(e))}</span><span><b>${esc(e.t)}</b></span><span class="small">${esc(e.impact)}</span>${safeUrl(e.src) ? `<a class="small" href="${esc(safeUrl(e.src))}" target="_blank" rel="noopener">Source: ${esc(srcHost(e.src))}</a>` : ""}</div>`).join("")}</div>`;
}
function actionsHtml(lv, p) {
  const open = UI.open;
  const center = placeCenter(p);
  const c = placeCountry(p);
  const near = data("safe").filter(s => !c || s.c === c).map(s => ({s, d: km(center.ll, s.ll)})).filter(x => x.d < 40).sort((a, b) => a.d - b.d).slice(0, 3);
  return `
    <div class="row">
      <button class="btn primary" data-act="toggle" data-k="todo" aria-expanded="${!!open.todo}">What should I do?</button>
      <button class="btn" data-act="toggle" data-k="safe" aria-expanded="${!!open.safe}">Nearest safe place</button>
    </div>
    ${open.todo ? `<div class="card lv-${lv}"><h2>What to do now</h2><ul class="steps">${ADVICE[lv].map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>` : ""}
    ${open.safe ? `<div class="card"><h2>Nearest safe places</h2>${near.length ? `<ul class="plain">${near.map(x => `<li><b>${esc(x.s.n)}</b><br><span class="small muted">About ${x.d < 1 ? "under 1" : Math.round(x.d)} km away · named by ${esc(x.s.src)}</span></li>`).join("")}</ul><p class="small muted">Check with NADMO that a safe place is open before you go.</p>` : `<p>No safe places are listed for this area yet. Call the emergency number below and ask where to go.</p>`}<button class="sbtn" data-act="map-safe">Show safe places on the map</button></div>` : ""}`;
}
function emergencyHtml(c) {
  const list = c ? emergencyNumbers(c) : data("contacts");
  if (!list.length) return "";
  return `<div class="card"><h2>Emergency numbers</h2>${list.map(x => `<div class="phone"><span>${esc(x.n)}:</span><span class="n">${esc(x.num)}</span><button class="sbtn" data-act="copy" data-v="${esc(x.num)}">Copy</button></div>`).join("")}<p class="small muted">Call from your phone. Open Tracker cannot place calls.${c && !DETAILED.has(c) ? " Numbers from Google's public phone-number data; check them locally." : ""}</p></div>`;
}

function viewMap() {
  const p = UI.place;
  const showSel = `<select id="show" aria-label="Show">${SHOWS.map(s => `<option value="${s.k}" ${UI.show === s.k ? "selected" : ""}>${s.n}</option>`).join("")}</select>`;
  const whenSel = `<select id="when" aria-label="When">${HORIZONS.filter(h => h.k !== "past").map(h => `<option value="${h.k}" ${UI.when === h.k ? "selected" : ""}>${h.n}</option>`).join("")}</select>`;
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Map</h1>
    <div class="pills">
      <label class="pill"><span>Where</span><button data-act="change-where">${esc(p ? placeName(p) : "Ghana and Nigeria")} ▾</button></label>
      <label class="pill"><span>When</span>${UI.show === "past" ? `<button disabled>Past years</button>` : whenSel}</label>
      <label class="pill"><span>Show</span>${showSel}</label>
    </div>
    ${UI.show === "past" ? yearSliderHtml() : ""}
    <div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="Flood map"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button><button class="wide" data-act="three" aria-pressed="${UI.three}">${UI.three ? "Flat map" : "See in 3D"}</button></div>
      <div class="mapattr">Map data: Natural Earth · MapLibre</div>
    </div>
    ${legendHtml()}
    <div class="card"><h2>${esc(mapListTitle())}</h2><div class="results">${mapListHtml()}</div></div>
    ${dataNote()}`;
}
function yearMatch(e, y) {
  if (y === "all") return true;
  if (y === "unknown") return !e.year;
  if (y === "older") return e.year && e.year < 2022;
  return String(e.year) === y;
}
function legendHtml() {
  if (UI.show === "risk") return `<div class="legend" aria-label="Legend">${LEVELS.map(l => `<span class="lv-${l.k}">${icon(l.k, 20)}${l.n}</span>`).join("")}</div>`;
  if (UI.show === "safe") return `<div class="legend"><span><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="var(--low)"/><path d="M12 6v12M6 12h12" stroke="#fff" stroke-width="3"/></svg>Safe place named by NADMO or AMA</span></div>`;
  if (UI.show === "roads") return `<div class="legend"><span><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--vhigh)"/><rect x="5.5" y="10" width="13" height="4" fill="#fff"/></svg>Road reported impassable in past floods</span></div>`;
  return `<div class="legend"><span><svg width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="var(--accent)"/></svg>Area flooded in the chosen year (darker = more recent)</span></div>`;
}
function mapListTitle() {
  return {risk: "Areas on the map", safe: "Safe places", past: "Floods in the chosen years", roads: "Roads to avoid in heavy rain"}[UI.show];
}
function inPlace(ll) {
  const p = UI.place;
  if (!p) return true;
  const hs = placeHot(p);
  if (p.type === "country") return true;
  if (!hs.length) return false;
  return hs.some(h => km(h.ll, ll) < (p.type === "hotspot" ? 15 : 60));
}
function mapListHtml() {
  const p = UI.place, c = p ? placeCountry(p) : null;
  if (UI.show === "risk") {
    const hs = p ? placeHot(p) : IX.hot;
    const rs = hs.map(h => ({h, r: riskOf(h)})).sort((a, b) => b.r.score - a.r.score);
    return rs.slice(0, 30).map(({h, r}) => `<button class="pick" data-act="open" data-type="hotspot" data-id="${h.id}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">${esc(placeName({type: "area", id: h.r}))}</span></span>${chip(r.level)}</button>`).join("") || `<p class="muted">No known flood areas here yet.</p>`;
  }
  if (UI.show === "safe") {
    const l = data("safe").filter(s => (!c || s.c === c) && inPlace(s.ll));
    return l.length ? l.map(s => `<div class="pick" role="listitem"><span class="grow"><span class="t">${esc(s.n)}</span><span class="s">Named by ${esc(s.src)}</span></span></div>`).join("") : `<p class="muted">No safe places are listed here yet. Call the emergency number and ask where to go.</p>`;
  }
  if (UI.show === "roads") {
    const l = data("roads").filter(s => (!c || s.c === c) && inPlace(s.ll));
    return l.length ? l.map(s => `<div class="pick"><span class="grow"><span class="t">${esc(s.n)}</span></span></div>`).join("") : `<p class="muted">No roads reported here yet.</p>`;
  }
  const evs = (p ? eventsFor(p) : data("events").concat(data("regionEvents"))).filter(e => yearMatch(e, UI.year));
  return evs.length ? evList(evs.sort((a, b) => (b.year || 0) - (a.year || 0)), 60) : `<p class="muted">No floods recorded for this choice.</p>`;
}

/* ---------- data status (public) ---------- */
function feedRow(name, what, status, last) {
  const cls = status === "on" ? "on" : status === "manual" ? "manual" : "off";
  const txt = status === "on" ? "Connected" : status === "manual" ? "Entered by staff" : "Not connected yet";
  return `<div class="feed"><div><b>${esc(name)}</b><br><span class="muted">${esc(what)}</span>${last ? `<br><span class="small muted">Last update ${esc(fmtDate(last))}</span>` : ""}</div><span class="status ${cls}">${txt}</span></div>`;
}
function readingsHtml(list) {
  return `<ul class="plain">${list.map(r => `<li><b>${esc(r.station)}</b>: <span class="num">${esc(r.value)}</span> ${esc((READING_KINDS.find(k => k[0] === r.kind) || [0, ""])[1])}<br><span class="small muted">${esc(r.agency.n)} · ${esc(fmtDate(r.at))}</span></li>`).join("")}</ul>`;
}
function viewStatus() {
  const pm = publisherMap();
  const live = new Set(Object.values(pm).map(a => a.id));
  const lastBy = {};
  Object.entries(AG.posts).forEach(([uid, l]) => { const a = pm[uid]; if (a && l[0] && (!lastBy[a.id] || l[0].at > lastBy[a.id])) lastBy[a.id] = l[0].at; });
  const fc = Object.keys(settings().climate).filter(z => rainScenarioFor(z));
  const rd = officialReadings().slice(0, 12);
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Where Open Tracker's information comes from</h1>
    <div class="card"><h2>Official agencies</h2>
      <p>When an agency is connected, its warnings, forecasts and readings appear on Open Tracker within seconds, with its name beside them.</p>
      ${agencies().filter(a => a.status !== "suspended").map(a => feedRow(a.n, a.supplies || "", live.has(a.id) ? "on" : "off", lastBy[a.id])).join("")}
    </div>
    ${window.WEBAPP ? window.WEBAPP.statusHtml() : ""}
    <div class="card"><h2>Other data feeds</h2>
      ${data("feeds").map(f => feedRow(f.n, f.what + (f.note ? " · " + f.note : ""), f.status, f.last)).join("")}
    </div>
    ${rd.length ? `<div class="card"><h2>Latest official readings</h2>${readingsHtml(rd)}</div>` : ""}
    <div class="card"><h2>What the risk levels use today</h2>
      <ul class="steps">
        <li>${fc.length ? `Official rain forecasts for ${fc.map(z => settings().climate[z].n).join(", ")}; typical rain for ${MONTHS[NOW.getMonth()]} elsewhere.` : `Typical rain for ${MONTHS[NOW.getMonth()]} in each area.`}</li>
        <li>Official dam status where an agency or editor has set it; otherwise the usual pattern of releases for this time of year.</li>
        <li>${data("events").length} past floods from news and agency reports, each with its source.</li>
        <li>How many people live in each area and how easily they are hurt by floods.</li>
      </ul>
      <p class="small muted">Locations are approximate centres of the areas named in reports. Open Tracker is an open-source project and does not replace official warnings.</p>
    </div>
    <div class="card"><h2>Map and data credits</h2><p class="small">Boundaries, rivers and lakes: Natural Earth (public domain). Map engine: MapLibre (BSD). Flood reports: NADMO, NEMA, LASEMA, NIHSA, Ghana News Agency, Citi Newsroom, MyJoyOnline, Graphic, TheCable, AP and others, linked beside each flood.</p></div>
    <div class="card"><h2>Privacy</h2><p class="small">Open Tracker counts visits, pages and searches to see what people need. It stores no names, asks for no location, and counts nothing on devices set to “Do Not Track”.</p></div>`;
}
