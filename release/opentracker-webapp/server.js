"use strict";
/* Open Tracker (Flood Tracker) web app server.

   node server.js                  start serving (see README for every setting)
   node server.js <command>        administration: keys and approval (node server.js help)

   Single server: files in DATA_DIR. Many servers: set REDIS_URL, then run as many copies as you need
   behind a load balancer and a CDN; WORKERS=auto uses every CPU core; ROLE=push runs a notification sender only. */
const http = require("node:http");
const cluster = require("node:cluster");
const fs = require("node:fs");
const path = require("node:path");
const {loadConfig} = require("./lib/config");
const {FileStore} = require("./lib/stores/file");
const {RedisStore} = require("./lib/stores/redis");
const {createApi} = require("./lib/api");
const {createPush, configureVapid} = require("./lib/push");
const {startWeather} = require("./lib/weather");
const {createFeeds} = require("./lib/feeds");
const {runCli} = require("./lib/cli");

async function openStore(cfg) {
  return cfg.redisUrl ? new RedisStore(cfg.redisUrl).init() : new FileStore(cfg.dataDir).init();
}

/* a JSON file written by tools/build.py into the public folder, or the fallback when it is missing */
function readPublic(cfg, name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(cfg.publicDir, name), "utf8")); }
  catch (e) { if (e.code === "ENOENT") return fallback; throw new Error(`${name} is not valid JSON: ${e.message}`); }
}

/* one complete server process: HTTP, notification sender, weather poller and data feeds, as the role asks.
   `net` replaces the outbound HTTP client (tests). */
async function startProcess(cfg, {listen = true, net} = {}) {
  const store = await openStore(cfg);
  const vapid = await store.vapid();
  configureVapid(cfg.vapidSubject, vapid);
  const push = createPush({store, cfg});
  const holder = `${process.pid}-${Date.now()}`;
  const weather = startWeather({key: cfg.role === "web" ? "" : cfg.weatherKey, zones: readPublic(cfg, "zones.json", {}), store, holder});
  const feeds = createFeeds({cfg, store, push, places: readPublic(cfg, "places.json", []), countries: readPublic(cfg, "countries.json", []), holder, ...(net ? {net} : {})});
  if (cfg.role !== "web") { push.start(); feeds.start(); }
  const server = http.createServer(createApi({cfg, store, push, weather, feeds, vapidPublicKey: vapid.publicKey}));
  server.headersTimeout = 15000;    /* slow or stalled clients can't hold connections open */
  server.requestTimeout = 60000;
  server.keepAliveTimeout = 65000;  /* longer than common load balancer idle timeouts */
  if (listen && cfg.role !== "push") await new Promise(r => server.listen(cfg.port, cfg.host, r));

  /* zero-downtime deploys: stop taking requests, finish the ones in flight, then exit */
  let closing = false;
  async function close() {
    if (closing) return; closing = true;
    push.stop(); weather.stop(); feeds.stop();
    await new Promise(r => server.close(() => r()));
    await store.close();
  }
  return {server, store, push, weather, feeds, close};
}

async function main() {
  const args = process.argv.slice(2);
  const cfg = loadConfig();
  if (args.length) {
    const store = await openStore(cfg);
    try { await runCli(args, store); } catch (e) { console.error(e.message); process.exitCode = 1; }
    await store.close();
    return;
  }
  if (cfg.workers > 1 && cluster.isPrimary) {
    let stopping = false;
    for (let i = 0; i < cfg.workers; i++) cluster.fork();
    cluster.on("exit", (w, code) => { if (!stopping && code !== 0) cluster.fork(); });   /* replace crashed workers */
    const stop = () => { stopping = true; for (const w of Object.values(cluster.workers)) w.process.kill("SIGTERM"); };
    process.on("SIGTERM", stop); process.on("SIGINT", stop);
    console.log(`Open Tracker: ${cfg.workers} workers on http://${cfg.host}:${cfg.port}`);
    return;
  }
  const p = await startProcess(cfg);
  const shutdown = () => p.close().then(() => process.exit(0), () => process.exit(1));
  process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
  if (!cluster.isWorker) console.log(`Open Tracker (${cfg.redisUrl ? "Redis" : "file"} storage, role ${cfg.role}) on http://${cfg.host}:${cfg.port}`);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = {startProcess};
