"use strict";
/* The load-test tools: the generator counts what really happened, and the capacity plan's arithmetic. */
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const {hammer} = require("../load/loadtest");
const {plan, markdown, ASSUME} = require("../load/capacity");

test("the load generator counts requests, failures and times", async () => {
  let n = 0;
  const server = http.createServer((req, res) => { n++; res.statusCode = req.url === "/bad" ? 503 : 200; res.end("ok"); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const {port} = server.address();
  let k = 0;
  const r = await hammer({port, conns: 4, seconds: 0.5, next: () => ({path: k++ % 4 === 3 ? "/bad" : "/"})});
  server.close();
  assert.equal(r.requests, n, "every request answered is counted");
  assert.ok(r.requests > 50 && r.rps > 0);
  assert.equal(r.errors, r.statuses[503]);
  assert.ok(Math.abs(r.errors / r.requests - 0.25) < 0.05);
  assert.ok(r.p50 <= r.p95 && r.p95 <= r.p99);
});

test("the capacity plan follows from the measurements", () => {
  const report = {reads: {workers1: {rps: 10000}}, subscribe: {rps: 5000}, memory: {bytesPerSubscription: 1000}, push: {latencyBoundPerSec: 1000, targetPerSec: 100000}};
  const p = plan(report, Object.assign({}, ASSUME, {people: 1e9}));
  /* 1e9 × 20 % = 2e8 visits an hour × 7 requests ÷ 3600 s = 388,889 a second; 1 % misses = 3,889 ÷ (10,000 × 60 %) → 1 core */
  assert.equal(p.totals.webCores, 1 + 1);
  /* 4e8 phones × 1,000 bytes × 1.5 = 559 GB → 5 shards of 128 GB */
  assert.equal(p.totals.shards, 5);
  /* 1e8 phones in 600 s = 166,667 a second ÷ (1,000 × 60 %) → 278 cores */
  assert.equal(p.totals.senderCores, 278);
  const md = markdown(p);
  assert.match(md, /^\| Load \| Assumption \| Needs \|/);
  assert.equal(md.split("\n").length, 2 + p.rows.length);
  assert.ok(plan(report).totals.shards > p.totals.shards, "more people need more shards");
});
