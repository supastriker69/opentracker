"use strict";
/* Unit tests for the data-feed building blocks: network guard, heat model and every source's parser. */
const test = require("node:test");
const assert = require("node:assert/strict");
const {createNet, isPublicAddress, FeedError} = require("../lib/feeds/net");
const {parseXml} = require("../lib/feeds/xml");
const heat = require("../lib/feeds/heat");
const om = require("../lib/feeds/openmeteo");
const {parseGdacs, readBbox} = require("../lib/feeds/gdacs");
const cap = require("../lib/feeds/cap");
const stac = require("../lib/feeds/stac");
const {readComparison, weatherexUrl} = require("../lib/feeds/weatherex");
const {heatNoticeDrafts} = require("../lib/feeds/autoalerts");
const {countryDoc, worldDoc} = require("../lib/feeds/hazards");
const fx = require("./fixtures/feeds");

/* ---------- network guard ---------- */
test("only public internet addresses pass the address check", () => {
  for (const ip of ["8.8.8.8", "102.89.1.1", "2001:4860:4860::8888", "::ffff:8.8.4.4"]) assert.equal(isPublicAddress(ip), true, ip);
  for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.5.4", "172.31.255.255", "192.168.1.1", "100.64.0.1", "0.0.0.0",
    "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"]) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("172.32.0.1"), true);   /* just outside 172.16.0.0/12 */
});

test("the network client refuses unsafe addresses, redirects and oversized answers", async () => {
  const calls = [];
  const routes = {
    "https://feed.example.org/ok": () => new Response("hello", {status: 200, headers: {ETag: '"v1"'}}),
    "https://feed.example.org/to-http": () => new Response("", {status: 302, headers: {Location: "http://feed.example.org/plain"}}),
    "https://feed.example.org/to-private": () => new Response("", {status: 301, headers: {Location: "https://internal.example.org/secret"}}),
    "https://feed.example.org/big": () => new Response("x".repeat(2000), {status: 200}),
    "https://feed.example.org/missing": () => new Response("no", {status: 404})
  };
  const fetchImpl = async (url, init) => {
    calls.push({url, headers: init.headers});
    if (url === "https://feed.example.org/ok" && init.headers["If-None-Match"] === '"v1"') return new Response(null, {status: 304});
    return routes[url]();
  };
  const lookup = async host => (host === "internal.example.org" ? [{address: "10.1.2.3"}] : [{address: "93.184.216.34"}]);
  const net = createNet({fetchImpl, lookup});
  await assert.rejects(net.getText("http://feed.example.org/ok"), /only https/);
  await assert.rejects(net.getText("https://user:pw@feed.example.org/ok"), /passwords/);
  await assert.rejects(net.getText("https://feed.example.org/to-http"), /only https/);
  await assert.rejects(net.getText("https://feed.example.org/to-private", {publicOnly: true}), /public internet/);
  await assert.rejects(net.getText("https://10.0.0.8/x", {publicOnly: true}), /public internet/);
  await assert.rejects(net.getText("https://feed.example.org/big", {maxBytes: 1000}), /larger than 1000/);
  await assert.rejects(net.getText("https://feed.example.org/missing"), e => e instanceof FeedError && e.status === 404);
  const first = await net.getText("https://feed.example.org/ok", {conditional: true});
  const second = await net.getText("https://feed.example.org/ok", {conditional: true});
  assert.deepEqual([first.text, first.notModified, second.text, second.notModified], ["hello", false, "hello", true]);
});

test("XML with a DOCTYPE is refused (no entity expansion)", () => {
  assert.throws(() => parseXml('<!DOCTYPE x [<!ENTITY a "aaaa">]><r>&a;&a;</r>'), /DOCTYPE/);
  assert.deepEqual(parseXml("<r><a>A &amp; B</a></r>"), {r: {a: "A & B"}});
});

/* ---------- heat model ---------- */
test("percentile and NOAA heat index", () => {
  assert.equal(heat.percentile([1, 2, 3, 4, 5], 50), 3);
  assert.equal(heat.percentile([10, 20], 95), 19.5);
  assert.equal(heat.percentile([null, NaN], 50), null);
  assert.equal(heat.heatIndex(32.22, 60), 37.6);   /* 90 °F at 60 %: Rothfusz gives 99.7 °F (NOAA's table rounds to 100 °F) */
  assert.equal(heat.heatIndex(40, 10), 36.7);      /* dry heat: 98.6 °F minus the low-humidity correction of 0.5 °F */
  assert.equal(heat.heatIndex(20, 50), 19.4);      /* mild: the simple formula, 66.9 °F */
  assert.equal(heat.heatIndex(null, 50), null);
});

test("Excess Heat Factor and the baseline", () => {
  const flat = Array(40).fill(25);
  assert.equal(heat.ehf(flat, 30, 25), 0);
  assert.equal(heat.ehf(flat, 29, 25), null);   /* needs 30 days before */
  const warm = Array(30).fill(25).concat([30, 31, 32]);
  assert.equal(heat.ehf(warm, 30, 28), 3 * 6);    /* (31 − 28) × (31 − 25) */
  assert.throws(() => heat.baselineFrom({tmean: Array(100).fill(20)}, 1), /3 years/);
  const years = [];
  for (let d = 0; d < 4 * 365; d++) years.push(20 + 8 * Math.sin(2 * Math.PI * d / 365) + (d % 97 === 0 ? 6 : 0));
  const b = heat.baselineFrom({tmean: years, tmax: years.map(t => t + 6)}, 4);
  assert.ok(b.t95 > b.t90 && b.tmax90 > b.t90 && b.ehf85 > 0 && b.years === 4, JSON.stringify(b));
});

test("days are rated by local standards and by body limits", () => {
  const base = {t90: 30, t95: 31, tmax90: 36, ehf85: 5};
  const past = Array(30).fill(28);
  const day = (date, tmean, extra = {}) => Object.assign({date, tmax: tmean + 6, tmin: tmean - 5, tmean, feels: tmean + 8, wetBulb: 24, rhMin: 30}, extra);
  const r = heat.rateDays([day("d1", 27), day("d2", 30.5), day("d3", 34), day("d4", 35), day("d5", 35), day("d6", 35, {wetBulb: 30.6}), day("d7", 26)], past, base);
  /* d2 starts a 3-day spell averaging 33.2 °C against a local 95th percentile of 31 °C after a 28 °C month: EHF 11.2, 2.2 × EHF85 */
  assert.deepEqual(r.map(x => x.name), ["normal", "danger", "extreme", "extreme", "danger", "extreme", "normal"]);
  assert.equal(r[1].severity, 2.25);
  assert.ok(r[2].severity >= 3 && r[2].local);
  assert.equal(r[5].severity, null);   /* too close to the end of the forecast for a 3-day window */
  assert.ok(r[5].why.includes("wet-bulb near the limit of human cooling"));
  const noBase = heat.rateDays([day("d1", 30, {rhMin: 70, tmax: 36}), day("d2", 30, {wetBulb: 28.5})], [], null);
  assert.deepEqual(noBase.map(x => x.name), ["extreme", "danger"]);   /* 36 °C at 70 % humidity: heat index far past 52 °C */
  assert.equal(noBase[0].local, false);
});

/* ---------- Open-Meteo ---------- */
test("Open-Meteo addresses: public, paid and self-hosted", () => {
  assert.deepEqual(om.endpoints({}), {forecast: "https://api.open-meteo.com", flood: "https://flood-api.open-meteo.com", archive: "https://archive-api.open-meteo.com"});
  assert.equal(om.endpoints({openMeteoKey: "k"}).forecast, "https://customer-api.open-meteo.com");
  assert.equal(om.endpoints({openMeteoUrl: "https://meteo.internal.org"}).forecast, "https://meteo.internal.org");
  const u = new URL(om.forecastUrl("https://api.open-meteo.com", [{ll: [3.39, 6.445]}, {ll: [8.518, 12.002]}], {pastDays: 30, days: 7, key: "abc"}));
  assert.equal(u.searchParams.get("latitude"), "6.445,12.002");
  assert.equal(u.searchParams.get("longitude"), "3.39,8.518");
  assert.equal(u.searchParams.get("daily").split(",").length, 10);
  assert.equal(u.searchParams.get("apikey"), "abc");
  assert.equal(om.chunks([1, 2, 3, 4, 5], 2).length, 3);
});

test("Open-Meteo answers are read for one or many places", async () => {
  const places = [{id: "lagos", ll: [3.39, 6.445]}, {id: "kano", ll: [8.518, 12.002]}];
  const net = {getJson: async url => ({json: fx.openMeteoForecast(new URL(url).searchParams.get("latitude").split(",").length, {past: 30, days: 7})})};
  const {byPlace, errors} = await om.fetchForecasts(net, {}, places);
  assert.deepEqual(errors, []);
  assert.equal(byPlace.kano.past.length, 30);
  assert.equal(byPlace.kano.days.length, 7);
  assert.deepEqual(Object.keys(byPlace.kano.days[0]).sort(), ["code", "date", "feels", "rain", "rainChance", "rhMin", "tmax", "tmean", "tmin", "uv", "wetBulb"]);
  const one = om.readForecast(fx.openMeteoForecast(1, {past: 2, days: 3}), 2);
  assert.equal(one.days[0].date, "2026-10-02");
  assert.equal(one.past.length, 2);
  const failing = {getJson: async () => { throw new FeedError("the server answered 429", 429); }};
  await assert.rejects(om.fetchForecasts(failing, {}, places), /429/);
});

test("river flow: trend from the GloFAS forecast", () => {
  const flood = q => ({daily: {time: q.map((_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`), river_discharge: q, river_discharge_max: q.map(v => v * 1.2)}});
  assert.equal(om.readFlood(flood([100, 120, 160, 180, 150, 140, 130])).trend, "rising fast");
  assert.equal(om.readFlood(flood([100, 105, 112, 108, 100, 95, 90])).trend, "rising");
  assert.equal(om.readFlood(flood([100, 90, 80])).trend, "steady or falling");
  assert.equal(om.readFlood(flood([100, 90, 80])).peak7, 100);
  assert.throws(() => om.readFlood({}), /no river flow/);
});

/* ---------- GDACS ---------- */
test("GDACS RSS: events with levels, countries, points and boxes", () => {
  const events = parseGdacs(fx.GDACS_RSS, {NGA: "NG", IDN: "ID", BGD: "BD"});
  assert.equal(events.length, 2);   /* the unknown event type is skipped */
  const ng = events[0];
  assert.deepEqual([ng.id, ng.type, ng.level, ng.countries, ng.ll, ng.bbox, ng.current], ["gdacs-FL-1103999", "FL", "Orange", ["NG"], [13.15, 11.85], [9, 7, 15, 13], true]);
  assert.equal(ng.link, "https://www.gdacs.org/report.aspx?eventtype=FL&eventid=1103999");
  assert.equal(events[1].ll[1], -8.7893);
  assert.equal(readBbox("10 5 1 2"), null);   /* west above east */
  assert.throws(() => parseGdacs("<feed/>", {}), /not a GDACS/);
});

/* ---------- CAP ---------- */
test("CAP feeds in Atom and RSS list their messages", () => {
  const atom = cap.parseCapFeed(fx.CAP_ATOM, "https://alerts.example.org/feed.xml");
  assert.deepEqual(atom.map(e => e.url), ["https://alerts.example.org/cap/1.xml", "https://alerts.example.org/cap/2.xml"]);
  const rss = cap.parseCapFeed(fx.CAP_RSS, "https://alerts.example.org/rss.xml");
  assert.deepEqual(rss.map(e => e.url), ["https://alerts.example.org/cap/9.xml"]);
  assert.throws(() => cap.parseCapFeed("<html/>", "https://x.org/"), /Atom or RSS/);
});

test("a CAP alert is read into a public warning with its areas", () => {
  const a = cap.parseCapAlert(fx.capAlert({id: "NIMET-1", event: "Heat Wave", polygon: "11.0,13.0 12.0,13.0 12.0,14.0 11.0,13.0", circle: "6.45,3.39 25"}), {country: "NG", agency: "NiMet"});
  assert.equal(a.hazard, "heat");
  assert.equal(a.id, "cap-NG-NIMET-1");
  assert.equal(a.agency, "NiMet");
  assert.deepEqual(a.areas[0].polygons[0][0], [13, 11]);
  assert.deepEqual(a.areas[0].circles[0], {ll: [3.39, 6.45], km: 25});
  assert.equal(a.web, "https://nimet.example.org/warnings");
  assert.equal(cap.parseCapAlert(fx.capAlert({id: "F", event: "Flood Warning"}), {country: "NG"}).hazard, "flood");
  assert.equal(cap.parseCapAlert(fx.capAlert({id: "T", event: "Heat", status: "Exercise"}), {}), null);
  assert.deepEqual(cap.parseCapAlert(fx.capAlert({id: "C", msgType: "Cancel", references: "nimet,NIMET-1,2026-10-27T10:00:00Z"}), {}), {cancel: true, id: "C", references: ["NIMET-1"]});
  assert.equal(cap.readPolygon("1,2 3,4"), null);
  assert.equal(cap.readCircle("91,0 5"), null);
});

test("current alerts drop expired and replaced ones", () => {
  const now = Date.parse("2026-10-28T12:00:00Z");
  const list = [{capId: "a", sent: "2026-10-27T00:00:00Z", expires: "2026-10-29T00:00:00Z"}, {capId: "b", sent: "2026-10-26T00:00:00Z", expires: "2026-10-27T00:00:00Z"},
    {capId: "c", sent: "2026-10-28T00:00:00Z", references: ["a"]}];
  assert.deepEqual(cap.current(list, now).map(a => a.capId), ["c"]);
});

/* ---------- satellite scenes, WeatherEx ---------- */
test("STAC search boxes and answers", () => {
  assert.deepEqual(stac.searchBox({bbox: [3, 6, 4, 7]}), [3, 6, 4, 7]);
  assert.deepEqual(stac.searchBox({bbox: [-10, -10, 10, 10], ll: [13, 11]}), [12, 10, 14, 12]);
  assert.equal(stac.searchBox({bbox: null, ll: null}), null);
  const body = stac.searchBody("sentinel-2-l2a", [1, 2, 3, 4], "a", "b", 40);
  assert.deepEqual(body.query, {"eo:cloud_cover": {lt: 40}});
  assert.equal(stac.searchBody("sentinel-1-grd", [1, 2, 3, 4], "a", "b", 40).query, undefined);
  const items = stac.readItems({features: [{id: "S2B_1", properties: {datetime: "2026-10-26T10:00:00Z", "eo:cloud_cover": 12.4},
    assets: {thumbnail: {href: "https://x.org/t.jpg"}, visual: {href: "s3://bucket/v.tif"}}}]}, "optical");
  assert.deepEqual(items, [{id: "S2B_1", kind: "optical", at: "2026-10-26T10:00:00Z", cloud: 12, preview: "https://x.org/t.jpg", data: null}]);
});

test("WeatherEx: daily highs per model from its real answer shape", () => {
  const u = new URL(weatherexUrl("https://meteo.weatherex.ai", {ll: [3.39, 6.445]}, 3));
  assert.equal(u.pathname, "/api/forecast");
  assert.equal(u.searchParams.get("models"), "gfs,ecmwf,icon");
  assert.deepEqual(readComparison(fx.WEATHEREX), {gfs: [{date: "2026-10-27", tmax: 32.6}, {date: "2026-10-28", tmax: 30.1}]});
  assert.throws(() => readComparison({success: false}), /not a WeatherEx/);
});

/* ---------- summaries and automatic alerts ---------- */
test("country summary, world summary and heat alert drafts", () => {
  const places = [{id: "kano", n: "Kano", a1: "Kano", c: "NG", ll: [8.518, 12.002], pop: 3140000, cap: 0}];
  const days = ["2026-10-28", "2026-10-29", "2026-10-30"].map((date, i) => ({date, tmax: 41, tmin: 27, tmean: 34, feels: 44, wetBulb: i === 1 ? 30.4 : 24, rhMin: 15, rain: 0, rainChance: 0, code: 0, uv: 11}));
  const doc = countryDoc({c: "NG", places, forecast: {byPlace: {kano: {past: Array(30).fill(31), days}}}, baselines: null, disasters: [], alerts: [], scenes: {}, at: "t"});
  assert.equal(doc.heat[0].level, 4);
  assert.deepEqual(doc.sources, ["open-meteo-forecast"]);
  const world = worldDoc([doc], "t");
  assert.deepEqual(world.countries.NG, {heat: 4, dangerPlaces: 1, alerts: 0, floodAlerts: 0, heatAlerts: 0, disasters: 0, risingRivers: 0});
  const drafts = heatNoticeDrafts([doc]);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].id, "heat-kano-2026-10-29");
  assert.equal(drafts[0].level, "warning");
  assert.match(drafts[0].msg, /^Tomorrow \(2026-10-29\) in and around Kano: high 41°C, feels like 44°C, wet-bulb 30°C\./);
  assert.match(drafts[0].msg, /not an official warning/);
  assert.ok(drafts[0].title.length <= 80 && drafts[0].msg.length <= 500);
});

/* ---------- scheduler ---------- */
const {createScheduler} = require("../lib/feeds/scheduler");
const memoryStore = (lockOk = true) => {
  const docs = new Map();
  return {docs, getDoc: async k => docs.get(k) ?? null, putDoc: async (k, v) => { docs.set(k, v); }, lock: async () => lockOk};
};
const waitFor = async (cond, ms = 3000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > ms) throw new Error("timed out"); await new Promise(r => setTimeout(r, 10)); } };

test("the scheduler records health, backs off on failure and recovers", async () => {
  const store = memoryStore();
  let fail = true, runs = 0;
  const s = createScheduler({store, holder: "a", log: {error() {}}, random: () => 0.5});
  s.add({id: "demo", everyMs: 3600e3, run: async () => { runs++; if (fail) throw new Error("source is down"); return {summary: {n: 1}, warnings: ["one place failed"]}; }});
  assert.throws(() => s.add({id: "Bad Id", everyMs: 1000, run() {}}), /bad feed definition/);
  assert.equal(s.runNow("missing"), false);
  assert.equal(s.runNow("demo"), true);
  await waitFor(() => store.docs.get("feed-health:demo"));
  let h = store.docs.get("feed-health:demo");
  assert.deepEqual([h.status, h.error, h.failures], ["failing", "source is down", 1]);
  assert.ok(Date.parse(h.nextRun) - Date.now() < 16 * 60e3);   /* first retry within the backoff, not the full hour */
  fail = false;
  store.docs.delete("feed-health:demo");
  s.runNow("demo");
  await waitFor(() => store.docs.get("feed-health:demo"));
  h = store.docs.get("feed-health:demo");
  assert.deepEqual([h.status, h.failures, h.summary, h.warnings, h.error], ["partial", 0, {n: 1}, ["one place failed"], null]);
  assert.equal(runs, 2);
  s.stop();
  assert.equal(s.runNow("demo"), false);
});

test("a feed another server holds the lock for is not run here", async () => {
  const store = memoryStore(false);
  let runs = 0;
  const s = createScheduler({store, holder: "b", random: () => 0});
  s.add({id: "demo", everyMs: 3600e3, run: async () => { runs++; }});
  s.start();
  await new Promise(r => setTimeout(r, 1200));   /* the first timed run is due after 1 s */
  s.stop();
  assert.equal(runs, 0);
  assert.equal(store.docs.size, 0);
});
