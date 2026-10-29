"use strict";
/* Writes the made-up test files the browser tests import (run: node webapp/test/fixtures/make-fixtures.js):
     test-snapshot.json            a live data file as the console's "Download live data" makes it
     test-projection-replay.json   a flood projection saved as a replay file, on a made-up valley
   Everything in them is invented for testing; none of it describes real weather or floods. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {countryDoc, worldDoc} = require("../../lib/feeds/hazards");

const HERE = __dirname;
const FLOODSIM = vm.runInThisContext(fs.readFileSync(path.join(HERE, "..", "..", "..", "src", "features", "floodsim.js"), "utf8") + "\nFLOODSIM;");

/* ---------- live data ---------- */
const day = (date, tmax, wetBulb, rain) => ({date, tmax, tmin: tmax - 10, tmean: tmax - 5, feels: tmax + 3, wetBulb, rhMin: 20, rain, rainChance: rain ? 80 : 5, code: rain ? 63 : 1, uv: 11});
const week = (tmax, wetBulb, rain) => ["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"].map((d, i) => day(d, tmax + (i === 2 ? 2 : 0), wetBulb, rain[i] || 0));
const TOWNS = {
  NG: [{id: "p1159151297", n: "Kano", a1: "Kano", c: "NG", ll: [8.518, 12.002], pop: 3140000, cap: 0, river: [8.52, 12.01]},
    {id: "p1159149691", n: "Maiduguri", a1: "Borno", c: "NG", ll: [13.158, 11.852], pop: 896000, cap: 0}],
  GH: [{id: "p1159151403", n: "Accra", a1: "Greater Accra", c: "GH", ll: [-0.219, 5.552], pop: 2121000, cap: 1}],
  IN: [{id: "p1159151299", n: "Mumbai", a1: "Maharashtra", c: "IN", ll: [72.855, 19.019], pop: 18978000, cap: 0}]
};
const forecast = {
  NG: {byPlace: {p1159151297: {past: Array(30).fill(31), days: week(41, 29, [])}, p1159149691: {past: Array(30).fill(31), days: week(43, 31, [])}}},
  GH: {byPlace: {p1159151403: {past: Array(30).fill(27), days: week(31, 25, [40, 70, 30])}}},
  IN: {byPlace: {p1159151299: {past: Array(30).fill(29), days: week(33, 27, [60, 90, 20])}}}
};
const rivers = {NG: {byPlace: {p1159151297: {today: 100, peak7: 260, peak30: 300, trend: "rising fast", days: []}}}};
const disasters = [{id: "gdacs-FL-9999001", source: "gdacs", type: "FL", hazard: "flood", level: "Orange", title: "Orange flood alert in Nigeria (test)", countries: ["NG"], place: "Nigeria",
  from: "2026-10-20T00:00:00.000Z", to: null, current: true, ll: [13.15, 11.85], bbox: [12.5, 11.2, 13.8, 12.4], link: "https://www.gdacs.org/", severity: "", population: ""}];
const alerts = {NG: [{id: "cap-NG-TEST-1", source: "cap", capId: "TEST-1", agency: "Test weather agency", country: "NG", hazard: "heat", event: "Heat Wave", headline: "Very hot days in the north (test)",
  description: "Test message.", instruction: "Drink water.", severity: "Severe", urgency: "Expected", certainty: "Likely", sent: "2026-10-27T10:00:00.000Z",
  effective: "2026-10-27T10:00:00.000Z", expires: "2099-01-01T00:00:00.000Z", web: "", references: [], areas: [{desc: "Kano", polygons: [], circles: [{ll: [8.5, 12], km: 60}]}]}]};
const at = "2026-10-28T06:00:00.000Z";
const countries = {};
for (const c of Object.keys(TOWNS)) countries[c] = countryDoc({c, places: TOWNS[c], forecast: forecast[c], rivers: rivers[c], models: null, baselines: null, disasters, alerts: alerts[c] || [], scenes: {}, at});
fs.writeFileSync(path.join(HERE, "test-snapshot.json"), JSON.stringify({app: "OpenTracker-snapshot", version: 1, at, world: worldDoc(Object.values(countries), at), countries}));

/* ---------- a saved projection on a made-up valley around Accra's position ---------- */
const w = 60, dem = new Float64Array(w * w);
for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) dem[y * w + x] = 5 + 0.08 * Math.abs(x - 30) + 0.02 * y;
const run = FLOODSIM.runAll({dem, w, h: w, cell: 50, rainMm: 150, stormHours: 4, hours: 8});
const bbox = [-0.232, 5.539, -0.205, 5.566];
const frames = run.frames.map((f, k) => ({t: new Date(Date.parse("2026-10-28T00:00:00Z") + k * 3600e3).toISOString(), label: `Hour ${k}`, km2: Math.round(f.km2 * 100) / 100,
  m3: Math.round(f.volume), fc: FLOODSIM.frameCollection(FLOODSIM.classify(f.depth), w, w, bbox)}));
fs.writeFileSync(path.join(HERE, "test-projection-replay.json"), JSON.stringify({app: "OpenTracker-replay", version: 1,
  replay: {id: "proj-test-valley", kind: "model", title: "Projected flood: test valley (made-up ground)", c: "GH", areas: [], bbox, source: "Open Tracker flood projection (test)",
    notes: "Made-up ground for testing.", link: "", assumptions: ["Test data, not a real place."], classes: FLOODSIM.CLASSES, made: at, madeWith: "Open Tracker projection 1"}, frames}));
console.log("wrote test-snapshot.json and test-projection-replay.json; peak volume", Math.round(Math.max(...run.frames.map(f => f.volume))), "m³");
