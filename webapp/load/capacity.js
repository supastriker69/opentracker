"use strict";
/* Turns a load-test report (load/loadtest.js) into the machines Open Tracker needs for a given number of people.
   Every assumption is named below; change them to plan for your own audience.

     node load/capacity.js report.json [--people 5e9]      prints a Markdown table (docs/SCALING.md) */
const fs = require("node:fs");

const ASSUME = {
  people: 5e9,
  surgeShare: 0.2,          /* a worldwide surge: one person in five opens Open Tracker in the same hour */
  requestsPerVisit: 7,      /* page, alerts, weather, the country's hazards, the world summary, published data, replays */
  cdnMissShare: 0.01,       /* sizing case: 1 % of public reads reach the servers (cache misses, purges, uncached variants) */
  cachedUrls: 258,          /* distinct public reads: 7 plus one hazards summary per country and territory */
  cacheSeconds: 30,         /* the shortest public cache time (alerts) */
  shieldRegions: 3,         /* CDN origin shields, one per region */
  followShare: 0.4,         /* people who turn alerts on */
  surgeFollowShare: 0.05,   /* of the surge hour's visitors, how many turn alerts on in that hour */
  redisMemoryOverhead: 1.5, /* fragmentation and replication buffers on top of the data */
  shardGB: 128,             /* memory of one subscription shard (a common managed-Redis size) */
  warningPhones: 1e8,       /* one warning to 100 million phones (a whole large country) ... */
  warningMinutes: 10,       /* ... delivered within 10 minutes */
  cpuTarget: 0.6,           /* run servers at 60 % CPU, leaving room for spikes and a lost zone */
};

const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + " billion" : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + " million" : Math.round(n).toLocaleString("en-US");

function plan(report, a = ASSUME) {
  const reads = report.reads.workers1.rps, subs = report.subscribe.rps, bytes = report.memory.bytesPerSubscription;
  const push = report.push.latencyBoundPerSec, target = report.push.targetPerSec;
  const visitsPerHour = a.people * a.surgeShare;
  const edgeRps = visitsPerHour * a.requestsPerVisit / 3600;
  const shieldRps = a.shieldRegions * a.cachedUrls / a.cacheSeconds;
  const originRps = Math.max(shieldRps, edgeRps * a.cdnMissShare);
  const readCores = Math.ceil(originRps / (reads * a.cpuTarget));
  const noCdnCores = Math.ceil(edgeRps / (reads * a.cpuTarget));
  const followers = a.people * a.followShare;
  const subGB = followers * bytes * a.redisMemoryOverhead / 2 ** 30;
  const shards = Math.max(1, Math.ceil(subGB / a.shardGB));
  const subRps = visitsPerHour * a.surgeFollowShare / 3600;
  const subCores = Math.ceil(subRps / (subs * a.cpuTarget));
  const pushRate = a.warningPhones / (a.warningMinutes * 60);
  const senders = Math.ceil(pushRate / (push * a.cpuTarget));
  const targetSec = a.warningPhones / (target * shards);
  return {
    assumptions: a, measured: {reads, subs, bytes, push, target},
    rows: [
      ["Peak hour", `${fmt(visitsPerHour)} visits (${a.surgeShare * 100} % of ${fmt(a.people)} people)`, `${fmt(edgeRps)} requests a second at the CDN edge`],
      ["Public reads reaching the servers", `${a.cdnMissShare * 100} % CDN misses (at least ${Math.round(shieldRps)} a second from the origin shields)`, `${fmt(originRps)} a second → **${readCores} web cores** (${fmt(reads)} a second per core measured, run at ${a.cpuTarget * 100} %). Without any CDN: ${fmt(noCdnCores)} cores`],
      ["Turning alerts on", `${a.surgeFollowShare * 100} % of the peak hour's visitors`, `${fmt(subRps)} a second → **${subCores} web cores** (${fmt(subs)} a second per core measured)`],
      ["Stored subscriptions", `${fmt(followers)} phones (${a.followShare * 100} % of people) × ${bytes} bytes measured × ${a.redisMemoryOverhead} overhead`, `${Math.round(subGB).toLocaleString("en-US")} GB → **${shards} subscription shards** of ${a.shardGB} GB (\`REDIS_SUB_URLS\`), each with a replica`],
      ["One warning to a whole large country", `${fmt(a.warningPhones)} phones in ${a.warningMinutes} minutes`, `${fmt(pushRate)} messages a second → **${senders} sender cores** (${fmt(push)} a second per core measured, encryption included). Finding the phones: ${Math.round(targetSec)} s across the shards`],
    ],
    totals: {webCores: readCores + subCores, senderCores: senders, shards},
  };
}

function markdown(p) {
  return ["| Load | Assumption | Needs |", "|---|---|---|", ...p.rows.map(r => `| ${r.join(" | ")} |`)].join("\n");
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node load/capacity.js report.json [--people N]"); process.exit(1); }
  const i = process.argv.indexOf("--people");
  const a = Object.assign({}, ASSUME, i > 0 ? {people: +process.argv[i + 1]} : {});
  if (!(a.people > 0)) { console.error("--people must be a positive number"); process.exit(1); }
  const p = plan(JSON.parse(fs.readFileSync(file, "utf8")), a);
  console.log(markdown(p));
  console.log(`\nIn all: ${p.totals.webCores} web cores, ${p.totals.senderCores} sender cores and ${p.totals.shards} subscription shards (plus replicas), spread over at least three regions.`);
}
module.exports = {plan, markdown, ASSUME};
