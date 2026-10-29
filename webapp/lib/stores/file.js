"use strict";
/* Single-server storage in JSON files: for development, testing and small deployments.
   Everything lives in memory and is written to disk atomically (temp file + rename) a moment after it changes.
   For more than one server process use the Redis store (set REDIS_URL). */
const fs = require("node:fs");
const path = require("node:path");
const webpush = require("web-push");
const {matches} = require("../rules");
const {DOC_KEY} = require("./keys");

class FileStore {
  constructor(dir) {
    this.dir = dir;
    this.timers = new Map();
    this.queue = []; this.waiters = [];
    this.rates = new Map();
  }
  async init() {
    fs.mkdirSync(this.dir, {recursive: true, mode: 0o700});
    const r = (name, fallback) => { try { return JSON.parse(fs.readFileSync(this.file(name), "utf8")); } catch (e) { if (e.code === "ENOENT") return fallback; throw e; } };
    this.db = {vapid: r("vapid", null), keys: r("keys", []), settings: r("settings", {}), subs: r("subs", {}), notices: r("notices", []),
      data: r("data", null), weather: r("weather", null), contributions: r("contributions", []), replays: r("replays", [])};
    fs.mkdirSync(path.join(this.dir, "geo"), {recursive: true, mode: 0o700});
    fs.mkdirSync(path.join(this.dir, "docs"), {recursive: true, mode: 0o700});
    this.docs = new Map();
    this.sweeper = setInterval(() => { const now = Date.now(); for (const [k, v] of this.rates) if (now > v.reset) this.rates.delete(k); }, 60e3).unref();
    return this;
  }
  file(name) { return path.join(this.dir, name + ".json"); }
  /* coalesce bursts of changes into one write per file */
  save(name) {
    if (this.timers.has(name)) return;
    this.timers.set(name, setTimeout(() => this.flushOne(name), 50));
  }
  flushOne(name) {
    clearTimeout(this.timers.get(name)); this.timers.delete(name);
    const tmp = this.file(name) + "." + process.pid + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.db[name]), {mode: 0o600});
    fs.renameSync(tmp, this.file(name));
  }
  async close() { clearInterval(this.sweeper); for (const name of [...this.timers.keys()]) this.flushOne(name); }
  async ping() { return true; }

  async vapid() { if (!this.db.vapid) { this.db.vapid = webpush.generateVAPIDKeys(); this.flushOne("vapid"); } return this.db.vapid; }
  /* keys */
  async listKeys() { return this.db.keys.slice(); }
  async addKey(rec) { this.db.keys.push(rec); this.flushOne("keys"); }
  async updateKey(id, patch) { const k = this.db.keys.find(x => x.id === id); if (!k) return false; Object.assign(k, patch); this.flushOne("keys"); return true; }
  /* settings */
  async getSettings() { return Object.assign({approval: true}, this.db.settings); }
  async putSettings(s) { this.db.settings = s; this.flushOne("settings"); }
  /* subscriptions */
  async putSub(id, sub) { this.db.subs[id] = sub; this.save("subs"); }
  async getSub(id) { return this.db.subs[id] || null; }
  async delSubs(ids) { ids.forEach(id => delete this.db.subs[id]); if (ids.length) this.save("subs"); }
  async getSubs(ids) { return ids.map(id => [id, this.db.subs[id]]).filter(([, s]) => s); }
  async targetIds(notice) { return Object.entries(this.db.subs).filter(([, s]) => matches(notice, s)).map(([id]) => id); }
  async subStats() {
    const subs = Object.values(this.db.subs), by = {};
    subs.forEach(s => s.countries.forEach(c => by[c] = (by[c] || 0) + 1));
    return {subscribers: subs.length, byCountry: by, withLocation: subs.filter(s => s.points.length).length};
  }
  /* notices */
  async putNotice(n) {
    const i = this.db.notices.findIndex(x => x.id === n.id);
    if (i >= 0) this.db.notices[i] = n; else this.db.notices.unshift(n);
    this.db.notices.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    this.db.notices = this.db.notices.slice(0, 1000);
    this.save("notices");
  }
  async getNotice(id) { return this.db.notices.find(x => x.id === id) || null; }
  async listNotices(limit) { return this.db.notices.slice(0, limit); }
  async addDelivery(id, d) {
    const n = this.db.notices.find(x => x.id === id); if (!n) return;
    n.delivery = n.delivery || {sent: 0, failed: 0, removed: 0};
    for (const k of Object.keys(d)) n.delivery[k] = (n.delivery[k] || 0) + d[k];
    this.save("notices");
  }
  /* published data and weather */
  async getData() { return this.db.data; }
  async putData(d) { this.db.data = d; this.flushOne("data"); }
  async getWeather() { return this.db.weather; }
  async putWeather(w) { this.db.weather = w; this.save("weather"); }
  /* public contributions */
  async putContribution(c, max) {
    const i = this.db.contributions.findIndex(x => x.id === c.id);
    if (i >= 0) this.db.contributions[i] = c; else this.db.contributions.unshift(c);
    if (this.db.contributions.length > max) this.db.contributions.length = max;
    this.save("contributions");
  }
  async getContribution(id) { return this.db.contributions.find(x => x.id === id) || null; }
  async listContributions(limit) { return this.db.contributions.slice(0, limit); }
  /* flood replays: small records here, one file per map layer */
  async listReplays() { return this.db.replays.slice(); }
  async getReplay(id) { return this.db.replays.find(r => r.id === id) || null; }
  async putReplay(r) { this.db.replays = this.db.replays.filter(x => x.id !== r.id).concat([r]); this.flushOne("replays"); }
  async delReplay(id) { this.db.replays = this.db.replays.filter(x => x.id !== id); this.flushOne("replays"); }
  geoFile(id) { if (!/^[a-z0-9-]{2,120}$/.test(id)) throw new Error("bad geo id"); return path.join(this.dir, "geo", id + ".json"); }
  async putGeo(id, fc) { const f = this.geoFile(id), tmp = f + ".tmp"; await fs.promises.writeFile(tmp, JSON.stringify(fc)); await fs.promises.rename(tmp, f); }
  async getGeo(id) { try { return JSON.parse(await fs.promises.readFile(this.geoFile(id), "utf8")); } catch (e) { if (e.code === "ENOENT") return null; throw e; } }
  async delGeo(ids) { for (const id of ids) await fs.promises.unlink(this.geoFile(id)).catch(() => {}); }
  /* documents written by the data feeds (forecasts, alerts, per-country hazard summaries): memory first, then disk */
  docFile(key) { if (!DOC_KEY.test(key)) throw new Error("bad document key"); return path.join(this.dir, "docs", key.replace(/:/g, "__") + ".json"); }
  async getDoc(key) {
    const file = this.docFile(key);
    if (this.docs.has(key)) return this.docs.get(key);
    let value = null;
    try { value = JSON.parse(await fs.promises.readFile(file, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
    this.docs.set(key, value);
    return value;
  }
  async putDoc(key, value) {
    const file = this.docFile(key), tmp = `${file}.${process.pid}.tmp`;
    this.docs.set(key, value);
    await fs.promises.writeFile(tmp, JSON.stringify(value), {mode: 0o600});
    await fs.promises.rename(tmp, file);
  }
  /* fixed-window counters for rate limits */
  async hit(key, windowMs) {
    const now = Date.now(), b = this.rates.get(key);
    if (!b || now > b.reset) { this.rates.set(key, {n: 1, reset: now + windowMs}); return 1; }
    return ++b.n;
  }
  /* audit trail */
  async log(entry) { await fs.promises.appendFile(path.join(this.dir, "audit.log"), JSON.stringify(entry) + "\n", {mode: 0o600}); }
  /* push job queue (in-process) */
  async pushJobs(jobs) {
    this.queue.push(...jobs);
    while (this.waiters.length && this.queue.length) this.waiters.shift()(this.queue.shift());
  }
  popJob(timeoutSec) {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    return new Promise(resolve => {
      const w = job => { clearTimeout(t); resolve(job); };
      const t = setTimeout(() => { this.waiters.splice(this.waiters.indexOf(w), 1); resolve(null); }, timeoutSec * 1000);
      this.waiters.push(w);
    });
  }
  async lock() { return true; }   /* one process: it always holds the lock */
}
module.exports = {FileStore};
