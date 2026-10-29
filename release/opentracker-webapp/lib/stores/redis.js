"use strict";
/* Shared storage in Redis: lets any number of web servers and notification senders run side by side.
   Targeting uses indexes instead of scanning: one set per country, region/state and whole-country follower,
   plus a geo index of followed points, so finding the phones for a notice stays fast with millions of them.
   Keys are prefixed "ot:" so the database can be shared with other apps. */
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
  rate: k => "ot:rate:" + k, audit: "ot:audit", queue: "ot:pushq", lock: n => "ot:lock:" + n, doc: k => "ot:doc:" + k
};
const J = s => (s ? JSON.parse(s) : null);

class RedisStore {
  constructor(url) { this.url = url; }
  async init() {
    this.r = createClient({url: this.url, socket: {reconnectStrategy: n => Math.min(n * 200, 5000)}});
    this.r.on("error", e => console.error("Redis:", e.message));
    await this.r.connect();
    this.blocking = this.r.duplicate();   /* blocking queue reads get their own connection */
    this.blocking.on("error", e => console.error("Redis:", e.message));
    await this.blocking.connect();
    return this;
  }
  async close() { await Promise.allSettled([this.r.quit(), this.blocking.quit()]); }
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
    const old = J(await this.r.hGet(K.sub, id));
    const m = this.r.multi();
    if (old) this.indexOps(m, id, old, false);
    m.hSet(K.sub, id, JSON.stringify(sub));
    this.indexOps(m, id, sub, true);
    await m.exec();
  }
  async getSub(id) { return J(await this.r.hGet(K.sub, id)); }
  async delSubs(ids) {
    for (const id of ids) {
      const old = J(await this.r.hGet(K.sub, id)); if (!old) continue;
      const m = this.r.multi(); this.indexOps(m, id, old, false); m.hDel(K.sub, id); await m.exec();
    }
  }
  async getSubs(ids) {
    if (!ids.length) return [];
    const vals = await this.r.hmGet(K.sub, ids);
    return ids.map((id, i) => [id, J(vals[i])]).filter(([, s]) => s);
  }
  async targetIds(notice) {
    const countries = notice.c === "ALL" ? await this.r.sMembers(K.countries) : [notice.c];
    const ids = new Set();
    const add = list => list.forEach(x => ids.add(x));
    if (countries.length) add(await this.r.sUnion(countries.map(K.whole)));
    if (!notice.areas.length && !notice.ll) { if (countries.length) add(await this.r.sUnion(countries.map(K.byCountry))); }
    else {
      if (notice.areas.length) add(await this.r.sUnion(notice.areas.map(K.byArea)));
      if (notice.ll) add((await this.r.geoSearch(K.geo, {longitude: notice.ll[0], latitude: notice.ll[1]}, {radius: notice.km, unit: "km"})).map(m => m.split("|")[0]));
    }
    /* the indexes find candidates; the exact rule decides (e.g. a point near a border in another country) */
    const out = [];
    const all = [...ids];
    for (let i = 0; i < all.length; i += 1000) (await this.getSubs(all.slice(i, i + 1000))).forEach(([id, s]) => { if (matches(notice, s)) out.push(id); });
    return out;
  }
  async subStats() {
    const countries = await this.r.sMembers(K.countries), by = {};
    for (const c of countries) by[c] = await this.r.sCard(K.byCountry(c));
    return {subscribers: await this.r.hLen(K.sub), byCountry: by, withLocation: null};
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
  /* one holder at a time, e.g. for the weather poller */
  async lock(name, ttlMs, holder) {
    const ok = await this.r.set(K.lock(name), holder, {NX: true, PX: ttlMs});
    if (ok) return true;
    if ((await this.r.get(K.lock(name))) === holder) { await this.r.pExpire(K.lock(name), ttlMs); return true; }
    return false;
  }
}
module.exports = {RedisStore};
