/* ===== Every country and town: the world tables built by world/build_world.py =====
   Two place types join Ghana's and Nigeria's detailed ones:
     {type: "wc", id: "<two-letter code>"}  any country (Ghana and Nigeria keep their detailed "country" pages)
     {type: "wp", id: "p<number>"}          a town: every capital and every place of 50,000 people or more */
const WIX = {places: new Map(), byCountry: new Map()};
(function indexWorld() {
  for (const [id, n, c, a1, lon, lat, pop, cap, rlon, rlat] of WORLD.places) {
    const p = {id: "p" + id, n, c, a1, ll: [lon, lat], pop, cap: !!cap, river: rlon || rlat ? [rlon, rlat] : null};
    WIX.places.set(p.id, p);
    if (!WIX.byCountry.has(c)) WIX.byCountry.set(c, []);
    WIX.byCountry.get(c).push(p);
  }
})();

const worldCountry = cc => WORLD.countries[cc] || null;
const worldPlace = id => WIX.places.get(id) || null;
const DETAILED = new Set(Object.keys(FT.countries));   /* countries with hotspot-level flood data */
/* the page for a country: Ghana and Nigeria open their detailed page, every other country its flood and heat reach */
const countryPlace = cc => (DETAILED.has(cc) ? {type: "country", id: cc} : {type: "wc", id: cc});

function countryName(cc) { return FT.countries[cc]?.n || worldCountry(cc)?.n || cc; }

/* the nearest towns to a point, within maxKm */
function nearestWorldPlaces(ll, maxKm, cc, limit = 1) {
  const list = cc ? WIX.byCountry.get(cc) || [] : [...WIX.places.values()];
  return list.map(p => ({p, d: km(ll, p.ll)})).filter(x => x.d <= maxKm).sort((a, b) => a.d - b.d).slice(0, limit);
}

/* emergency numbers: Ghana's and Nigeria's agency list, otherwise the country's public numbers */
function emergencyNumbers(cc) {
  const listed = data("contacts").filter(x => x.c === cc);
  if (listed.length) return listed.map(x => ({n: x.n, num: x.num}));
  return (worldCountry(cc)?.e || []).map((num, i) => ({n: i === 0 ? "Emergency" : "Also", num}));
}

/* search entries for every country and town (added to Ghana's and Nigeria's detailed ones) */
function worldSearchEntries() {
  const out = [];
  for (const [cc, c] of Object.entries(WORLD.countries)) {
    if (DETAILED.has(cc)) continue;
    out.push({p: {type: "wc", id: cc}, t: c.n, s: "Country · flood and heat reach", keys: [c.n, cc.toLowerCase()]});
  }
  for (const p of WIX.places.values()) out.push({p: {type: "wp", id: p.id}, t: p.n, s: `${p.a1 ? p.a1 + ", " : ""}${countryName(p.c)}`, keys: [p.n]});
  return out;
}
