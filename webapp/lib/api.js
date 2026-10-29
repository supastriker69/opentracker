"use strict";
/* The HTTP API. Public reads are cacheable (a CDN can serve them to any number of people);
   writes are validated, rate-limited, and the important ones are recorded in the audit trail. */
const crypto = require("node:crypto");
const {InputError} = require("./errors");
const {send, readBody, clientIp, sameOrigin, bearer, secure, buildCsp, serveStatic} = require("./http");
const {parseSubscription, parseNotice, parseContribution, parseReplay, parseData} = require("./rules");

const hashKey = k => crypto.createHash("sha256").update(k).digest("hex");
const subId = endpoint => crypto.createHash("sha256").update(endpoint).digest("base64url").slice(0, 32);
const newId = () => crypto.randomBytes(6).toString("hex");
const now = () => new Date().toISOString();
const CACHE_LIVE = "public, max-age=30, s-maxage=30, stale-while-revalidate=60";
const CACHE_DATA = "public, max-age=300, s-maxage=300, stale-while-revalidate=3600";
const CACHE_FOREVER = "public, max-age=31536000, immutable";   /* map layers never change: a new import gets new ids */
const CACHE_FEED = "public, max-age=60, s-maxage=60, stale-while-revalidate=600";

/* what the browser needs for the 3D map, and the origins the security policy must allow for it */
function mapSettings(cfg) {
  const map = {tiles: cfg.mapTiles, glyphs: cfg.mapGlyphs, terrain: cfg.mapTerrain};
  const origins = [...new Set(Object.values(map).filter(Boolean).map(u => new URL(u.replace(/[{}]/g, "")).origin))];
  return {map: map.tiles || map.terrain ? map : null, origins};
}

function createApi({cfg, store, push, weather, feeds, vapidPublicKey}) {
  const {map, origins} = mapSettings(cfg);
  const csp = buildCsp(origins);
  /* public reads are rebuilt at most once per second per process, however many people ask */
  const memo = new Map();
  function cached(name, fn, ttlMs = 1000) {
    const hit = memo.get(name);
    if (hit && hit.until > Date.now()) return hit.value;
    const value = Promise.resolve().then(fn);
    memo.set(name, {until: Date.now() + ttlMs, value});
    value.catch(() => memo.delete(name));
    return value;
  }
  /* ---------- guards ---------- */
  async function limited(req, res, name, max, windowMs, key) {
    const n = await store.hit(name + ":" + (key || clientIp(req, cfg.trustProxy)), windowMs);
    if (n > max) { send(req, res, 429, {error: "Too many requests. Try again later."}); return true; }
    return false;
  }
  async function findKey(raw) {
    if (typeof raw !== "string" || raw.length < 20 || raw.length > 200) return null;
    const h = Buffer.from(hashKey(raw), "hex");
    return (await store.listKeys()).find(k => !k.revoked && crypto.timingSafeEqual(Buffer.from(k.hash, "hex"), h)) || null;
  }
  async function auth(req, res, needAdmin) {
    const k = await findKey(bearer(req));
    if (!k) {
      const n = await store.hit("bad:" + clientIp(req, cfg.trustProxy), 10 * 60e3);   /* only failures are counted */
      send(req, res, n > 10 ? 429 : 401, {error: n > 10 ? "Too many failed attempts. Try again later." : "A valid agency key is required."});
      return null;
    }
    if (needAdmin && !k.admin) { send(req, res, 403, {error: "This needs an administrator key."}); return null; }
    return k;
  }
  const needsApproval = async k => (await store.getSettings()).approval && !k.admin && !k.trusted;
  const isLive = n => n.status === "live" && !n.withdrawn && (!n.expires || Date.parse(n.expires) > Date.now());
  const publicNotice = n => ({id: n.id, level: n.level, title: n.title, msg: n.msg, c: n.c, areas: n.areas, ll: n.ll, km: n.km, agency: n.agency, agencyName: n.agencyName, at: n.at, expires: n.expires});
  const audit = (k, act, extra) => store.log(Object.assign({at: now(), act, key: k ? k.id : null}, extra));
  const fresh = name => memo.delete(name);   /* this process shows its own changes at once; others within a second */
  async function goLive(n, k) {
    const {targeted} = await push.enqueue(n);
    await audit(k, "sent", {notice: n.id, title: n.title, targeted});
    return {targeted};
  }

  /* ---------- routes ---------- */
  const routes = {
    "GET /healthz": (req, res) => send(req, res, 200, {ok: true}),
    "GET /readyz": async (req, res) => send(req, res, (await store.ping().catch(() => false)) ? 200 : 503, {}),
    "GET /api/config": (req, res) => send(req, res, 200, {vapidPublicKey, map}, CACHE_DATA),
    /* every country's flood and heat summary in one file, for the claude.ai page (Admin → Live data) */
    "GET /api/snapshot": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      const countries = {};
      for (const c of feeds.countries) { const d = await feeds.hazards(c); if (d && (d.heat.length || d.alerts.length || d.disasters.length || d.rivers.length)) countries[c] = d; }
      send(req, res, 200, {app: "OpenTracker-snapshot", version: 1, at: now(), world: await feeds.hazards("world"), countries});
    },
    "GET /api/notices": async (req, res) => send(req, res, 200, await cached("notices", async () => ({notices: (await store.listNotices(200)).filter(isLive).slice(0, 100).map(publicNotice)})), CACHE_LIVE),
    "GET /api/weather": async (req, res) => send(req, res, 200, await cached("weather", () => weather.get()), CACHE_LIVE),
    "GET /api/replays": async (req, res) => send(req, res, 200, await cached("replays", async () => ({replays: (await store.listReplays()).sort((a, b) => String(b.frames[0].t).localeCompare(String(a.frames[0].t)))})), CACHE_LIVE),
    /* administrators publish flood replays made by the modelling and satellite tools */
    "POST /api/replays": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      const {meta, frames} = parseReplay(await readBody(req, 25 * 1024 * 1024));
      const old = await store.getReplay(meta.id);
      const stored = [];
      for (const f of frames) {
        const id = `${meta.id}--${crypto.randomBytes(5).toString("hex")}`;
        await store.putGeo(id, f.fc);
        stored.push({t: f.t, label: f.label, km2: f.km2, m3: f.m3, geo: id});
      }
      await store.putReplay(Object.assign(meta, {frames: stored}));
      if (old) await store.delGeo(old.frames.map(f => f.geo));
      fresh("replays");
      await audit(k, old ? "replaced replay" : "added replay", {replay: meta.id, steps: stored.length});
      send(req, res, 200, {ok: true, id: meta.id, steps: stored.length});
    },
    "POST /api/replays/delete": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      const b = await readBody(req, 1024);
      const r = typeof b?.id === "string" && await store.getReplay(b.id);
      if (!r) return send(req, res, 404, {error: "No replay with that id."});
      await store.delReplay(r.id);
      await store.delGeo(r.frames.map(f => f.geo));
      fresh("replays");
      await audit(k, "deleted replay", {replay: r.id});
      send(req, res, 200, {ok: true});
    },
    /* every outside data source, its licence and whether it is up to date */
    "GET /api/sources": async (req, res) => send(req, res, 200, await cached("sources", async () => ({sources: await feeds.sources(), weather: await weather.get().then(w => ({connected: w.connected, source: w.source, updated: w.updated}))}), 5000), CACHE_LIVE),
    "GET /api/sources/admin": async (req, res) => { const k = await auth(req, res, true); if (k) send(req, res, 200, {sources: await feeds.sources({admin: true}), feeds: feeds.feeds()}); },
    "POST /api/sources/run": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      const b = await readBody(req, 1024);
      if (typeof b?.id !== "string" || !feeds.runNow(b.id)) return send(req, res, 404, {error: "No running data feed with that id."});
      await audit(k, "ran data feed", {feed: b.id});
      send(req, res, 202, {ok: true});
    },
    /* official warning feeds (CAP) that the data feeds read: administrators add each country's agencies */
    "GET /api/cap-feeds": async (req, res) => { const k = await auth(req, res, true); if (k) send(req, res, 200, {feeds: await feeds.capFeeds.list()}); },
    "POST /api/cap-feeds": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      const b = await readBody(req, 4 * 1024);
      if (b && typeof b.remove === "string") {
        if (!(await feeds.capFeeds.remove(b.remove))) return send(req, res, 404, {error: "No feed with that id."});
        await audit(k, "removed warning feed", {feed: b.remove});
        return send(req, res, 200, {ok: true});
      }
      if (!b || typeof b.add !== "object" || b.add === null) throw new InputError("send {add: {country, agency, url}} or {remove: id}");
      let feed;
      try { feed = await feeds.capFeeds.add(b.add, k.id); } catch (e) { if (e instanceof RangeError) throw new InputError(e.message); throw e; }
      await audit(k, "added warning feed", {feed: feed.id, url: feed.url});
      send(req, res, 200, {ok: true, feed});
    },
    "GET /api/data": async (req, res) => { const d = await cached("data", () => store.getData(), 5000); return d ? send(req, res, 200, d, CACHE_DATA) : send(req, res, 204); },   /* nothing published yet: the app uses its built-in data */

    "POST /api/subscribe": async (req, res) => {
      if (await limited(req, res, "sub", 30, 10 * 60e3)) return;
      const s = parseSubscription(await readBody(req, 16 * 1024));
      await store.putSub(subId(s.subscription.endpoint), Object.assign(s, {updated: now()}));
      send(req, res, 200, {ok: true});
    },
    /* the browser replaced a subscription (service worker "pushsubscriptionchange"): keep what the person follows */
    "POST /api/resubscribe": async (req, res) => {
      if (await limited(req, res, "sub", 30, 10 * 60e3)) return;
      const b = await readBody(req, 16 * 1024);
      const oldId = typeof b?.oldEndpoint === "string" ? subId(b.oldEndpoint) : null;
      const prev = oldId && await store.getSub(oldId);
      if (!prev) return send(req, res, 404, {error: "unknown subscription"});
      const s = parseSubscription(Object.assign({}, prev, {subscription: b.subscription}));
      await store.delSubs([oldId]);
      await store.putSub(subId(s.subscription.endpoint), Object.assign(s, {updated: now()}));
      send(req, res, 200, {ok: true});
    },
    "POST /api/unsubscribe": async (req, res) => {
      if (await limited(req, res, "sub", 30, 10 * 60e3)) return;
      const b = await readBody(req, 4 * 1024);
      if (typeof b?.endpoint === "string") await store.delSubs([subId(b.endpoint)]);
      send(req, res, 200, {ok: true});
    },

    /* open-source contributions from the public: flood reports, corrections, suggestions, data sources */
    "POST /api/contribute": async (req, res) => {
      if (await limited(req, res, "contrib", 10, 3600e3)) return;
      const b = await readBody(req, 8 * 1024);
      if (b && b.website) return send(req, res, 202, {ok: true});   /* a hidden field only robots fill in */
      const c = Object.assign({id: newId(), at: now(), status: "new", note: ""}, parseContribution(b));
      await store.putContribution(c, cfg.maxContributions);
      send(req, res, 202, {ok: true, id: c.id});
    },
    "GET /api/contributions": async (req, res) => { const k = await auth(req, res, true); if (k) send(req, res, 200, {contributions: await store.listContributions(500)}); },
    "POST /api/contributions/decide": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      const b = await readBody(req, 4 * 1024);
      const c = typeof b?.id === "string" && await store.getContribution(b.id);
      if (!c) return send(req, res, 404, {error: "No contribution with that id."});
      if (!["accepted", "rejected", "new"].includes(b.status)) throw new InputError("status must be accepted, rejected or new");
      Object.assign(c, {status: b.status, note: typeof b.note === "string" ? b.note.slice(0, 300) : "", decidedBy: k.id, decidedAt: now()});
      await store.putContribution(c, cfg.maxContributions);
      await audit(k, "contribution " + b.status, {contribution: c.id});
      send(req, res, 200, {ok: true});
    },

    /* agencies and administrators */
    "GET /api/whoami": async (req, res) => { const k = await auth(req, res, false); if (k) send(req, res, 200, {agency: k.agency, name: k.name, admin: k.admin, needsApproval: await needsApproval(k)}); },
    "POST /api/notify": async (req, res) => {
      const k = await auth(req, res, false); if (!k) return;
      if (await limited(req, res, "notify", 60, 3600e3, k.id)) return;
      const pending = await needsApproval(k);
      const n = Object.assign({id: newId(), agency: k.agency, agencyName: k.name, keyId: k.id, at: now(), withdrawn: null, status: pending ? "pending" : "live"}, parseNotice(await readBody(req, 16 * 1024)));
      await store.putNotice(n);
      fresh("notices");
      await audit(k, pending ? "submitted for approval" : "notify", {notice: n.id, title: n.title});
      if (pending) return send(req, res, 202, {id: n.id, pending: true});
      send(req, res, 200, Object.assign({id: n.id}, await goLive(n, k)));
    },
    /* administrators approve or reject agency notices; approving sends them */
    "POST /api/decide": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      const b = await readBody(req, 4 * 1024);
      const n = typeof b?.id === "string" && await store.getNotice(b.id);
      if (!n || n.status !== "pending") return send(req, res, 404, {error: "No notice waiting with that id."});
      Object.assign(n, {status: b.ok === true ? "live" : "rejected", note: typeof b.note === "string" ? b.note.slice(0, 300) : "", decidedBy: k.id, decidedAt: now()});
      if (n.status === "live") n.at = n.decidedAt;   /* it goes out now */
      await store.putNotice(n);
      fresh("notices");
      await audit(k, n.status === "live" ? "approved" : "rejected", {notice: n.id, note: n.note});
      send(req, res, 200, n.status === "live" ? Object.assign({ok: true}, await goLive(n, k)) : {ok: true});
    },
    "POST /api/withdraw": async (req, res) => {
      const k = await auth(req, res, false); if (!k) return;
      const b = await readBody(req, 4 * 1024);
      const n = typeof b?.id === "string" && await store.getNotice(b.id);
      if (!n) return send(req, res, 404, {error: "No notice with that id."});
      if (!k.admin && n.agency !== k.agency) return send(req, res, 403, {error: "You can withdraw only your own agency's notices."});
      n.withdrawn = now();
      await store.putNotice(n);
      fresh("notices");
      await audit(k, "withdraw", {notice: n.id});
      send(req, res, 200, {ok: true});
    },
    "GET /api/sent": async (req, res) => {
      const k = await auth(req, res, false); if (!k) return;
      const list = (await store.listNotices(300)).filter(n => k.admin || n.agency === k.agency).slice(0, 100);
      const s = await store.getSettings();
      send(req, res, 200, {approval: s.approval, autoHeatAlerts: !!s.autoHeatAlerts, needsApproval: await needsApproval(k),
        notices: list.map(n => Object.assign(publicNotice(n), {withdrawn: n.withdrawn, status: n.status, note: n.note || "", delivery: n.delivery || null}))});
    },
    "POST /api/settings": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      const b = await readBody(req, 1024);
      const change = {};
      for (const name of ["approval", "autoHeatAlerts"]) {
        if (b?.[name] === undefined) continue;
        if (typeof b[name] !== "boolean") throw new InputError(`${name} must be true or false`);
        change[name] = b[name];
      }
      if (!Object.keys(change).length) throw new InputError("send approval and/or autoHeatAlerts as true or false");
      const s = Object.assign(await store.getSettings(), change);
      await store.putSettings(s);
      for (const [name, on] of Object.entries(change)) await audit(k, `${name === "approval" ? "approval" : "automatic heat alerts"} ${on ? "on" : "off"}`);
      send(req, res, 200, {approval: s.approval, autoHeatAlerts: !!s.autoHeatAlerts});
    },
    "POST /api/data": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      const d = parseData(await readBody(req, 8 * 1024 * 1024));
      await store.putData(d);
      fresh("data");
      await audit(k, "publish data", {published: d.published});
      send(req, res, 200, {ok: true, published: d.published});
    },
    "GET /api/stats": async (req, res) => {
      const k = await auth(req, res, true); if (!k) return;
      send(req, res, 200, Object.assign(await store.subStats(), {noticesActive: (await store.listNotices(300)).filter(isLive).length}));
    }
  };

  /* one replay map layer: GET /api/geo/<id> */
  async function geoRoute(req, res) {
    const id = decodeURIComponent(new URL(req.url, "http://localhost").pathname.slice("/api/geo/".length));
    if (!/^[a-z0-9-]{2,120}$/.test(id)) return send(req, res, 404, {error: "not found"});
    const fc = await store.getGeo(id);
    return fc ? send(req, res, 200, {fc}, CACHE_FOREVER) : send(req, res, 404, {error: "not found"});
  }
  /* flood and heat summary for one country, or for the world map: GET /api/hazards/<CC> or /api/hazards/world */
  async function hazardsRoute(req, res) {
    const which = new URL(req.url, "http://localhost").pathname.slice("/api/hazards/".length);
    if (which !== "world" && !(/^[A-Z]{2}$/.test(which) && feeds.countries.has(which))) return send(req, res, 404, {error: "unknown country code"});
    const doc = await cached("hazards:" + which, () => feeds.hazards(which), 5000);
    send(req, res, 200, doc || (which === "world" ? {updated: null, countries: {}} : {c: which, updated: null, heat: [], rivers: [], alerts: [], disasters: [], scenes: {}, models: {}, sources: []}), CACHE_FEED);
  }
  const PREFIX_ROUTES = [["/api/geo/", geoRoute], ["/api/hazards/", hazardsRoute]];

  return async function handle(req, res) {
    secure(res, cfg.trustProxy, csp);
    let url;
    try { url = new URL(req.url, "http://localhost"); } catch (e) { return send(req, res, 400, {error: "bad request"}); }
    const method = req.method === "HEAD" ? "GET" : req.method;
    const prefixed = method === "GET" ? PREFIX_ROUTES.find(([p]) => url.pathname.startsWith(p)) : null;
    const route = prefixed ? prefixed[1] : routes[method + " " + url.pathname];
    try {
      if (route) {
        if (method === "POST" && req.headers.origin && !sameOrigin(req.headers.origin, req.headers.host)) return send(req, res, 403, {error: "cross-site request refused"});
        return await route(req, res);
      }
      if (url.pathname.startsWith("/api/")) return send(req, res, 404, {error: "not found"});
      if (method !== "GET") return send(req, res, 405, {error: "method not allowed"});
      return serveStatic(req, res, cfg.publicDir, url);
    } catch (e) {
      if (e instanceof InputError) return send(req, res, 400, {error: e.message});
      console.error(e);
      if (!res.headersSent) send(req, res, 500, {error: "Something went wrong."});
    }
  };
}
module.exports = {createApi, hashKey};
