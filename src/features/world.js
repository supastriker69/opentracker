/* ===== Every country and town: the world tables built by world/build_world.py =====
   Two place types join Ghana's and Nigeria's detailed ones:
     {type: "wc", id: "<two-letter code>"}  any country (Ghana and Nigeria keep their detailed "country" pages)
     {type: "wp", id: "p<number>"}          a town: every capital and every place of 50,000 people or more */
import {FT} from "../data/data.js";
import {data} from "../core/core.js";

export const WIX = {places: new Map(), byCountry: new Map()};
(function indexWorld() {
  for (const [id, n, c, a1, lon, lat, pop, cap, rlon, rlat] of WORLD.places) {
    const p = {id: "p" + id, n, c, a1, ll: [lon, lat], pop, cap: !!cap, river: rlon || rlat ? [rlon, rlat] : null};
    WIX.places.set(p.id, p);
    if (!WIX.byCountry.has(c)) WIX.byCountry.set(c, []);
    WIX.byCountry.get(c).push(p);
  }
})();

export const worldCountry = cc => WORLD.countries[cc] || null;
export const worldPlace = id => WIX.places.get(id) || null;
export const DETAILED = new Set(Object.keys(FT.countries));   /* countries with hotspot-level flood data */
/* the page for a country: Ghana and Nigeria open their detailed page, every other country its flood and heat reach */
export const countryPlace = cc => (DETAILED.has(cc) ? {type: "country", id: cc} : {type: "wc", id: cc});

/* the part of a country to show on a map: its towns without far-off islands and territories
   (France's box from Natural Earth runs from French Guiana to Réunion, the United States' to Alaska and Hawaii) */
function countryBounds(cc) {
  const c = worldCountry(cc);
  const whole = [[c.b[0], c.b[1]], [c.b[2], c.b[3]]];
  const towns = WIX.byCountry.get(cc) || [];
  const narrow = b => (b[1][0] - b[0][0] < 180 ? b : null);   /* islands across the date line (Fiji, Kiribati): centre on the capital instead */
  if (towns.length < 8) return narrow(whole);
  const q = (xs, f) => xs[Math.min(xs.length - 1, Math.floor(f * xs.length))];
  const lons = towns.map(p => p.ll[0]).sort((a, b) => a - b), lats = towns.map(p => p.ll[1]).sort((a, b) => a - b);
  const cap = towns.find(p => p.cap)?.ll || c.ll;
  const box = [[Math.min(q(lons, .05), cap[0]) - .5, Math.min(q(lats, .05), cap[1]) - .5], [Math.max(q(lons, .95), cap[0]) + .5, Math.max(q(lats, .95), cap[1]) + .5]];
  return narrow(box[1][0] - box[0][0] < whole[1][0] - whole[0][0] || box[1][1] - box[0][1] < whole[1][1] - whole[0][1] ? box : whole);
}
export function countryFit(cc) {
  const c = worldCountry(cc); if (!c) return {ll: [0, 15], z: 1.6};
  const b = countryBounds(cc);
  return b ? {bounds: b, ll: c.ll, z: 5, maxZoom: 7} : {ll: (WIX.byCountry.get(cc) || []).find(p => p.cap)?.ll || c.ll, z: 5};
}

export function countryName(cc) { return FT.countries[cc]?.n || worldCountry(cc)?.n || cc; }

/* emergency numbers: Ghana's and Nigeria's agency list, otherwise the country's public numbers */
export function emergencyNumbers(cc) {
  const listed = data("contacts").filter(x => x.c === cc);
  if (listed.length) return listed.map(x => ({n: x.n, num: x.num}));
  return (worldCountry(cc)?.e || []).map((num, i) => ({n: i === 0 ? "Emergency" : "Also", num}));
}

/* search entries for every country and town (added to Ghana's and Nigeria's detailed ones) */
export function worldSearchEntries() {
  const out = [];
  for (const [cc, c] of Object.entries(WORLD.countries)) {
    if (DETAILED.has(cc)) continue;
    out.push({p: {type: "wc", id: cc}, t: c.n, s: "Country · flood and heat reach", keys: [c.n, cc.toLowerCase()]});
  }
  for (const p of WIX.places.values()) out.push({p: {type: "wp", id: p.id}, t: p.n, s: `${p.a1 ? p.a1 + ", " : ""}${countryName(p.c)}`, keys: [p.n]});
  return out;
}
