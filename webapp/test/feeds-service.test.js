"use strict";
/* The whole data-feed service inside a real server process, with every outside service replaced by a fake:
   run each feed, check the per-country summaries and the API, automatic heat alerts, admin controls,
   and that a failing source keeps its last good data. Runs on file storage, and on Redis with TEST_REDIS_URL. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {loadConfig} = require("../lib/config");
const {startProcess} = require("../server");
const {runCli} = require("../lib/cli");
const {createNet} = require("../lib/feeds/net");
const fx = require("./fixtures/feeds");

const PLACES = [
  {id: "p1", n: "Abuja", c: "NG", a1: "FCT", ll: [7.49, 9.06], pop: 1576000, cap: 1},
  {id: "p2", n: "Accra", c: "GH", a1: "Greater Accra", ll: [-0.219, 5.552], pop: 2121000, cap: 1},
  {id: "p3", n: "Kano", c: "NG", a1: "Kano", ll: [8.518, 12.002], pop: 3140000, cap: 0, river: [8.52, 12.01]}
];
const COUNTRIES = [{iso2: "NG", iso3: "NGA", name: "Nigeria"}, {iso2: "GH", iso3: "GHA", name: "Ghana"}];

/* the outside world */
const world = {gdacsDown: false, capEntries: ["1"], cap3Down: false, requests: []};
function fakeFetch(url, init) {
  const u = new URL(url);
  world.requests.push(u.host + u.pathname);
  const json = v => new Response(JSON.stringify(v), {status: 200, headers: {"Content-Type": "application/json"}});
  const xml = (v, etag) => new Response(v, {status: 200, headers: Object.assign({"Content-Type": "application/xml"}, etag ? {ETag: etag} : {})});
  const n = () => u.searchParams.get("latitude").split(",").length;
  switch (u.host + u.pathname) {
    case "api.open-meteo.com/v1/forecast": return json(fx.openMeteoForecast(n(), {past: 30, days: 7, tmean: 30, wetBulb: 29}));
    case "archive-api.open-meteo.com/v1/archive": return json(fx.openMeteoArchive(4));
    case "flood-api.open-meteo.com/v1/flood": return json(fx.openMeteoFlood(n()));
    case "www.gdacs.org/xml/rss.xml": return world.gdacsDown ? new Response("down", {status: 500}) : xml(fx.GDACS_RSS);
    case "alerts.example.org/feed.xml": return xml(`<feed xmlns="http://www.w3.org/2005/Atom"><title>t</title><id>f</id><updated>2026-10-28T00:00:00Z</updated>${
      world.capEntries.map(e => `<entry><id>e${e}</id><title>t</title><updated>2026-10-28T00:00:00Z</updated><link type="application/cap+xml" href="/cap/${e}.xml"/></entry>`).join("")}</feed>`);
    case "alerts.example.org/cap/1.xml": return xml(fx.capAlert({id: "NIMET-1", event: "Heat Wave"}));
    case "alerts.example.org/cap/3.xml": return world.cap3Down ? new Response("busy", {status: 503}) : xml(fx.capAlert({id: "NIMET-3", event: "Flash Flood Warning"}));
    case "alerts.example.org/cap/2.xml": return xml(fx.capAlert({id: "NIMET-2", msgType: "Cancel", references: "nimet@example.org,NIMET-1,2026-10-27T10:00:00+01:00"}));
    case "earth-search.aws.element84.com/v1/search": return json(fx.stacSearch(JSON.parse(init.body).collections[0]));
    case "meteo.weatherex.ai/api/forecast": return json(fx.WEATHEREX);
    default: return new Response("not found", {status: 404});
  }
}
const lookup = async host => [{address: host.startsWith("intranet.") ? "10.0.0.5" : "93.184.216.34"}];

const backends = [["file", {}]];
if (process.env.TEST_REDIS_URL) backends.push(["redis", {REDIS_URL: process.env.TEST_REDIS_URL}]);

for (const [name, extraEnv] of backends) {
  test.describe(`data feeds with ${name} storage`, () => {
    const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "ot-feeds-"));
    const PUB = fs.mkdtempSync(path.join(os.tmpdir(), "ot-feeds-pub-"));
    fs.writeFileSync(path.join(PUB, "places.json"), JSON.stringify(PLACES));
    fs.writeFileSync(path.join(PUB, "countries.json"), JSON.stringify(COUNTRIES));
    /* ROLE=web: nothing runs on its own timer, the test runs each feed */
    const cfg = loadConfig(Object.assign({DATA_DIR: DATA, PUBLIC_DIR: PUB, PORT: "0", ROLE: "web", WEATHEREX_ENABLED: "1", BASELINE_YEARS: "4", BASELINE_PER_RUN: "5"}, extraEnv));
    let p, base, admin;
    const call = async (u, {key, body} = {}) => {
      const h = {};
      if (key) h.Authorization = "Bearer " + key;
      if (body !== undefined) h["Content-Type"] = "application/json";
      const r = await fetch(base + u, {method: body === undefined ? "GET" : "POST", headers: h, body: body === undefined ? undefined : JSON.stringify(body)});
      return {status: r.status, headers: r.headers, json: await r.json().catch(() => null)};
    };
    const until = async (cond, ms = 8000) => { const t = Date.now(); while (!(await cond())) { if (Date.now() - t > ms) throw new Error("timed out"); await new Promise(r => setTimeout(r, 30)); } };
    const health = async id => (await call("/api/sources/admin", {key: admin})).json.sources.find(s => s.id === id);
    async function run(id, status = "ok") {
      const before = (await health(id)).lastRun;
      assert.equal((await call("/api/sources/run", {key: admin, body: {id}})).status, 202);
      await until(async () => { const h = await health(id); return h.lastRun && h.lastRun !== before; });
      const h = await health(id);
      assert.equal(h.status, status, `${id}: ${h.error || ""} ${h.warnings}`);
      return h;
    }

    test.before(async () => {
      Object.assign(world, {gdacsDown: false, capEntries: ["1"], cap3Down: false, requests: []});   /* each storage back end starts from the same outside world */
      p = await startProcess(cfg, {net: createNet({fetchImpl: async (u, i) => fakeFetch(u, i), lookup})});
      if (name === "redis") await p.store.r.flushDb();
      base = "http://127.0.0.1:" + p.server.address().port;
      let out = "";
      await runCli(["keys:add", "opentracker", "Open Tracker team", "--admin"], p.store, {log: s => { out += s; }});
      admin = /(otk_[A-Za-z0-9_-]+)/.exec(out)[1];
    });
    test.after(async () => { await p.close(); fs.rmSync(DATA, {recursive: true, force: true}); fs.rmSync(PUB, {recursive: true, force: true}); });

    test("the source list is public and cacheable; details need an administrator", async () => {
      const r = await call("/api/sources");
      assert.equal(r.status, 200);
      assert.match(r.headers.get("cache-control"), /s-maxage=30/);
      assert.deepEqual(r.json.sources.map(s => [s.id, s.status]), [["open-meteo-forecast", "waiting"], ["open-meteo-baselines", "waiting"], ["open-meteo-rivers", "waiting"],
        ["gdacs", "waiting"], ["cap", "waiting"], ["satellite-scenes", "waiting"], ["weatherex", "waiting"]]);
      assert.ok(r.json.sources.every(s => s.credit && s.licence && s.link && !("error" in s)));
      assert.equal((await call("/api/sources/admin")).status, 401);
      assert.equal((await call("/api/sources/run", {key: admin, body: {id: "nope"}})).status, 404);
    });

    test("administrators manage official warning feeds; unsafe addresses are refused", async () => {
      const add = body => call("/api/cap-feeds", {key: admin, body});
      assert.equal((await add({add: {country: "NG", agency: "NiMet", url: "http://alerts.example.org/feed.xml"}})).status, 400);
      assert.match((await add({add: {country: "NG", agency: "NiMet", url: "https://intranet.example.org/feed.xml"}})).json.error, /public internet/);
      assert.equal((await add({add: {country: "Nigeria", agency: "NiMet", url: "https://alerts.example.org/feed.xml"}})).status, 400);
      const ok = await add({add: {country: "ng", agency: "NiMet", url: "https://alerts.example.org/feed.xml"}});
      assert.equal(ok.status, 200);
      assert.equal(ok.json.feed.id, "ng-nimet");
      assert.match((await add({add: {country: "NG", agency: "NiMet", url: "https://alerts.example.org/feed.xml"}})).json.error, /already listed/);
      assert.deepEqual((await call("/api/cap-feeds", {key: admin})).json.feeds.map(f => f.id), ["ng-nimet"]);
      assert.equal((await call("/api/cap-feeds")).status, 401);
    });

    test("every feed runs and fills the country summaries", async () => {
      assert.deepEqual((await call("/api/settings", {key: admin, body: {autoHeatAlerts: true}})).json, {approval: true, autoHeatAlerts: true});
      await run("open-meteo-baselines");
      for (const id of ["open-meteo-forecast", "open-meteo-rivers", "gdacs", "cap", "satellite-scenes", "weatherex"]) await run(id);
      await p.feeds.publish();
      const ng = (await call("/api/hazards/NG")).json;
      assert.deepEqual(ng.heat.map(h => h.n), ["Kano", "Abuja"]);   /* worst first, then by population */
      assert.equal(ng.heat[0].level, 3);                            /* wet-bulb 29 °C: dangerous for the body */
      assert.equal(ng.heat[0].local, true);                         /* judged against the place's own past */
      assert.equal(ng.rivers[0].trend, "rising fast");
      assert.deepEqual(ng.alerts.map(a => [a.agency, a.hazard]), [["NiMet", "heat"]]);
      assert.deepEqual(ng.disasters.map(d => d.id), ["gdacs-FL-1103999"]);
      assert.deepEqual(Object.keys(ng.scenes), ["gdacs-FL-1103999"]);
      assert.equal(ng.scenes["gdacs-FL-1103999"].length, 2);        /* one optical, one radar */
      assert.deepEqual(Object.keys(ng.models).sort(), ["p1", "p3"]);
      assert.deepEqual(ng.sources, ["open-meteo-forecast", "open-meteo-baselines", "open-meteo-rivers", "gdacs", "cap", "satellite-scenes", "weatherex"]);
      const world = (await call("/api/hazards/world")).json;
      assert.equal(world.countries.NG.heat, 3);
      assert.equal(world.countries.NG.heatAlerts, 1);
      assert.equal(world.countries.GH.heat, 3);
      const r = await call("/api/hazards/GH");
      assert.match(r.headers.get("cache-control"), /s-maxage=60/);
      assert.equal((await call("/api/hazards/ZZ")).status, 404);
      assert.equal((await call("/api/hazards/ng")).status, 404);
      assert.equal((await call("/api/hazards/..%2fsecret")).status, 404);
    });

    test("dangerous heat makes one alert per place and day, waiting for approval", async () => {
      const sent = (await call("/api/sent", {key: admin})).json;
      const heat = sent.notices.filter(n => n.agency === "opentracker-model");
      assert.equal(heat.length, 3);   /* Abuja, Accra, Kano */
      assert.ok(heat.every(n => n.status === "pending" && n.level === "watch" && n.km === 40 && /not an official warning/.test(n.msg)));
      await p.feeds.publish();        /* publishing again does not repeat them */
      assert.equal((await call("/api/sent", {key: admin})).json.notices.filter(n => n.agency === "opentracker-model").length, 3);
      assert.equal((await call("/api/notices")).json.notices.length, 0);   /* nothing public until approved */
    });

    test("administrators download every country's summary as one live data file", async () => {
      assert.equal((await call("/api/snapshot")).status, 401);
      const s = (await call("/api/snapshot", {key: admin})).json;
      assert.equal(s.app, "OpenTracker-snapshot");
      assert.deepEqual(Object.keys(s.countries).sort(), ["GH", "NG"]);
      assert.equal(s.countries.NG.heat[0].n, "Kano");
      assert.ok(s.world.countries.NG);
    });

    test("the browser is told where the 3D map comes from, and may load only that", async () => {
      const r = await call("/api/config");
      assert.deepEqual(r.json.map, {tiles: "https://tiles.openfreemap.org/planet", glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
        terrain: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"});
      const csp = r.headers.get("content-security-policy");
      assert.match(csp, /connect-src 'self' data: https:\/\/tiles\.openfreemap\.org https:\/\/s3\.amazonaws\.com;/);
      assert.match(csp, /script-src 'self';/);   /* scripts stay local */
    });

    test("a failing source keeps its last good data; cancellations remove warnings", async () => {
      world.gdacsDown = true;
      const h = await run("gdacs", "failing");
      assert.match(h.error, /500/);
      assert.equal(h.failures, 1);
      await p.feeds.publish();
      assert.equal((await call("/api/hazards/NG")).json.disasters.length, 1);
      await until(async () => (await call("/api/sources")).json.sources.find(s => s.id === "gdacs").status === "failing");   /* public list: cached for up to 5 s */
      world.gdacsDown = false;
      world.capEntries = ["1", "2"];
      await run("cap");
      await p.feeds.publish();
      assert.deepEqual((await p.feeds.hazards("NG")).alerts, []);
      await until(async () => (await call("/api/hazards/NG")).json.alerts.length === 0);   /* the API caches for up to 5 s */
      /* a warning that fails to download is fetched again on the next run */
      world.capEntries = ["1", "2", "3"]; world.cap3Down = true;
      assert.match((await run("cap", "partial")).warnings[0], /503/);
      world.cap3Down = false;
      await run("cap");
      await p.feeds.publish();
      assert.deepEqual((await p.feeds.hazards("NG")).alerts.map(a => [a.event, a.hazard]), [["Flash Flood Warning", "flood"]]);
      assert.equal((await call("/api/cap-feeds", {key: admin, body: {remove: "ng-nimet"}})).status, 200);
      assert.equal((await call("/api/cap-feeds", {key: admin, body: {remove: "ng-nimet"}})).status, 404);
    });
  });
}
