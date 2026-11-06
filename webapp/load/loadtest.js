"use strict";
/* Load test: what one Open Tracker server and one notification sender can do, measured on this machine with Redis.
   docs/SCALING.md turns these figures into the machines needed for 5 billion people (load/capacity.js).

     REDIS_URL=redis://127.0.0.1:6379/14 node load/loadtest.js [--seconds 10] [--out report.json] [--check]

   1. Public reads: the requests a visit makes (alerts, weather, a country's hazards, published data, replays, the page),
      with one worker process and then one per core. Requests per second, p50/p95/p99 time, errors.
   2. Turning alerts on (writes): every request from a different person (X-Forwarded-For, as behind a CDN).
   3. Notification fan-out: real subscriptions in Redis are targeted (streamed in chunks) and every message is fully
      encrypted as web-push does (the CPU cost is real); only the call to the push service is replaced by an 80 ms wait.
   4. Memory per subscription in Redis.
   --check fails when a result misses THRESHOLDS (set well below this machine's figures, for slower CI machines).
   The database in REDIS_URL is emptied: use a spare one. */
const http = require("node:http");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {spawn} = require("node:child_process");
const webpush = require("web-push");

const ROOT = path.join(__dirname, "..");
const THRESHOLDS = {readsRps1: 1500, readsP99Ms: 250, subscribeRps: 300, pushEncryptPerSec: 150, pushLatencyBoundPerSec: 250, targetPerSec: 20000, errors: 0};

const arg = (name, dflt) => { const i = process.argv.indexOf("--" + name); return i < 0 ? dflt : process.argv[i + 1]; };
const flag = name => process.argv.includes("--" + name);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p / 100 * sorted.length))] : 0;

/* ---------- a closed-loop load generator: `conns` keep-alive connections, each sending its next request when the last ends ---------- */
async function hammer({port, conns, seconds, next}) {
  const agent = new http.Agent({keepAlive: true, maxSockets: conns});
  const times = [], statuses = {};
  let errors = 0;
  const end = Date.now() + seconds * 1000;
  const one = () => new Promise(resolve => {
    const {method = "GET", path: p, headers = {}, body} = next();
    const t0 = process.hrtime.bigint();
    const req = http.request({host: "127.0.0.1", port, method, path: p, agent, headers: Object.assign(body ? {"Content-Type": "application/json", "Content-Length": Buffer.byteLength(body)} : {}, headers)}, res => {
      res.on("data", () => {});
      res.on("end", () => {
        times.push(Number(process.hrtime.bigint() - t0) / 1e6);
        statuses[res.statusCode] = (statuses[res.statusCode] || 0) + 1;
        if (res.statusCode >= 400) errors++;
        resolve();
      });
    });
    req.on("error", () => { errors++; resolve(); });
    if (body) req.write(body);
    req.end();
  });
  const t0 = Date.now();
  await Promise.all(Array.from({length: conns}, async () => { while (Date.now() < end) await one(); }));
  const elapsed = (Date.now() - t0) / 1000;
  agent.destroy();
  times.sort((a, b) => a - b);
  return {requests: times.length, rps: Math.round(times.length / elapsed), p50: +pct(times, 50).toFixed(1), p95: +pct(times, 95).toFixed(1), p99: +pct(times, 99).toFixed(1), errors, statuses};
}

/* ---------- the real server, as its own processes ---------- */
async function startServer(env) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {env: Object.assign({}, process.env, env, {PORT: String(port)}), stdio: ["ignore", "ignore", "pipe"]});
  let stderr = "";
  child.stderr.on("data", d => { stderr += d; });
  for (let i = 0; i < 200; i++) {
    const ok = await new Promise(r => http.get({host: "127.0.0.1", port, path: "/readyz"}, res => { res.resume(); r(res.statusCode === 200); }).on("error", () => r(false)));
    if (ok) return {port, stop: () => new Promise(r => { child.once("exit", r); child.kill("SIGTERM"); })};
    if (child.exitCode !== null) break;
    await sleep(100);
  }
  child.kill("SIGKILL");
  throw new Error("the server did not start:\n" + stderr.slice(-2000));
}

function browserKeys() {
  const ecdh = crypto.createECDH("prime256v1"); ecdh.generateKeys();
  return {p256dh: ecdh.getPublicKey().toString("base64url"), auth: crypto.randomBytes(16).toString("base64url")};
}

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("set REDIS_URL to a spare Redis database (it is emptied), e.g. redis://127.0.0.1:6379/14");
  const seconds = +arg("seconds", 10);
  const publicDir = arg("public", path.join(ROOT, "..", "dist", "opentracker-webapp", "public"));
  if (!fs.existsSync(path.join(publicDir, "index.html"))) throw new Error("build the app first (python3 tools/build.py), or pass --public <folder>");
  const {RedisStore} = require("../lib/stores/redis");
  const {createPush} = require("../lib/push");
  const store = await new RedisStore(redisUrl, {info() {}, warn() {}, error() {}}).init();
  await store.r.flushDb();
  const cores = os.availableParallelism();
  const report = {machine: {cores, cpu: os.cpus()[0].model, node: process.version, memoryGB: Math.round(os.totalmem() / 2 ** 30)}, seconds, thresholds: THRESHOLDS};
  const env = {REDIS_URL: redisUrl, PUBLIC_DIR: publicDir, DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), "ot-load-")), ROLE: "web", TRUST_PROXY: "1",
    FEEDS_OFF: "all", LOG_LEVEL: "error", VAPID_SUBJECT: "mailto:load@example.org"};

  /* something to read: published notices and data, as on a real day */
  const now = Date.now();
  for (let i = 0; i < 50; i++) {
    await store.putNotice({id: "n" + i, level: i % 5 ? "watch" : "warning", c: i % 2 ? "GH" : "NG", areas: [], ll: null, km: 0, title: "Heavy rain " + i, msg: "Stay away from drains and rivers.",
      agency: "nadmo", agencyName: "NADMO", at: new Date(now - i * 60e3).toISOString(), expires: new Date(now + 86400e3).toISOString(), status: "live"});
  }
  const visit = [["/api/notices", 3], ["/api/weather", 2], ["/api/hazards/GH", 2], ["/api/hazards/world", 1], ["/api/data", 1], ["/api/replays", 1], ["/", 1], ["/healthz", 1]];
  const bag = visit.flatMap(([p, w]) => Array(w).fill(p));
  let k = 0;
  const reads = () => ({path: bag[k++ % bag.length]});

  /* 1. reads, one worker then every core (the load generator shares this machine's cores) */
  report.reads = {};
  for (const workers of [...new Set([1, cores])]) {
    const s = await startServer(Object.assign({}, env, {WORKERS: String(workers)}));
    await hammer({port: s.port, conns: 32, seconds: 2, next: reads});   /* warm up */
    report.reads["workers" + workers] = await hammer({port: s.port, conns: 64, seconds, next: reads});
    await s.stop();
    console.log(`reads, ${workers} worker(s):`, JSON.stringify(report.reads["workers" + workers]));
  }

  /* 2. turning alerts on: a different person and phone every time */
  {
    const s = await startServer(Object.assign({}, env, {WORKERS: "1"}));
    const keys = browserKeys();
    let n = 0;
    const subscribe = () => {
      n++;
      return {method: "POST", path: "/api/subscribe", headers: {"X-Forwarded-For": `10.${n >> 16 & 255}.${n >> 8 & 255}.${n & 255}`},
        body: JSON.stringify({subscription: {endpoint: "https://push.example.org/load/" + n, keys}, countries: ["GH"], areas: ["GH-AA"], whole: [], points: [[-0.2 + (n % 100) / 1e4, 5.6]]})};
    };
    report.subscribe = await hammer({port: s.port, conns: 32, seconds: Math.max(3, seconds / 2), next: subscribe});
    await s.stop();
    console.log("turn alerts on:", JSON.stringify(report.subscribe));
  }

  /* 4. memory per subscription (measured on the subscriptions just written) */
  {
    const subs = await store.r.hLen("ot:sub");
    const used = +(/used_memory:(\d+)/.exec(await store.r.info("memory"))[1]);
    await store.r.flushDb();
    const empty = +(/used_memory:(\d+)/.exec(await store.r.info("memory"))[1]);
    report.memory = {subscriptions: subs, bytesPerSubscription: Math.round((used - empty) / Math.max(1, subs))};
    console.log("memory:", JSON.stringify(report.memory));
  }

  /* 3. notification fan-out: target real subscriptions, encrypt every message for real */
  {
    const N = +arg("phones", 20000);
    const keys = browserKeys();
    const vapid = webpush.generateVAPIDKeys();
    webpush.setVapidDetails("mailto:load@example.org", vapid.publicKey, vapid.privateKey);
    for (let i = 0; i < N; i += 1000) {
      await Promise.all(Array.from({length: Math.min(1000, N - i)}, (_, j) => store.putSub("p" + (i + j),
        {subscription: {endpoint: "https://push.example.org/fan/" + (i + j), keys}, countries: ["NG"], whole: (i + j) % 2 ? ["NG"] : [], areas: ["NG-LA"], points: [], updated: now})));
    }
    const notice = {id: "fan", level: "warning", c: "NG", areas: [], ll: null, km: 0, title: "Flood warning", msg: "Move to higher ground.", agency: "nihsa", agencyName: "NIHSA",
      at: new Date().toISOString(), expires: new Date(now + 86400e3).toISOString(), status: "live"};
    await store.putNotice(notice);
    let latency = 0, sent = 0;
    const real = webpush.sendNotification;
    webpush.sendNotification = async (sub, payload, opts) => {
      webpush.generateRequestDetails(sub, payload, Object.assign({}, opts, {vapidDetails: {subject: "mailto:load@example.org", publicKey: vapid.publicKey, privateKey: vapid.privateKey}}));
      if (latency) await sleep(latency);
      sent++;
      return {statusCode: 201};
    };
    const cfg = require("../lib/config").loadConfig(process.env);   /* the sender as configured: batches and messages in flight */
    const push = createPush({store, cfg, log: {error() {}}});
    const drain = async () => { for (let job = await store.popJob(1); job; job = await store.popJob(1)) await push.deliver(job); };

    let t = Date.now();
    const {targeted} = await push.enqueue(notice);
    const targetSec = (Date.now() - t) / 1000;
    t = Date.now(); sent = 0; latency = 0;
    await drain();
    const cpuSec = (Date.now() - t) / 1000;
    const cpuSent = sent;
    await push.enqueue(notice);
    t = Date.now(); sent = 0; latency = 80;
    await drain();
    const latSec = (Date.now() - t) / 1000;
    webpush.sendNotification = real;
    report.push = {phones: N, targeted, targetPerSec: Math.round(targeted / targetSec), encryptPerSec: Math.round(cpuSent / cpuSec),
      latencyBoundPerSec: Math.round(sent / latSec), concurrency: cfg.pushConcurrency, simulatedLatencyMs: 80};
    console.log("notification fan-out:", JSON.stringify(report.push));
  }
  await store.r.flushDb();
  await store.close();

  const r1 = report.reads.workers1;
  const checks = {
    readsRps1: [r1.rps, r1.rps >= THRESHOLDS.readsRps1],
    readsP99Ms: [r1.p99, r1.p99 <= THRESHOLDS.readsP99Ms],
    subscribeRps: [report.subscribe.rps, report.subscribe.rps >= THRESHOLDS.subscribeRps],
    pushEncryptPerSec: [report.push.encryptPerSec, report.push.encryptPerSec >= THRESHOLDS.pushEncryptPerSec],
    pushLatencyBoundPerSec: [report.push.latencyBoundPerSec, report.push.latencyBoundPerSec >= THRESHOLDS.pushLatencyBoundPerSec],
    targetPerSec: [report.push.targetPerSec, report.push.targetPerSec >= THRESHOLDS.targetPerSec],
    errors: [Object.values(report.reads).reduce((a, r) => a + r.errors, 0) + report.subscribe.errors, Object.values(report.reads).every(r => !r.errors) && !report.subscribe.errors],
    allTargeted: [report.push.targeted, report.push.targeted === report.push.phones],
  };
  report.checks = Object.fromEntries(Object.entries(checks).map(([k2, [v, ok]]) => [k2, {value: v, ok}]));
  const out = arg("out");
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 1) + "\n");
  const failed = Object.entries(report.checks).filter(([, c]) => !c.ok);
  failed.forEach(([k2, c]) => console.log(`FAIL ${k2}: ${c.value} (threshold ${THRESHOLDS[k2] ?? "all"})`));
  if (flag("check") && failed.length) process.exitCode = 1;
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exitCode = 1; });
module.exports = {hammer, THRESHOLDS};
