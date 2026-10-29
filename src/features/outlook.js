/* ===== Next rainy season outlook =====
   For every flood area: the chance it floods at least once in the coming rainy season, the months to watch,
   and how far water usually spreads when it does ("reach"). Method, in four steps:
   1. Climate: chance of at least one day's rain above the area's 3-day flood threshold during the rainy months
      (typical monthly rainfall → chance of a heavy day, same tail as the short-term model).
   2. Rivers and dams: the highest seasonal release chance of the dams that feed the area; big rivers by peak-month rain.
   3. History: years with a recorded flood since the record began → (flood years + 1) / (record years + 2).
      Physical and historical chances are averaged.
   4. Official outlooks: areas on the latest official high-risk lists (NIHSA Annual Flood Outlook, GMet and NiMet
      seasonal forecasts) and the ENSO state scale the odds. Administrators update these lists every year.
   The outlook ranks areas by likelihood and likely extent. It is not a flood map from terrain modelling. */
const OUTLOOK_DEFAULTS = {
  year: 2027,
  recordStart: 2015,
  enso: "neutral",
  ensoNote: "WMO (August 2026): a strong El Niño is expected to peak at the end of 2026 and last into early 2027. Its effect on the 2027 West African rainy season is not yet known.",
  lists: [
    {id: "nihsa-2026", n: "High flood risk in Nigeria's 2026 Annual Flood Outlook (NIHSA, 15 April 2026)", boost: 1.6,
      src: "https://allafrica.com/stories/202604160046.html",
      areas: ["NG-AB", "NG-AD", "NG-AN", "NG-BY", "NG-BE", "NG-BO", "NG-CR", "NG-DE", "NG-EB", "NG-ED", "NG-EN", "NG-GO", "NG-IM", "NG-JI", "NG-KD", "NG-KN", "NG-KE", "NG-KO", "NG-KW", "NG-LA", "NG-NA", "NG-NI", "NG-OG", "NG-ON", "NG-OS", "NG-OY", "NG-PL", "NG-RI", "NG-SO", "NG-TA", "NG-YO", "NG-ZA", "NG-FC"]},
    {id: "gmet-2026", n: "Above-normal rain in GMet's 2026 major rainy season forecast (southern Ghana)", boost: 1.3,
      src: "https://www.modernghana.com/news/1474145/gmet-predicts-heavy-rains-in-accra-tema-cape.html",
      areas: ["GH-AA", "GH-CP", "GH-EP"]}
  ]
};
const ENSO = {neutral: [1, "No ENSO adjustment"], elnino: [.9, "El Niño: slightly drier"], lanina: [1.15, "La Niña: slightly wetter"]};
/* how far water usually spreads, by what floods the area (km before scaling by severity and chance) */
const REACH = {flash: .8, coast: 1.5, river: 4, floodplain: 12};
const FLOODPLAIN_DAMS = ["lagdo", "niger", "bagre", "akosombo"];
const OUTLOOK_CACHE = new Map();

function outlookSettings() { return Object.assign({}, OUTLOOK_DEFAULTS, settings().outlook || {}); }
function rainyMonths(clim) { return clim.map((mm, i) => [mm, i]).filter(([mm]) => mm >= 80).map(([, i]) => i); }
/* [5, 6, 7, 9, 10] → "May to Jul and Sep to Oct"; runs may wrap around the new year */
function monthRange(ms) {
  const set = new Set(ms);
  if (!set.size) return "";
  if (set.size === 12) return "all year";
  const start = [...Array(12).keys()].find(m => set.has(m) && !set.has((m + 11) % 12));
  const runs = [];
  for (let i = 0, m = start; i < 12; i++, m = (m + 1) % 12) {
    if (!set.has(m)) continue;
    const last = runs[runs.length - 1];
    if (last && (last[1] + 1) % 12 === m) last[1] = m; else runs.push([m, m]);
  }
  const short = m => MONTHS[m].slice(0, 3);
  return runs.map(([a, b]) => a === b ? MONTHS[a] : `${short(a)} to ${short(b)}`).join(" and ");
}
const odds = p => p / Math.max(1e-6, 1 - p), fromOdds = o => o / (1 + o);

function outlookFor(h) {
  const o = outlookSettings(), key = h.id;
  if (OUTLOOK_CACHE.has(key)) return OUTLOOK_CACHE.get(key);
  const st = settings();
  const clim = (st.climate[h.z] || FT.climate[h.z] || {m: Array(12).fill(0)}).m;
  const drivers = h.d || [];
  const months = rainyMonths(clim);
  const causes = [];
  /* 1. climate */
  const T3 = (+h.t || 70) * (drivers.includes("coast") ? .85 : 1);
  let Pclim = 0;
  if (drivers.includes("rain")) {
    let q = 1;
    months.forEach(m => { q *= Math.pow(1 - pDay(clim[m], T3, st.tail), 30); });
    Pclim = 1 - q;
    causes.push({k: "rain", p: Pclim, t: months.length ? `The rainy season here usually runs ${monthRange(months)}; ${Pclim >= .6 ? "a downpour big enough to flood this area is likely in most years" : Pclim >= .3 ? "downpours big enough to flood this area come in some years" : "downpours big enough to flood this area are uncommon"}.` : "Little rain falls here in a typical year."});
  }
  /* 2. dams and rivers */
  let Pdam = 0, damMonths = [];
  drivers.filter(d => IX.damById[d]).forEach(id => {
    const dam = IX.damById[id], s = dam.season || [];
    const p = Math.max(0, ...s);
    if (p > Pdam) { Pdam = p; damMonths = s.map((x, i) => [x, i]).filter(([x]) => x >= .3).map(([, i]) => i); }
    causes.push({k: "dam", p, t: `${dam.n} ${p >= .5 ? "releases water in most rainy seasons" : p >= .2 ? "sometimes releases water in the rainy season" : "rarely releases water"}${damMonths.length ? `, usually ${monthRange(damMonths)}` : ""}.`});
  });
  let Priver = 0;
  if (drivers.includes("river")) {
    Priver = Math.min(.6, Math.max(0, (Math.max(...clim) - 120) / 350));
    if (Priver > .05) causes.push({k: "river", p: Priver, t: "Rivers here rise every rainy season and can overflow in wet years."});
  }
  const Pphys = 1 - (1 - Pclim) * (1 - Pdam) * (1 - Priver);
  /* 3. history */
  const evs = IX.evByHot[h.id] || [];
  const years = new Set(evs.map(e => e.year).filter(y => y >= o.recordStart));
  const span = Math.max(1, NOW.getFullYear() - o.recordStart + 1);
  const Phist = (years.size + 1) / (span + 2);
  causes.push({k: "history", p: Phist, t: years.size ? `Flooded in ${years.size} of the last ${span} years in our records (most recently ${Math.max(...years)}).` : `No flood recorded here in our records since ${o.recordStart}.`});
  /* 4. official outlooks and ENSO */
  let O = odds((Pphys + Phist) / 2);
  (o.lists || []).forEach(l => { if ((l.areas || []).includes(h.r)) { O *= +l.boost || 1; causes.push({k: "official", p: 0, t: `${l.n}.`}); } });
  const enso = ENSO[o.enso] || ENSO.neutral;
  O *= enso[0];
  const P = Math.min(.97, fromOdds(O));
  /* level: chance weighted a little by how bad floods get here */
  const sev = Math.min(3, Math.max(1, +h.sev || 2));
  const Pw = P * (.7 + .1 * sev);
  const level = Pw >= .65 ? "vhigh" : Pw >= .45 ? "high" : Pw >= .25 ? "med" : "low";
  /* reach */
  const type = drivers.some(d => FLOODPLAIN_DAMS.includes(d)) ? "floodplain" : drivers.includes("river") ? "river" : drivers.includes("coast") ? "coast" : "flash";
  const reach = Math.round(REACH[type] * (.6 + .2 * sev) * (.8 + .4 * P) * 10) / 10;
  const watch = [...new Set(months.filter(m => pDay(clim[m], T3, st.tail) >= .01).concat(damMonths))];
  const E = Math.min(1, (+h.exp || 2) / 3), V = Math.min(1, Math.max(0, +h.vul || .5));
  const r = {P, Pclim, Pdam, Priver, Phist, E, V, H: Math.min(1, evs.length / 4), score: P * (st.wE * E + st.wV * V), level, causes, nEvents: evs.length,
    reach, reachType: type, months: watch.length ? watch : months, outlook: true};
  OUTLOOK_CACHE.set(key, r);
  return r;
}
const REACH_WORDS = {flash: "streets and low ground nearby", coast: "the shore and lagoon edges", river: "the riverbanks and nearby low ground", floodplain: "the river floodplain"};
function reachText(r) { return `If it floods, water usually spreads about ${r.reach < 1 ? Math.round(r.reach * 1000) + " m" : r.reach + " km"} across ${REACH_WORDS[r.reachType]}.`; }

/* ---------- public screen: the season ahead, both countries ---------- */
function viewOutlook() {
  const o = outlookSettings();
  const block = c => {
    const rows = IX.hot.filter(h => h.c === c).map(h => ({h, r: outlookFor(h)})).sort((a, b) => b.r.P - a.r.P);
    const counts = LEVELS.map(l => [l, rows.filter(x => x.r.level === l.k).length]).filter(x => x[1]);
    return `<div class="card"><h2>${esc(FT.countries[c].n)}</h2>
      <p class="small">${counts.map(([l, n]) => `${n} ${l.n.toLowerCase()}`).join(" · ")} — across ${rows.length} known flood areas.</p>
      <div class="results">${rows.slice(0, 12).map(({h, r}) => `<button class="pick" data-act="open-outlook" data-id="${esc(h.id)}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">${esc(placeName({type: "area", id: h.r}))} · about ${Math.round(r.P * 100)}% chance · reach ${r.reach} km · ${esc(monthRange(r.months))}</span></span>${chip(r.level)}</button>`).join("")}</div>
      <button class="btn" data-act="outlook-map" data-k="${c}">See the ${esc(FT.countries[c].n)} outlook on the map</button></div>`;
  };
  return `<button class="back" data-act="back">← Back</button>
    <h1>${o.year} rainy season outlook</h1>
    <p>Where flooding is most likely in the coming rainy season, when to watch, and how far the water can reach. Tap an area for the reasons.</p>
    ${block("GH")}${block("NG")}
    <div class="card"><h2>How this outlook is made</h2>
      <p class="small">It combines typical rainfall for each area, river and dam patterns, the floods recorded since ${o.recordStart}, and the latest official outlooks: ${(o.lists || []).map(l => `<a href="${esc(safeUrl(l.src))}" target="_blank" rel="noopener">${esc(l.n)}</a>`).join("; ")}. ${esc(o.ensoNote || "")}</p>
      <p class="small muted">Official ${o.year} outlooks come out between February and April ${o.year} (GMet, NiMet, NIHSA). This outlook is updated as soon as they are published. It ranks areas by likelihood; it is not a detailed flood map.</p></div>`;
}
