"use strict";
/* Shared storage in Redis: lets any number of web servers and notification senders run side by side.
   Targeting uses indexes instead of scanning: one set per country, region/state and whole-country follower,
   plus a geo index of followed points, so finding the phones for a notice stays fast with millions of them.
   Keys are prefixed "ot:" so the database can be shared with other apps. */
const crypto = require("node:crypto");
const {createClient} = require("redis");
const webpush = require("web-push");
const {matches} = require("../rules");
const {DOC_KEY} = require("./keys");

const K = {
  vapid: "ot:vapid", keys: "ot:keys", settings: "ot:settings", sub: "ot:sub", countries: "ot:countries",
  byCountry: c => "ot:ix:c:" + c, byArea: a => "ot:ix:a:" + a, whole: c => "ot:ix:w:" + c, geo: "ot:geo",
  notice: "ot:notice", notices: "ot:notices", delivery: id => "ot:delivery:" + id,
  data: "ot:data", weather: "ot:weather", contrib: "ot:contrib", contribs: "ot:contribs",
  replay: "ot:replay", geoLayer: id => "ot:geo:" + id,
  rate: k => "ot:rate:" + k, audit: "ot:audit", queue: "ot:pushq", lock: n => "ot:lock:" + n, doc: k => "ot:doc:" + k,
  metrics: "ot:metrics"
};
const J = s => (s ? JSON.parse(s) : null);

class RedisStore {
  /* subUrls: extra Redis servers that hold the subscriptions, each holding the ones whose id hashes to it, with their
     targeting indexes. Empty: subscriptions live in the main Redis. Billions of followers need several (docs/SCALING.md). */
  constructor(url, log = console, {subUrls = []} = {}) { this.url = url; this.logger = log; this.subUrls = subUrls; }
  connect(url) {
    const c = createClient({url, socket: {reconnectStrategy: n => Math.min(n * 200, 5000)}});
    c.on("error", e => this.logger.error("Redis:", e.message));
    return c;
  }
  async init() {
    this.r = this.connect(this.url);
    await this.r.connect();
    this.blocking = this.r.duplicate();   /* blocking queue reads get their own connection */
    this.blocking.on("error", e => this.logger.error("Redis:", e.message));
    await this.blocking.connect();
    this.shards = this.subUrls.length ? await Promise.all(this.subUrls.map(async u => { const c = this.connect(u); await c.connect(); return c; })) : [this.r];
    return this;
  }
  /* the main connection finishes commands already sent; the queue connection is only waiting for work, so it stops at once */
  async close() {
    this.blocking.destroy();
    await Promise.all(this.shards.filter(c => c !== this.r).map(c => c.close().catch(() => {})));
    await this.r.close().catch(() => {});
  }
  /* which subscription shard holds a subscription (FNV-1a of its id: stable, and even across shards) */
  shardOf(id) {
    if (this.shards.length === 1) return this.shards[0];
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
    return this.shards[h % this.shards.length];
  }
  async ping() { return (await this.r.ping()) === "PONG"; }

  async vapid() {
    const fresh = webpush.generateVAPIDKeys();
    await this.r.set(K.vapid, JSON.stringify(fresh), {NX: true});   /* first server to start creates the keys; all share them */
    return J(await this.r.get(K.vapid));
  }
  /* keys */
  async listKeys() { return Object.values(await this.r.hGetAll(K.keys)).map(J); }
  async addKey(rec) { await this.r.hSet(K.keys, rec.id, JSON.stringify(rec)); }
  async updateKey(id, patch) {
    const k = J(await this.r.hGet(K.keys, id)); if (!k) return false;
    await this.r.hSet(K.keys, id, JSON.stringify(Object.assign(k, patch))); return true;
  }
  /* settings */
  async getSettings() { return Object.assign({approval: true}, J(await this.r.get(K.settings))); }
  async putSettings(s) { await this.r.set(K.settings, JSON.stringify(s)); }

  /* subscriptions and their targeting indexes */
  indexOps(m, id, s, add) {
    const set = add ? "sAdd" : "sRem";
    s.countries.forEach(c => { m[set](K.byCountry(c), id); if (add) m.sAdd(K.countries, c); });
    s.areas.forEach(a => m[set](K.byArea(a), id));
    s.whole.forEach(c => m[set](K.whole(c), id));
    s.points.forEach((p, i) => add ? m.geoAdd(K.geo, {longitude: p[0], latitude: p[1], member: id + "|" + i}) : m.zRem(K.geo, id + "|" + i));
  }
  async putSub(id, sub) {
    const r = this.shardOf(id);
    const old = J(await r.hGet(K.sub, id));
    const m = r.multi();
    if (old) this.indexOps(m, id, old, false);
    m.hSet(K.sub, id, JSON.stringify(sub));
    this.indexOps(m, id, sub, true);
    await m.exec();
  }
  async getSub(id) { return J(await this.shardOf(id).hGet(K.sub, id)); }
  async delSubs(ids) {
    for (const id of ids) {
      const r = this.shardOf(id);
      const old = J(await r.hGet(K.sub, id)); if (!old) continue;
      const m = r.multi(); this.indexOps(m, id, old, false); m.hDel(K.sub, id); await m.exec();
    }
  }
  async getSubs(ids) {
    if (!ids.length) return [];
    const groups = new Map();
    ids.forEach(id => { const r = this.shardOf(id); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(id); });
    const found = new Map();
    await Promise.all([...groups].map(async ([r, list]) => (await r.hmGet(K.sub, list)).forEach((v, i) => { if (v) found.set(list[i], J(v)); })));
    return ids.filter(id => found.has(id)).map(id => [id, found.get(id)]);
  }
  /* The phones a notice is for, in chunks of at most `size`, so a warning to tens of millions never sits in one
     process's memory: Redis builds the union of the matching indexes itself (a sorted set, read back by position,
     so every phone comes exactly once), and the exact rule checks each chunk (e.g. a point near a border). */
  async *targetOn(r, notice, size) {
    const tmp = "ot:tmp:target:" + crypto.randomUUID(), tmpGeo = tmp + ":geo";
    try {
      const countries = notice.c === "ALL" ? await r.sMembers(K.countries) : [notice.c];
      const sets = countries.map(K.whole);
      if (!notice.areas.length && !notice.ll) sets.push(...countries.map(K.byCountry));
      else sets.push(...notice.areas.map(K.byArea));
      if (sets.length) await r.zUnionStore(tmp, sets);
      if (notice.ll) {
        const found = await r.geoSearchStore(tmpGeo, K.geo, {longitude: notice.ll[0], latitude: notice.ll[1]}, {radius: notice.km, unit: "km"});
        for (let i = 0; i < found; i += size) {
          const members = await r.zRange(tmpGeo, i, i + size - 1);
          if (members.length) await r.zAdd(tmp, members.map(m => ({score: 1, value: m.split("|")[0]})), {NX: true});
        }
      }
      await r.expire(tmp, 3600);   /* cleaned up below; this only guards against a crash part-way */
      const total = await r.zCard(tmp);
      for (let i = 0; i < total; i += size) {
        const ids = await r.zRange(tmp, i, i + size - 1);
        const out = (await this.getSubs(ids)).filter(([, s]) => matches(notice, s)).map(([id]) => id);
        if (out.length) yield out;
      }
    } finally {
      await r.del([tmp, tmpGeo]).catch(() => {});
    }
  }
  /* one source of chunks per subscription shard: the notification queue targets all shards at once */
  targetSources(notice, size = 1000) { return this.shards.map(r => this.targetOn(r, notice, size)); }
  async *targetChunks(notice, size = 1000) {
    for (const source of this.targetSources(notice, size)) yield* source;
  }
  async targetIds(notice) {
    const out = [];
    for await (const chunk of this.targetChunks(notice)) out.push(...chunk);
    return out;
  }
  async subStats() {
    const by = {};
    let subscribers = 0;
    for (const r of this.shards) {
      subscribers += await r.hLen(K.sub);
      for (const c of await r.sMembers(K.countries)) by[c] = (by[c] || 0) + await r.sCard(K.byCountry(c));
    }
    return {subscribers, byCountry: by, withLocation: null};
  }
  /* notices: a hash of records and a sorted index by time */
  async putNotice(n) {
    await this.r.multi().hSet(K.notice, n.id, JSON.stringify(n)).zAdd(K.notices, {score: Date.parse(n.at), value: n.id}).exec();
    const extra = (await this.r.zCard(K.notices)) - 1000;
    if (extra > 0) { const old = await this.r.zRange(K.notices, 0, extra - 1); await this.r.multi().zRem(K.notices, old).hDel(K.notice, old).exec(); }
  }
  async getNotice(id) {
    const n = J(await this.r.hGet(K.notice, id)); if (!n) return null;
    const d = await this.r.hGetAll(K.delivery(id));
    if (Object.keys(d).length) n.delivery = {sent: +d.sent || 0, failed: +d.failed || 0, removed: +d.removed || 0};
    return n;
  }
  async listNotices(limit) {
    const ids = await this.r.zRange(K.notices, 0, limit - 1, {REV: true});
    return (await Promise.all(ids.map(id => this.getNotice(id)))).filter(Boolean);
  }
  async addDelivery(id, d) {
    const m = this.r.multi();
    for (const [k, v] of Object.entries(d)) if (v) m.hIncrBy(K.delivery(id), k, v);
    m.expire(K.delivery(id), 90 * 86400);
    await m.exec();
  }
  /* published data and weather */
  async getData() { return J(await this.r.get(K.data)); }
  async putData(d) { await this.r.set(K.data, JSON.stringify(d)); }
  async getWeather() { return J(await this.r.get(K.weather)); }
  async putWeather(w) { await this.r.set(K.weather, JSON.stringify(w)); }
  /* contributions */
  async putContribution(c, max) {
    await this.r.multi().hSet(K.contrib, c.id, JSON.stringify(c)).zAdd(K.contribs, {score: Date.parse(c.at), value: c.id}).exec();
    const extra = (await this.r.zCard(K.contribs)) - max;
    if (extra > 0) { const old = await this.r.zRange(K.contribs, 0, extra - 1); await this.r.multi().zRem(K.contribs, old).hDel(K.contrib, old).exec(); }
  }
  async getContribution(id) { return J(await this.r.hGet(K.contrib, id)); }
  async listContributions(limit) {
    const ids = await this.r.zRange(K.contribs, 0, limit - 1, {REV: true});
    return ids.length ? (await this.r.hmGet(K.contrib, ids)).map(J).filter(Boolean) : [];
  }
  /* flood replays: records in a hash, map layers as separate keys */
  async listReplays() { return Object.values(await this.r.hGetAll(K.replay)).map(J); }
  async getReplay(id) { return J(await this.r.hGet(K.replay, id)); }
  async putReplay(r) { await this.r.hSet(K.replay, r.id, JSON.stringify(r)); }
  async delReplay(id) { await this.r.hDel(K.replay, id); }
  async putGeo(id, fc) { await this.r.set(K.geoLayer(id), JSON.stringify(fc)); }
  async getGeo(id) { return J(await this.r.get(K.geoLayer(id))); }
  async delGeo(ids) { if (ids.length) await this.r.del(ids.map(K.geoLayer)); }
  /* documents written by the data feeds */
  async getDoc(key) { if (!DOC_KEY.test(key)) throw new Error("bad document key"); return J(await this.r.get(K.doc(key))); }
  async putDoc(key, value) { if (!DOC_KEY.test(key)) throw new Error("bad document key"); await this.r.set(K.doc(key), JSON.stringify(value)); }
  /* rate limits shared by every server */
  async hit(key, windowMs) {
    const [n] = await this.r.multi().incr(K.rate(key)).pExpire(K.rate(key), windowMs, "NX").exec();
    return n;
  }
  async log(entry) { await this.r.xAdd(K.audit, "*", {e: JSON.stringify(entry)}, {TRIM: {strategy: "MAXLEN", strategyModifier: "~", threshold: 200000}}); }
  /* notification jobs shared by every sender */
  async pushJobs(jobs) { if (jobs.length) await this.r.lPush(K.queue, jobs.map(j => JSON.stringify(j))); }
  async popJob(timeoutSec) { const r = await this.blocking.brPop(K.queue, timeoutSec); return r ? J(r.element) : null; }
  async queueLength() { return this.r.lLen(K.queue); }
  /* monitoring totals shared by every server (lib/metrics.js) */
  async addMetrics(deltas) {
    const m = this.r.multi();
    for (const [k, v] of Object.entries(deltas)) m.hIncrByFloat(K.metrics, k, v);
    await m.exec();
  }
  async getMetrics() {
    const h = await this.r.hGetAll(K.metrics);
    return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Number(v)]));
  }
  /* one holder at a time, e.g. for the weather poller */
  async lock(name, ttlMs, holder) {
    const ok = await this.r.set(K.lock(name), holder, {NX: true, PX: ttlMs});
    if (ok) return true;
    if ((await this.r.get(K.lock(name))) === holder) { await this.r.pExpire(K.lock(name), ttlMs); return true; }
    return false;
  }
}
module.exports = {RedisStore};
