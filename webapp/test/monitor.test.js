"use strict";
/* Monitoring: structured logs, metric totals across processes, the watchdog's alerts, and the HTTP endpoints
   (/metrics with its token, /readyz/feeds), against each storage back end. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {createLog} = require("../lib/log");
const {createMetrics, renderMetrics} = require("../lib/metrics");
const {createMonitor, staleFeeds, staleAfter} = require("../lib/monitor");
const {FileStore} = require("../lib/stores/file");
const {RedisStore} = require("../lib/stores/redis");
const {loadConfig} = require("../lib/config");
const {startProcess} = require("../server");
const {redisDb} = require("./redis-db");

const MIN = 60e3;
const quiet = {debug() {}, info() {}, warn() {}, error() {}, log() {}};

test("logs are one JSON object per line with fields, levels and error stacks", () => {
  const lines = [];
  const log = createLog({level: "info", write: l => lines.push(JSON.parse(l)), now: () => new Date("2026-11-06T03:00:00Z"), pid: 7});
  log.debug("hidden");
  log.info("feed ran", {feed: "gdacs", t: "cannot overwrite"});
  log.error("feed gdacs:", "the server answered 500");
  log.error("request failed", new Error("boom"), {route: "GET /api/notices"});
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0], {feed: "gdacs", t: "2026-11-06T03:00:00.000Z", level: "info", msg: "feed ran", pid: 7});
  assert.equal(lines[1].msg, "feed gdacs: the server answered 500");
  assert.equal(lines[2].msg, "request failed boom");
  assert.equal(lines[2].route, "GET /api/notices");
  assert.match(lines[2].stack, /Error: boom/);
  assert.throws(() => createLog({level: "loud"}), /LOG_LEVEL/);
});

test("metrics: counters and histograms add up across processes and render as Prometheus text", async () => {
  const store = await new FileStore(fs.mkdtempSync(path.join(os.tmpdir(), "ot-metrics-"))).init();
  const a = createMetrics({store, log: quiet}), b = createMetrics({store, log: quiet});
  a.inc("opentracker_push_sent_total", {result: "ok"}, 3);
  b.inc("opentracker_push_sent_total", {result: "ok"}, 2);
  a.observe("opentracker_http_request_duration_seconds", {route: "GET /api/notices"}, 0.02);
  a.observe("opentracker_http_request_duration_seconds", {route: "GET /api/notices"}, 3);
  await a.flush();
  const t = await b.totals();   /* b has not flushed: its own counts are added on top */
  assert.equal(t['opentracker_push_sent_total{result="ok"}'], 5);
  const text = renderMetrics(t, [{name: "opentracker_subscribers", value: 12}], {opentracker_subscribers: "Phones subscribed"});
  assert.match(text, /# TYPE opentracker_push_sent_total counter\nopentracker_push_sent_total\{result="ok"\} 5\n/);
  assert.match(text, /# TYPE opentracker_http_request_duration_seconds histogram/);
  const buckets = text.split("\n").filter(l => l.startsWith("opentracker_http_request_duration_seconds_bucket"));
  assert.equal(buckets.length, 12);
  assert.match(buckets[0], /le="0.005"\} 0$/);
  assert.match(buckets.find(l => l.includes('le="0.025"')), / 1$/);
  assert.match(buckets.find(l => l.includes('le="+Inf"')), / 2$/);
  assert.ok(buckets.findIndex(l => l.includes('le="+Inf"')) === buckets.length - 1, "+Inf comes last");
  assert.match(text, /# HELP opentracker_subscribers Phones subscribed\n# TYPE opentracker_subscribers gauge\nopentracker_subscribers 12\n/);
  assert.throws(() => a.inc("bad name"), /bad metric name/);
});

test("a feed counts as stopped after missing two runs (at least 15 minutes), judged from start-up if it never ran", () => {
  assert.equal(staleAfter(2 * MIN), 17 * MIN);
  assert.equal(staleAfter(6 * 60 * MIN), 12 * 60 * MIN);
  const t0 = Date.parse("2026-11-06T00:00:00Z");
  const sources = [
    {id: "gdacs", name: "GDACS", enabled: true, lastOk: new Date(t0 - 30 * MIN).toISOString()},
    {id: "cap", name: "Official warnings (CAP)", enabled: true, lastOk: new Date(t0 - 5 * MIN).toISOString()},
    {id: "weatherex", name: "WeatherEx", enabled: false, lastOk: null},
    {id: "satellite-scenes", name: "Sentinel", enabled: true, lastOk: null}
  ];
  const every = {gdacs: 10 * MIN, cap: 2 * MIN, "satellite-scenes": 6 * 60 * MIN};
  assert.deepEqual(staleFeeds(sources, every, t0, t0 - 60 * MIN).map(f => f.id), ["gdacs"]);
  assert.deepEqual(staleFeeds(sources, every, t0, t0 - 13 * 60 * MIN).map(f => f.id), ["gdacs", "satellite-scenes"]);
});

/* a fake data-feed service whose health the test sets */
function fakeFeeds(state) {
  return {schedule: () => ({gdacs: 10 * MIN, cap: 2 * MIN}), sources: async () => state.sources};
}

const backends = [["file", () => new FileStore(fs.mkdtempSync(path.join(os.tmpdir(), "ot-mon-"))).init()]];
if (process.env.TEST_REDIS_URL) backends.push(["redis", async () => { const s = await new RedisStore(redisDb(9), quiet).init(); await s.r.flushDb(); return s; }]);

for (const [name, open] of backends) {
  test(`watchdog with ${name} storage: raises each problem once, then says when it is resolved`, async () => {
    const store = await open();
    let clock = Date.parse("2026-11-06T00:00:00Z");
    const posts = [], logs = [];
    const log = Object.assign({}, quiet, {error: (m, f) => logs.push(["error", m, f]), info: (m, f) => logs.push(["info", m, f])});
    const state = {sources: [{id: "gdacs", name: "GDACS", enabled: true, lastOk: new Date(clock).toISOString(), error: null},
      {id: "cap", name: "Official warnings (CAP)", enabled: true, lastOk: new Date(clock).toISOString(), error: null}]};
    const cfg = {alertWebhook: "https://hooks.example.org/T000/B000", alertName: "Open Tracker test", maxNotices: 300};
    const metrics = createMetrics({store, log: quiet});
    const mon = createMonitor({cfg, store, feeds: fakeFeeds(state), metrics, log, now: () => clock, post: async (url, body) => posts.push({url, body}), holder: "test"});
    try {
      assert.deepEqual(await mon.check(), {});
      assert.equal(posts.length, 0);

      clock += 30 * MIN;   /* GDACS stopped 30 minutes ago with an error; CAP keeps running */
      state.sources[0].error = "the server answered 500";
      state.sources[1].lastOk = new Date(clock).toISOString();
      const open1 = await mon.check();
      assert.deepEqual(Object.keys(open1), ["feed:gdacs"]);
      assert.equal(posts.length, 1);
      assert.equal(posts[0].url, cfg.alertWebhook);
      assert.match(posts[0].body.text, /^\[Open Tracker test\] Data feed "GDACS" has stopped: no good run for 30 minutes \(last error: the server answered 500\)\.$/);
      assert.equal(posts[0].body.content, posts[0].body.text, "Discord reads content, Slack reads text");
      assert.equal(posts[0].body.resolved, false);

      clock += MIN;   /* still stopped: no second alert */
      await mon.check();
      assert.equal(posts.length, 1);

      /* a notice waiting 20 minutes for approval */
      await store.putNotice({id: "n1", title: "Evacuate Odaw banks", msg: "Move now.", status: "pending", at: new Date(clock - 20 * MIN).toISOString(), level: "warning", c: "GH", areas: []});
      await mon.check();
      assert.equal(posts.length, 2);
      assert.match(posts[1].body.text, /1 agency notice has waited over 15 minutes for approval: "Evacuate Odaw banks"\./);

      /* phone alerts failing: 20 of 200 */
      metrics.inc("opentracker_push_sent_total", {result: "ok"}, 180);
      metrics.inc("opentracker_push_sent_total", {result: "failed"}, 20);
      await mon.check();
      assert.equal(posts.length, 3);
      assert.match(posts[2].body.text, /10% of phone alerts failed in the last check \(20 of 200\)\./);

      /* everything recovers */
      clock += MIN;
      state.sources[0].lastOk = new Date(clock).toISOString(); state.sources[0].error = null;
      await store.putNotice({id: "n1", title: "Evacuate Odaw banks", msg: "Move now.", status: "live", at: new Date(clock - 20 * MIN).toISOString(), level: "warning", c: "GH", areas: []});
      metrics.inc("opentracker_push_sent_total", {result: "ok"}, 200);
      assert.deepEqual(await mon.check(), {});
      const resolved = posts.slice(3).map(p => p.body);
      assert.equal(resolved.length, 3);
      assert.ok(resolved.every(b => b.resolved && /^\[Open Tracker test\] Resolved: /.test(b.text)));
      assert.deepEqual(resolved.map(b => b.problem).sort(), ["approval", "feed:gdacs", "push-failing"]);
      assert.equal(logs.filter(l => l[0] === "error").length, 3, "each problem logged once as an error");

      const totals = await metrics.totals();
      assert.equal(totals['opentracker_alerts_total{kind="feed"}'], 1);

      /* the webhook being down never stops the checks */
      clock += 30 * MIN; state.sources[1].lastOk = new Date(clock - 30 * MIN).toISOString();
      const broken = createMonitor({cfg, store, feeds: fakeFeeds(state), metrics, log, now: () => clock, post: async () => { throw new Error("webhook answered 502"); }, holder: "test"});
      assert.deepEqual(Object.keys(await broken.check()).sort(), ["feed:cap", "feed:gdacs"]);
      assert.ok(logs.some(l => l[1] === "alert webhook failed" && l[2].error === "webhook answered 502"));
    } finally { await store.close(); }
  });
}

test("HTTP: /metrics needs its token, /readyz/feeds reports stopped feeds", async () => {
  const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "ot-mon-http-")), PUB = fs.mkdtempSync(path.join(os.tmpdir(), "ot-mon-pub-"));
  fs.writeFileSync(path.join(PUB, "index.html"), "<!doctype html><title>Open Tracker</title>");
  const token = "a".repeat(20) + "0123456789abcdef";
  assert.throws(() => loadConfig({METRICS_TOKEN: "short"}), /METRICS_TOKEN/);
  assert.throws(() => loadConfig({ALERT_WEBHOOK_URL: "http://hooks.example.org/x"}), /https/);
  const cfg = loadConfig({DATA_DIR: DATA, PUBLIC_DIR: PUB, PORT: "0", FEEDS_OFF: "all", METRICS_TOKEN: token});
  const p = await startProcess(cfg, {log: quiet});
  const base = "http://127.0.0.1:" + p.server.address().port;
  try {
    await fetch(base + "/api/notices"); await fetch(base + "/no-such-page"); await fetch(base + "/api/nothing");
    assert.equal((await fetch(base + "/metrics")).status, 401);
    assert.equal((await fetch(base + "/metrics", {headers: {Authorization: "Bearer " + "b".repeat(36)}})).status, 401);
    const r = await fetch(base + "/metrics", {headers: {Authorization: "Bearer " + token}});
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /^text\/plain; version=0\.0\.4/);
    const text = await r.text();
    assert.match(text, /opentracker_http_requests_total\{route="GET \/api\/notices",status="2xx"\} 1/);
    assert.match(text, /opentracker_http_requests_total\{route="static",status="[24]xx"\} 1/);
    assert.match(text, /opentracker_http_requests_total\{route="other",status="4xx"\} 1/);
    assert.match(text, /opentracker_push_queue_batches 0/);
    assert.match(text, /opentracker_subscribers 0/);
    const ready = await fetch(base + "/readyz/feeds");
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), {ok: true});
  } finally { await p.close(); }
  const off = await startProcess(loadConfig({DATA_DIR: DATA, PUBLIC_DIR: PUB, PORT: "0", FEEDS_OFF: "all"}), {log: quiet});
  try { assert.equal((await fetch("http://127.0.0.1:" + off.server.address().port + "/metrics")).status, 404, "no token set: /metrics is off"); }
  finally { await off.close(); fs.rmSync(DATA, {recursive: true, force: true}); fs.rmSync(PUB, {recursive: true, force: true}); }
});
