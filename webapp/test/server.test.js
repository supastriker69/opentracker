"use strict";
/* Runs the real server (HTTP, queue, sender) against each storage back end.
   File storage always; Redis too when TEST_REDIS_URL is set (e.g. redis://127.0.0.1:6390/15).
   Phone delivery is captured by replacing web-push's network call. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const webpush = require("web-push");
const {loadConfig} = require("../lib/config");
const {startProcess} = require("../server");
const {runCli} = require("../lib/cli");

const delivered = [];
let goneNext = 0;
webpush.sendNotification = async (sub, payload) => {
  if (goneNext) { goneNext--; const e = new Error("gone"); e.statusCode = 410; throw e; }
  delivered.push({endpoint: sub.endpoint, payload: JSON.parse(payload)});
  return {statusCode: 201};
};
const subscription = n => ({endpoint: "https://push.example.org/send/" + n, keys: {p256dh: "BEl62iUYgUivxIkv69yViEuiBIa", auth: "8eDyX_uCN0XRhSFJ"}});
const until = async (cond, ms = 4000) => { const t = Date.now(); while (!(await cond())) { if (Date.now() - t > ms) throw new Error("timed out"); await new Promise(r => setTimeout(r, 25)); } };

const backends = [["file", {}]];
if (process.env.TEST_REDIS_URL) backends.push(["redis", {REDIS_URL: process.env.TEST_REDIS_URL}]);

for (const [name, extraEnv] of backends) {
  test.describe(`server with ${name} storage`, () => {
    const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "ot-test-"));
    const PUB = fs.mkdtempSync(path.join(os.tmpdir(), "ot-pub-"));
    fs.writeFileSync(path.join(PUB, "index.html"), "<!doctype html><title>Open Tracker</title>");
    const cfg = loadConfig(Object.assign({DATA_DIR: DATA, PUBLIC_DIR: PUB, PORT: "0", FEEDS_OFF: "all"}, extraEnv));   /* data feeds: feeds.test.js */
    let p, base;
    const keys = {};
    const cli = async (...a) => { let out = ""; await runCli(a, p.store, {log: s => { out += s; }}); return out; };

    test.before(async () => {
      delivered.length = 0;   /* each storage back end starts with a clean record */
      p = await startProcess(cfg);
      if (name === "redis") await p.store.r.flushDb();
      base = "http://127.0.0.1:" + p.server.address().port;
      const key = out => /(otk_[A-Za-z0-9_-]+)/.exec(out)[1], kid = out => /Key ([0-9a-f]{8})/.exec(out)[1];
      keys.admin = key(await cli("keys:add", "opentracker", "Open Tracker team", "--admin"));
      const o = await cli("keys:add", "nadmo", "NADMO"); keys.nadmo = key(o); keys.nadmoId = kid(o);
      keys.moi = key(await cli("keys:add", "moi-gh", "Ministry of the Interior (Ghana)"));
    });
    test.after(async () => { await p.close(); fs.rmSync(DATA, {recursive: true, force: true}); fs.rmSync(PUB, {recursive: true, force: true}); });

    const call = async (u, {key, body, origin, headers = {}} = {}) => {
      const h = Object.assign({}, headers);
      if (key) h.Authorization = "Bearer " + key;
      if (body !== undefined) h["Content-Type"] = "application/json";
      if (origin) h.Origin = origin;
      const r = await fetch(base + u, {method: body === undefined ? "GET" : "POST", headers: h, body: body === undefined ? undefined : JSON.stringify(body)});
      return {status: r.status, headers: r.headers, json: await r.json().catch(() => null)};
    };
    const deliveredTo = n => delivered.filter(d => d.endpoint.endsWith("/" + n)).length;

    test("health, security headers, static files, caching", async () => {
      assert.equal((await call("/healthz")).status, 200);
      assert.equal((await call("/readyz")).status, 200);
      const r = await fetch(base + "/");
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-security-policy"), /script-src 'self'/);
      assert.equal(r.headers.get("cache-control"), "no-cache");
      assert.equal((await fetch(base + "/../server.js")).status, 404);
      assert.equal((await fetch(base + "/%2e%2e/server.js")).status, 404);
      const n = await call("/api/notices");
      assert.match(n.headers.get("cache-control"), /s-maxage=30/);
      assert.equal((await call("/api/notices", {headers: {"If-None-Match": n.headers.get("etag")}})).status, 304);
    });

    test("subscribe, target, approve, deliver, withdraw", async () => {
      assert.equal((await call("/api/subscribe", {body: {subscription: subscription("accra"), countries: ["GH"], areas: ["GH-AA"], points: [[-0.25, 5.57]]}})).status, 200);
      assert.equal((await call("/api/subscribe", {body: {subscription: subscription("lagos"), countries: ["NG"], areas: ["NG-LA"]}})).status, 200);
      assert.equal((await call("/api/subscribe", {body: {subscription: subscription("near"), countries: ["GH"], points: [[-0.24, 5.58]]}})).status, 200);
      assert.equal((await call("/api/subscribe", {body: {subscription: subscription("x")}, origin: "https://evil.example"})).status, 403);
      assert.equal((await call("/api/notify", {body: {title: "t", msg: "m", c: "GH"}})).status, 401);

      const p1 = await call("/api/notify", {key: keys.nadmo, body: {level: "warning", title: "Odaw overflowing", msg: "Move away from the drains", c: "GH", areas: ["GH-AA"]}});
      assert.equal(p1.status, 202); assert.equal(p1.json.pending, true);
      assert.equal((await call("/api/notices")).json.notices.length, 0, "pending notices are not public");
      assert.equal((await call("/api/decide", {key: keys.nadmo, body: {id: p1.json.id, ok: true}})).status, 403, "agencies can't approve");
      const d = await call("/api/decide", {key: keys.admin, body: {id: p1.json.id, ok: true}});
      assert.equal(d.json.targeted, 1);
      await until(() => deliveredTo("accra") === 1);
      assert.equal(deliveredTo("lagos"), 0); assert.equal(deliveredTo("near"), 0);
      assert.match(delivered.at(-1).payload.body, /NADMO/);

      const spot = await call("/api/notify", {key: keys.admin, body: {title: "Bridge closed", msg: "Avoid Kaneshie bridge", c: "GH", areas: ["GH-CP"], ll: [-0.243, 5.572], km: 3}});
      assert.equal(spot.json.targeted, 2, "both followers near the spot");
      await until(() => deliveredTo("near") === 1);

      const r = await call("/api/notify", {key: keys.moi, body: {title: "Test", msg: "Ignore", c: "GH"}});
      await call("/api/decide", {key: keys.admin, body: {id: r.json.id, ok: false, note: "Duplicate"}});
      const mine = await call("/api/sent", {key: keys.moi});
      assert.equal(mine.json.notices[0].status, "rejected"); assert.equal(mine.json.notices[0].note, "Duplicate");
      assert.equal(mine.json.notices.some(n => n.agency === "nadmo"), false, "agencies see only their own");

      await cli("keys:trust", keys.nadmoId);
      const t = await call("/api/notify", {key: keys.nadmo, body: {title: "Lagos too", msg: "m", c: "ALL", areas: ["NG-LA"]}});
      assert.equal(t.status, 200); assert.equal(t.json.targeted, 1);
      await until(() => deliveredTo("lagos") === 1);
      assert.equal((await call("/api/withdraw", {key: keys.moi, body: {id: t.json.id}})).status, 403);
      assert.equal((await call("/api/withdraw", {key: keys.nadmo, body: {id: t.json.id}})).status, 200);
      assert.equal((await call("/api/notices")).json.notices.some(n => n.id === t.json.id), false);

      assert.equal((await call("/api/settings", {key: keys.nadmo, body: {approval: false}})).status, 403);
      await call("/api/settings", {key: keys.admin, body: {approval: false}});
      const m = await call("/api/notify", {key: keys.moi, body: {title: "Curfew lifted", msg: "Roads reopened", c: "GH"}});
      assert.equal(m.status, 200); assert.equal(m.json.targeted, 2);

      await until(async () => (await p.store.getNotice(m.json.id))?.delivery?.sent === 2);   /* let earlier sends finish first */
      goneNext = 1;
      const before = (await p.store.subStats()).subscribers;
      await call("/api/notify", {key: keys.moi, body: {title: "x", msg: "y", c: "NG"}});
      await until(async () => (await p.store.subStats()).subscribers === before - 1);
      const sent = await call("/api/sent", {key: keys.admin});
      assert.ok(sent.json.notices.some(n => n.delivery && n.delivery.sent >= 1));
    });

    test("resubscribe keeps what the person follows", async () => {
      await call("/api/subscribe", {body: {subscription: subscription("old"), countries: ["NG"], areas: ["NG-KO"]}});
      assert.equal((await call("/api/resubscribe", {body: {oldEndpoint: subscription("old").endpoint, subscription: subscription("new")}})).status, 200);
      const n = await call("/api/notify", {key: keys.admin, body: {title: "Kogi", msg: "Rising", c: "NG", areas: ["NG-KO"]}});
      assert.equal(n.json.targeted, 1);
      await until(() => deliveredTo("new") === 1);
      assert.equal(deliveredTo("old"), 0);
    });

    test("public contributions and the suggestion box", async () => {
      const c = await call("/api/contribute", {body: {type: "report", text: "Water to the knees at the market", placeText: "Kaneshie", depth: "knee", date: "2026-06-29", src: "https://example.org/photo"}});
      assert.equal(c.status, 202);
      assert.equal((await call("/api/contribute", {body: {type: "suggestion", text: "Add Twi language", category: "feature"}})).status, 202);
      assert.equal((await call("/api/contribute", {body: {type: "report", text: "no place"}})).status, 400);
      assert.equal((await call("/api/contribute", {body: {type: "report", text: "x", placeText: "y", src: "javascript:alert(1)"}})).status, 400);
      const bot = await call("/api/contribute", {body: {type: "suggestion", text: "spam", website: "http://spam"}});
      assert.equal(bot.status, 202);
      assert.equal((await call("/api/contributions", {key: keys.nadmo})).status, 403);
      const list = (await call("/api/contributions", {key: keys.admin})).json.contributions;
      assert.equal(list.length, 2, "robot submission dropped");
      assert.equal((await call("/api/contributions/decide", {key: keys.admin, body: {id: c.json.id, status: "accepted", note: "Thanks, added"}})).status, 200);
      assert.equal((await call("/api/contributions", {key: keys.admin})).json.contributions.find(x => x.id === c.json.id).status, "accepted");
    });

    test("flood replays: publish, list, layers, replace, delete", async () => {
      const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "test-terrain-replay.json"), "utf8"));
      assert.equal((await call("/api/replays", {key: keys.nadmo, body: bundle})).status, 403);
      const up = await call("/api/replays", {key: keys.admin, body: bundle});
      assert.equal(up.status, 200); assert.equal(up.json.steps, bundle.frames.length);
      const list = (await call("/api/replays")).json.replays;
      assert.equal(list.length, 1); assert.equal(list[0].kind, "model");
      const layer = await call("/api/geo/" + list[0].frames[3].geo);
      assert.equal(layer.status, 200); assert.equal(layer.json.fc.type, "FeatureCollection");
      assert.match(layer.headers.get("cache-control"), /immutable/);
      assert.equal((await call("/api/geo/..%2F..%2Fkeys")).status, 404);
      const again = await call("/api/replays", {key: keys.admin, body: bundle});
      assert.equal(again.status, 200);
      assert.equal((await call("/api/geo/" + list[0].frames[3].geo)).status, 404, "a re-import replaces the old layers");
      const bad = JSON.parse(JSON.stringify(bundle)); bad.frames[2].fc.features[0].geometry = {type: "Point", coordinates: [0, 0]};
      assert.equal((await call("/api/replays", {key: keys.admin, body: bad})).status, 400);
      assert.equal((await call("/api/replays/delete", {key: keys.admin, body: {id: bundle.replay.id}})).status, 200);
      assert.equal((await call("/api/replays")).json.replays.length, 0);
    });

    test("data publishing needs an administrator key and strips private data", async () => {
      const body = {app: "OpenTracker", settings: {notice: "hi"}, members: [{id: "u"}], hotspots: [{id: "h"}], agencies: [{id: "a", publishers: ["u"]}]};
      assert.equal((await call("/api/data", {key: keys.nadmo, body})).status, 403);
      assert.equal((await call("/api/data", {key: keys.admin, body})).status, 200);
      const d = (await call("/api/data")).json;
      assert.equal(d.members, undefined); assert.deepEqual(d.agencies[0].publishers, []);
    });

    test("bad input is refused cleanly and abuse is slowed down", async () => {
      assert.equal((await call("/api/notify", {key: keys.admin, body: {title: "x", msg: "y", c: "GH", areas: ["NG-LA"]}})).status, 400);
      const bad = await fetch(base + "/api/subscribe", {method: "POST", headers: {"Content-Type": "application/json"}, body: "{not json"});
      assert.equal(bad.status, 400);
      const big = await fetch(base + "/api/subscribe", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({x: "a".repeat(40000)})});
      assert.equal(big.status, 400);
      for (let i = 0; i < 11; i++) await call("/api/whoami", {key: "otk_bad_bad_bad_bad_bad_bad"});
      assert.equal((await call("/api/whoami", {key: "otk_bad_bad_bad_bad_bad_bad"})).status, 429);
    });
  });
}

test("payload encryption works with a real browser key pair", () => {
  const crypto = require("node:crypto");
  const ecdh = crypto.createECDH("prime256v1"); ecdh.generateKeys();
  const keys = {p256dh: ecdh.getPublicKey().toString("base64url"), auth: crypto.randomBytes(16).toString("base64url")};
  const v = webpush.generateVAPIDKeys();
  const req = webpush.generateRequestDetails({endpoint: "https://fcm.googleapis.com/fcm/send/x", keys}, JSON.stringify({title: "t"}),
    {vapidDetails: {subject: "mailto:a@b.org", publicKey: v.publicKey, privateKey: v.privateKey}, TTL: 60});
  assert.equal(req.headers["Content-Encoding"], "aes128gcm");
  assert.match(req.headers.Authorization, /^vapid t=/);
});
