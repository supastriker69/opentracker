"use strict";
/* Validation of everything that comes over the network, and the targeting rule that decides
   which subscribed devices receive a notice. Pure functions: no I/O, fully unit-tested. */

const LEVELS = ["warning", "watch", "info", "clear"];
const AREA_RE = /^[A-Z]{2}-[A-Z0-9]{1,4}$/;      /* region / state ids such as GH-AA, NG-LA */
const COUNTRY_RE = /^[A-Z]{2}$/;

const {InputError} = require("./errors");
const fail = msg => { throw new InputError(msg); };

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const str = (v, max, name, required) => {
  if (v === undefined || v === null || v === "") { if (required) fail(`${name} is required`); return ""; }
  if (typeof v !== "string") fail(`${name} must be text`);
  const s = v.trim();
  if (required && !s) fail(`${name} is required`);
  if (s.length > max) fail(`${name} is longer than ${max} characters`);
  return s;
};
const point = (v, name) => {
  if (!Array.isArray(v) || v.length !== 2) fail(`${name} must be [longitude, latitude]`);
  const [lon, lat] = v.map(Number);
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) fail(`${name} is not a valid position`);
  return [Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4];
};
const list = (v, re, max, name) => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > max) fail(`${name} must be a list of at most ${max}`);
  const out = [...new Set(v)];
  out.forEach(x => { if (typeof x !== "string" || !re.test(x)) fail(`${name} contains an invalid value`); });
  return out;
};

/* a browser push subscription plus what the person follows */
function parseSubscription(body) {
  if (!isObj(body) || !isObj(body.subscription)) fail("subscription is required");
  const s = body.subscription;
  const endpoint = str(s.endpoint, 1000, "endpoint", true);
  let u;
  try { u = new URL(endpoint); } catch (e) { fail("endpoint is not a URL"); }
  if (u.protocol !== "https:") fail("endpoint must use https");
  if (!isObj(s.keys)) fail("subscription keys are required");
  const p256dh = str(s.keys.p256dh, 200, "p256dh", true), auth = str(s.keys.auth, 100, "auth", true);
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(p256dh) || !/^[A-Za-z0-9_-]+={0,2}$/.test(auth)) fail("subscription keys are malformed");
  const points = body.points === undefined ? [] : (Array.isArray(body.points) && body.points.length <= 20 ? body.points.map((p, i) => point(p, `points[${i}]`)) : fail("points must be a list of at most 20"));
  return {
    subscription: {endpoint, keys: {p256dh, auth}},
    countries: list(body.countries, COUNTRY_RE, 20, "countries"),
    whole: list(body.whole, COUNTRY_RE, 20, "whole"),
    areas: list(body.areas, AREA_RE, 60, "areas"),
    points
  };
}

/* a notice sent by an agency or the Open Tracker team */
function parseNotice(body, now = Date.now()) {
  if (!isObj(body)) fail("body must be an object");
  const level = body.level === undefined ? "info" : body.level;
  if (!LEVELS.includes(level)) fail("level must be one of " + LEVELS.join(", "));
  const c = str(body.c, 3, "country", true).toUpperCase();
  if (c !== "ALL" && !COUNTRY_RE.test(c)) fail("country must be a two-letter code or ALL");
  const areas = list(body.areas, AREA_RE, 60, "areas");
  if (c !== "ALL" && areas.some(a => a.slice(0, 2) !== c)) fail("every region or state must be in the chosen country");
  let ll = null, km = 0;
  if (body.ll !== undefined && body.ll !== null) {
    ll = point(body.ll, "ll");
    km = Number(body.km);
    if (!(km >= 1 && km <= 300)) fail("km must be between 1 and 300");
  }
  let expires = "";
  if (body.expires) {
    const t = Date.parse(body.expires);
    if (!t || t <= now) fail("expires must be a future date");
    if (t > now + 30 * 864e5) fail("expires can be at most 30 days ahead");
    expires = new Date(t).toISOString();
  }
  return {level, title: str(body.title, 80, "title", true), msg: str(body.msg, 500, "msg", true), c, areas, ll, km, expires};
}

const R = 6371;
function km(a, b) {
  const rad = x => x * Math.PI / 180;
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* does this notice concern this subscriber? */
function matches(notice, sub) {
  if (notice.c !== "ALL" && !sub.countries.includes(notice.c)) return false;
  if (notice.c === "ALL" ? sub.whole.length > 0 : sub.whole.includes(notice.c)) return true;   /* follows the whole country */
  if (!notice.areas.length && !notice.ll) return true;                                           /* country-wide notice */
  if (notice.areas.some(a => sub.areas.includes(a))) return true;
  if (notice.ll) return sub.points.some(p => km(p, notice.ll) <= notice.km);
  return false;
}

/* something a member of the public sends: a flood report, a correction, a suggestion or a data source */
const CONTRIB_TYPES = ["report", "correction", "suggestion", "data"];
const DEPTHS = ["ankle", "knee", "waist", "chest", "above"];
const CATEGORIES = ["feature", "data", "design", "other"];
function parseContribution(body, now = Date.now()) {
  if (!isObj(body)) fail("body must be an object");
  if (!CONTRIB_TYPES.includes(body.type)) fail("type must be one of " + CONTRIB_TYPES.join(", "));
  const out = {type: body.type, text: str(body.text, 1000, "text", true)};
  if (body.place !== undefined && body.place !== null) {
    if (!isObj(body.place) || !["area", "hotspot", "country", "wc", "wp"].includes(body.place.type) || typeof body.place.id !== "string" || !/^[A-Za-z0-9_-]{1,60}$/.test(body.place.id)) fail("place is not valid");
    out.place = {type: body.place.type, id: body.place.id};
  }
  out.placeText = str(body.placeText, 120, "placeText", false);
  if (body.date) {
    if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !Date.parse(body.date)) fail("date must look like 2026-06-29");
    if (Date.parse(body.date) > now + 864e5) fail("date can't be in the future");
    out.date = body.date;
  }
  if (body.depth !== undefined && body.depth !== "") { if (!DEPTHS.includes(body.depth)) fail("depth is not valid"); out.depth = body.depth; }
  if (body.category !== undefined && body.category !== "") { if (!CATEGORIES.includes(body.category)) fail("category is not valid"); out.category = body.category; }
  const src = str(body.src, 500, "source link", false);
  if (src) { let u; try { u = new URL(src); } catch (e) { fail("source link is not a web address"); } if (!["http:", "https:"].includes(u.protocol)) fail("source link must start with http:// or https://"); out.src = u.href; }
  if (body.ll !== undefined && body.ll !== null) out.ll = point(body.ll, "ll");
  if (out.type === "report" && !out.place && !out.placeText && !out.ll) fail("say where the flooding is");
  return out;
}

/* a flood replay file from the modelling or satellite tools: same rules as the app (src/features/replay.js) */
const REPLAY_KINDS = ["model", "satellite"];
function parseFc(fc, ks) {
  if (!isObj(fc) || fc.type !== "FeatureCollection" || !Array.isArray(fc.features) || fc.features.length > 50) fail("each step needs a FeatureCollection with at most 50 shapes");
  let pts = 0;
  for (const f of fc.features) {
    const g = f && f.geometry;
    const polys = g && g.type === "Polygon" ? [g.coordinates] : g && g.type === "MultiPolygon" ? g.coordinates : null;
    if (!Array.isArray(polys)) fail("only Polygon and MultiPolygon shapes are allowed");
    if (!ks.has(f.properties && f.properties.k)) fail("a shape has an unknown class");
    for (const poly of polys) for (const ring of poly) {
      if (!Array.isArray(ring) || ring.length < 4) fail("a shape has a broken outline");
      for (const c of ring) { if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) fail("coordinates must be longitude/latitude"); pts++; }
    }
  }
  if (pts > 40000 || JSON.stringify(fc).length > 200000) fail("a step is too detailed; simplify it");
  return {type: "FeatureCollection", features: fc.features.map(f => ({type: "Feature", properties: {k: f.properties.k}, geometry: {type: f.geometry.type, coordinates: f.geometry.coordinates}}))};
}
function parseReplay(b) {
  if (!isObj(b) || b.app !== "OpenTracker-replay" || b.version !== 1 || !isObj(b.replay) || !Array.isArray(b.frames)) fail("this is not an Open Tracker replay file");
  const r = b.replay;
  if (typeof r.id !== "string" || !/^[a-z0-9-]{2,80}$/.test(r.id)) fail("replay id must use lowercase letters, numbers and dashes");
  if (!REPLAY_KINDS.includes(r.kind)) fail("kind must be model or satellite");
  if (!Array.isArray(r.bbox) || r.bbox.length !== 4 || !r.bbox.every(Number.isFinite) || !(r.bbox[0] < r.bbox[2] && r.bbox[1] < r.bbox[3])) fail("bbox is not valid");
  const classes = r.kind === "satellite" ? [{k: 1, n: "Water seen from space"}]
    : (Array.isArray(r.classes) ? r.classes : []).filter(c => isObj(c) && [1, 2, 3, 4].includes(c.k)).map(c => ({k: c.k, n: str(c.n, 60, "class name", false), min: Number.isFinite(c.min) ? c.min : null, max: Number.isFinite(c.max) ? c.max : null}));
  if (!classes.length) fail("replay has no classes");
  if (!b.frames.length || b.frames.length > 200) fail("a replay needs 1 to 200 steps");
  const ks = new Set(classes.map(c => c.k));
  const frames = b.frames.map(f => {
    if (!isObj(f) || !Date.parse(f.t)) fail("each step needs a valid time");
    return {t: new Date(f.t).toISOString(), label: str(f.label, 40, "label", false), km2: Number.isFinite(f.km2) && f.km2 >= 0 ? Math.round(f.km2 * 100) / 100 : 0,
      m3: Number.isFinite(f.m3) && f.m3 >= 0 ? Math.round(f.m3) : null, fc: parseFc(f.fc, ks)};
  }).sort((x, y) => x.t.localeCompare(y.t));
  const link = str(r.link, 500, "link", false);
  return {
    meta: {id: r.id, kind: r.kind, title: str(r.title, 120, "title", false) || "Flood replay", c: COUNTRY_RE.test(r.c || "") ? r.c : "ALL",
      areas: list(Array.isArray(r.areas) ? r.areas : [], AREA_RE, 60, "areas"), bbox: r.bbox.map(v => Math.round(v * 1e5) / 1e5),
      source: str(r.source, 200, "source", false), notes: str(r.notes, 500, "notes", false), link: /^https?:\/\//.test(link) ? link : "",
      assumptions: (Array.isArray(r.assumptions) ? r.assumptions : []).slice(0, 10).map(a => str(a, 300, "assumption", false)).filter(Boolean),
      classes, frameMinutes: r.kind === "model" ? 60 : null, made: str(r.made, 40, "made", false), madeWith: str(r.madeWith, 80, "madeWith", false)},
    frames
  };
}

/* a published data snapshot from Admin → Download backup; private sections are dropped */
const PUBLIC_COLLS = ["hotspots", "events", "regionEvents", "safe", "roads", "dams", "feeds", "contacts", "alerts", "forecasts", "agencies", "notifications"];
function parseData(body) {
  if (!isObj(body) || !["OpenTracker", "Open Tracker"].includes(body.app)) fail("this is not an Open Tracker backup file");
  const out = {app: "OpenTracker", published: new Date().toISOString(), settings: isObj(body.settings) ? body.settings : {}};
  for (const k of PUBLIC_COLLS) {
    if (body[k] === undefined) continue;
    if (!Array.isArray(body[k]) || body[k].length > 20000) fail(`${k} must be a list`);
    out[k] = body[k].filter(r => isObj(r) && typeof r.id === "string" && r.id.length <= 200);
  }
  if (out.agencies) out.agencies = out.agencies.map(a => Object.assign({}, a, {publishers: []}));   /* account ids stay private */
  return out;
}

module.exports = {InputError, parseSubscription, parseNotice, parseContribution, parseReplay, parseData, matches, km, LEVELS, CONTRIB_TYPES};
