/* ===== Expert mode: full filters, 3D map, ranked table, model inputs ===== */
function exCtx() {
  const e = UI.ex;
  return {month: +e.month, horizon: e.horizon, rain: e.rain === "mm" ? "mm" : "auto", mm: +e.mm, tide: e.tide, dams: e.dams};
}
function exHot() {
  const e = UI.ex;
  const ctx = exCtx();
  return IX.hot.filter(h => (e.country === "ALL" || h.c === e.country) && (!e.area || h.r === e.area) && (h.d || []).some(d =>
      (d === "rain" && e.types.rain) || (d === "river" && e.types.river) || (d === "coast" && e.types.coast) || (IX.damById[d] && e.types.dam)))
    .map(h => ({h, r: computeRisk(h, ctx)}))
    .filter(x => LVL_RANK[x.r.level] >= LVL_RANK[e.minLevel])
    .sort((a, b) => b.r.score - a.r.score);
}
function pct(x) { return Math.round(x * 100) + "%"; }

function viewExpert() {
  const e = UI.ex, st = settings();
  const rows = exHot();
  const areas = FT.areas.filter(a => e.country === "ALL" || a.c === e.country);
  const dams = data("dams");
  const sel = (id, label, opts, val) => `<label class="field"><span>${label}</span><select id="${id}" data-ex="${id}">${opts.map(([v, n]) => `<option value="${esc(v)}" ${String(val) === String(v) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
  const counts = LEVELS.map(l => [l, rows.filter(x => x.r.level === l.k).length]);
  return `
  <div class="split">
    <aside class="panel card" aria-label="Expert filters">
      <h2>Filters and inputs</h2>
      <p class="small muted">Changes here only affect your own view. The public sees the official settings set by an editor.</p>
      ${sel("country", "Country", [["ALL", "Ghana and Nigeria"], ["GH", "Ghana"], ["NG", "Nigeria"]], e.country)}
      ${sel("area", "Region or state", [["", "All"], ...areas.map(a => [a.id, `${a.n} (${a.c === "GH" ? "region" : "state"})`])], e.area)}
      ${sel("horizon", "Forecast horizon", [["today", "Today"], ["3d", "Next 3 days"], ["season", "Next 3 months"], ["year", "Next rainy season (" + outlookSettings().year + ")"]], e.horizon)}
      ${sel("month", "Month (to test other seasons)", MONTHS.map((m, i) => [i, m + (i === NOW.getMonth() ? " (this month)" : "")]), e.month)}
      ${sel("rain", "Rain input", [["auto", "Typical weather, or official forecast if entered"], ["mm", "Set a rain amount"]], e.rain)}
      ${e.rain === "mm" ? `<label class="field"><span>Rain over 3 days: <b class="num">${e.mm} mm</b> (29 June 2026 in Accra was about 140 mm in one storm)</span><input type="range" id="mm" data-ex="mm" min="0" max="300" step="5" value="${e.mm}"></label>` : ""}
      ${sel("tide", "Tide at lagoon mouths", [["normal", "Normal"], ["spring", "Very high (spring tide)"]], e.tide)}
      <fieldset class="field" style="border:0;padding:0;margin:0"><span>Dam status (scenario)</span>
        ${dams.map(d => `<label class="field"><span>${esc(d.n)}</span><select data-dam="${esc(d.id)}">${[["", `Use official setting (${FT.damStatus[damState(d).status]?.n || "Typical"})`], ...Object.entries(FT.damStatus).map(([k, v]) => [k, v.n])].map(([v, n]) => `<option value="${v}" ${(e.dams[d.id] || "") === v ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`).join("")}
      </fieldset>
      <fieldset class="field" style="border:0;padding:0;margin:0"><span>Flood types</span><div class="checks">
        ${[["rain", "Heavy rain"], ["river", "River"], ["dam", "Dam release"], ["coast", "Coast and tide"]].map(([k, n]) => `<label><input type="checkbox" data-type="${k}" ${e.types[k] ? "checked" : ""}> ${n}</label>`).join("")}
      </div></fieldset>
      ${sel("minLevel", "Show from level", LEVELS.map(l => [l.k, l.n + (l.k === "low" ? " (all)" : " and above")]), e.minLevel)}
      <button class="sbtn" data-act="ex-reset">Reset to official settings</button>
    </aside>
    <section class="panel">
      <div class="card">
        <h2>${rows.length} flood area${rows.length === 1 ? "" : "s"} · ${HORIZONS.find(h => h.k === e.horizon).n.toLowerCase()} · ${MONTHS[e.month]}</h2>
        <div class="legend">${counts.map(([l, n]) => `<span class="lv-${l.k}">${icon(l.k, 18)}${l.n}: <b class="num">${n}</b></span>`).join("")}</div>
      </div>
      <div class="mapbox tall" id="mapbox"><div id="map" role="region" aria-label="3D flood risk map"></div>
        <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button><button class="wide" data-act="three" aria-pressed="${UI.three}">${UI.three ? "Flat map" : "3D columns"}</button></div>
        <div class="mapattr">Columns: height = risk score · Map data: Natural Earth · MapLibre</div>
      </div>
      <div class="legend">${LEVELS.map(l => `<span class="lv-${l.k}">${icon(l.k, 18)}${l.n}</span>`).join("")}<span><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21l4-16h10l4 16z" fill="var(--accent)"/></svg>Dam</span></div>
      <div class="tablewrap"><table>
        <thead><tr><th>Area</th><th>Region / state</th><th>Level</th><th class="n">Chance of flooding</th><th class="n">Rain</th><th class="n">Dam</th><th class="n">River</th><th class="n">People</th><th class="n">Vulnerability</th><th class="n">Past floods</th><th class="n">Score</th></tr></thead>
        <tbody>${rows.map(({h, r}) => `<tr class="clickable" data-act="ex-focus" data-id="${h.id}" tabindex="0"><td><b>${esc(h.n)}</b></td><td>${esc(IX.areaById[h.r]?.n || h.r)}</td><td>${chip(r.level)}</td><td class="n">${pct(r.P)}</td><td class="n">${pct(r.Prain)}</td><td class="n">${pct(r.Pdam)}</td><td class="n">${pct(r.Priver)}</td><td class="n">${r.E.toFixed(2)}</td><td class="n">${r.V.toFixed(2)}</td><td class="n">${r.nEvents}</td><td class="n">${r.score.toFixed(2)}</td></tr>`).join("") || `<tr><td colspan="11">No areas match these filters.</td></tr>`}</tbody>
      </table></div>
      <div class="grid2">
        <div class="card"><h2>How the forecast model works</h2>
          <div class="formula">score = P × (${st.wE}·E + ${st.wV}·V) × (1 + ${st.wH}·H)</div>
          <ul class="steps small">
            <li><b>P</b>, chance of flooding = 1 − (1 − rain) × (1 − dam) × (1 − river).</li>
            <li><b>Rain</b>: with a rain amount (official forecast or your scenario), chance rises steeply past the rain that usually starts flooding in that area. Without one, it uses the chance of a heavy-rain day from typical rain for the month.</li>
            <li><b>Dam</b>: the dam's official status, or its usual release pattern for the month.</li>
            <li><b>E</b> people exposed, <b>V</b> how easily people are hurt, <b>H</b> past floods (4 or more = 1).</li>
            <li>Levels: Medium from ${st.cut.med}, High from ${st.cut.high}, Very high from ${st.cut.vhigh}.</li>
            <li>Tides cut the rain needed to flood lagoon areas by 15% (normal) or 30% (very high).</li>
          </ul>
          <p class="small muted">This is a screening model. The full 2D flood simulation in the design plan replaces it as data arrives.</p>
        </div>
        <div class="card"><h2>Official data status</h2>
          ${data("feeds").map(f => `<div class="feed"><div><b>${esc(f.n)}</b><br><span class="small muted">${esc(f.what)}</span></div><span class="status ${f.status === "on" ? "on" : f.status === "manual" ? "manual" : "off"}">${f.status === "on" ? "Connected" : f.status === "manual" ? "Entered by staff" : "Not connected yet"}</span></div>`).join("")}
          <p class="small muted">When a feed connects, its readings replace the typical-weather inputs automatically.</p>
        </div>
      </div>
    </section>
  </div>`;
}
