"use strict";
/* The data-feed service: keeps Open Tracker supplied with outside data, permanently.

   feed (scheduler.js)        source module           writes                         every
   open-meteo-forecast        openmeteo.js            forecast:<CC>                  FEED_FORECAST_HOURS (6 h)
   open-meteo-baselines       openmeteo.js + heat.js  heat-baselines                 BASELINE_EVERY_MIN (90 min), a few places per run
   open-meteo-rivers          openmeteo.js            rivers:<CC>                    12 h
   gdacs                      gdacs.js                gdacs-events                   10 min
   cap                        cap.js                  cap-alerts:<feed id>           CAP_EVERY_SEC (2 min)
   satellite-scenes           stac.js                 satellite-scenes               6 h
   weatherex (off by default) weatherex.js            models:<CC>                    6 h

   After any feed changes something, the publisher (hazards.js) rebuilds the per-country summaries
   "hazards:<CC>" and the world summary "hazards:world" that the API serves, then autoalerts.js checks for
   dangerous heat. Every source keeps its last good data when it fails. */
const crypto = require("node:crypto");
const {createNet} = require("./net");
const {createScheduler, readHealth} = require("./scheduler");
const {SOURCES} = require("./catalog");
const openmeteo = require("./openmeteo");
const {baselineFrom} = require("./heat");
const {parseGdacs} = require("./gdacs");
const {parseCapFeed, parseCapAlert, current} = require("./cap");
const {findScenes} = require("./stac");
const {fetchComparisons} = require("./weatherex");
const {countryDoc, worldDoc} = require("./hazards");
const {sendHeatAlerts} = require("./autoalerts");

const HOUR = 3600e3;
const MAX_CAP_FEEDS = 500, NEW_ALERTS_PER_FEED = 25, KEEP_ALERTS_PER_FEED = 300, KEEP_SEEN = 1000;

function groupBy(list, key) {
  const out = new Map();
  for (const x of list) { const k = key(x); if (!out.has(k)) out.set(k, []); out.get(k).push(x); }
  return out;
}
const hash = v => crypto.createHash("sha1").update(JSON.stringify(v)).digest("base64url");
const slug = s => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);

/* places: the world place list (capitals first); countries: the world country table */
function createFeeds({cfg, store, push, places = [], countries = [], net = createNet(), log = console, holder = String(process.pid), now = () => new Date()}) {
  const iso3to2 = Object.fromEntries(countries.map(c => [c.iso3, c.iso2]));
  const countryCodes = countries.length ? countries.map(c => c.iso2) : [...new Set(places.map(p => p.c))];
  const feedPlaces = places.slice(0, cfg.feedPlaces);
  const riverPlaces = feedPlaces.filter(p => Array.isArray(p.river)).slice(0, cfg.feedRivers);
  const placesByCountry = groupBy(feedPlaces, p => p.c);
  const enabled = id => !cfg.feedsOff.has("all") && !cfg.feedsOff.has(id) && (id !== "weatherex" || cfg.weatherexEnabled)
    && (!["open-meteo-forecast", "open-meteo-baselines", "open-meteo-rivers", "weatherex"].includes(id) || feedPlaces.length > 0);

  /* ---------- shared helpers ---------- */
  const stamp = () => now().toISOString();

  /* keeps one document per country, merging new results over the last good ones */
  async function writeByCountry(prefix, list, byPlace) {
    const at = stamp();
    for (const [c, ps] of groupBy(list, p => p.c)) {
      const fresh = ps.filter(p => byPlace[p.id]);
      if (!fresh.length) continue;
      const prev = (await store.getDoc(`${prefix}:${c}`)) || {byPlace: {}};
      const keep = new Set(ps.map(p => p.id));
      const merged = Object.fromEntries(Object.entries(Object.assign({}, prev.byPlace, Object.fromEntries(fresh.map(p => [p.id, byPlace[p.id]])))).filter(([id]) => keep.has(id)));
      await store.putDoc(`${prefix}:${c}`, {at, byPlace: merged});
    }
  }

  /* ---------- CAP feed list (administrators add each country's official feeds) ---------- */
  const capFeeds = {
    async list() { return ((await store.getDoc("cap-feeds")) || {feeds: []}).feeds; },
    async add({country, agency, url}, by) {
      const c = String(country || "").toUpperCase(), name = String(agency || "").trim();
      if (!/^[A-Z]{2}$/.test(c)) throw new RangeError("country must be a two-letter code");
      if (name.length < 2 || name.length > 120) throw new RangeError("agency name must be 2 to 120 characters");
      const u = await net.checkUrl(String(url || "").trim(), true).catch(e => { throw new RangeError("feed address: " + e.message); });
      const feeds = await capFeeds.list();
      if (feeds.length >= MAX_CAP_FEEDS) throw new RangeError(`at most ${MAX_CAP_FEEDS} feeds`);
      if (feeds.some(f => f.url === u.href)) throw new RangeError("that feed is already listed");
      let id = `${c.toLowerCase()}-${slug(name) || "agency"}`;
      for (let n = 2; feeds.some(f => f.id === id); n++) id = `${c.toLowerCase()}-${slug(name) || "agency"}-${n}`;
      const feed = {id, country: c, agency: name, url: u.href, added: stamp(), by: by || null};
      await store.putDoc("cap-feeds", {feeds: feeds.concat([feed])});
      return feed;
    },
    async remove(id) {
      const feeds = await capFeeds.list(), feed = feeds.find(f => f.id === id);
      if (!feed) return false;
      await store.putDoc("cap-feeds", {feeds: feeds.filter(f => f.id !== id)});
      await store.putDoc(`cap-alerts:${id}`, {alerts: [], seen: []});
      schedulePublish([feed.country]);
      return true;
    }
  };

  /* ---------- the feeds ---------- */
  async function runForecast() {
    const {byPlace, errors} = await openmeteo.fetchForecasts(net, cfg, feedPlaces);
    await writeByCountry("forecast", feedPlaces, byPlace);
    schedulePublish(null);
    return {summary: {places: Object.keys(byPlace).length, of: feedPlaces.length}, warnings: errors};
  }

  async function runBaselines() {
    const doc = (await store.getDoc("heat-baselines")) || {byPlace: {}};
    const stale = b => !b || b.years !== cfg.baselineYears || now().getTime() - Date.parse(b.at) > 400 * 864e5;
    const todo = feedPlaces.filter(p => stale(doc.byPlace[p.id])).slice(0, cfg.baselinePerRun);
    const endYear = now().getUTCFullYear() - 1, warnings = [], done = [];
    for (const p of todo) {
      try {
        const series = await openmeteo.fetchPastTemperatures(net, cfg, p, {years: cfg.baselineYears, endYear});
        doc.byPlace[p.id] = Object.assign(baselineFrom(series, cfg.baselineYears), {at: stamp(), endYear});
        done.push(p);
      } catch (e) { warnings.push(`${p.id}: ${e.message}`); }
    }
    if (todo.length && !done.length) throw new Error(warnings[0]);
    if (done.length) { await store.putDoc("heat-baselines", doc); schedulePublish(done.map(p => p.c)); }
    return {summary: {computed: done.length, remaining: feedPlaces.filter(p => stale(doc.byPlace[p.id])).length}, warnings};
  }

  async function runRivers() {
    const {byPlace, errors} = await openmeteo.fetchRivers(net, cfg, riverPlaces);
    await writeByCountry("rivers", riverPlaces, byPlace);
    schedulePublish(null);
    return {summary: {rivers: Object.keys(byPlace).length, of: riverPlaces.length}, warnings: errors};
  }

  async function runGdacs() {
    const r = await net.getText(cfg.gdacsUrl, {conditional: true, maxBytes: 8 * 1024 * 1024, accept: "application/rss+xml, application/xml"});
    if (r.notModified) return {summary: {unchanged: true}};
    const events = parseGdacs(r.text, iso3to2);
    await store.putDoc("gdacs-events", {at: stamp(), events});
    schedulePublish(null);
    return {summary: {events: events.length, floods: events.filter(e => e.type === "FL").length}};
  }

  async function runCap() {
    const feeds = await capFeeds.list(), warnings = [], changed = new Set();
    let fresh = 0, failed = 0;
    for (const feed of feeds) {
      try {
        const state = (await store.getDoc(`cap-alerts:${feed.id}`)) || {alerts: [], seen: [], retry: false};
        /* after a message failed to download, read the whole feed again even if it hasn't changed */
        const r = await net.getText(feed.url, {conditional: !state.retry, publicOnly: true, maxBytes: 2 * 1024 * 1024, accept: "application/atom+xml, application/rss+xml, application/xml"});
        if (r.notModified) continue;
        const seen = new Set(state.seen);
        const alerts = new Map(state.alerts.map(a => [a.capId, a]));
        let retry = false;
        for (const entry of parseCapFeed(r.text, feed.url).filter(e => !seen.has(e.id)).slice(0, NEW_ALERTS_PER_FEED)) {
          let body;
          try { body = entry.inline || (await net.getText(entry.url, {publicOnly: true, maxBytes: 512 * 1024})).text; }
          catch (e) { retry = true; warnings.push(`${feed.id}: ${e.message}`); continue; }   /* download failed: try again next run */
          seen.add(entry.id);
          try {
            const a = parseCapAlert(body, {country: feed.country, agency: feed.agency});
            if (!a) continue;
            if (a.cancel) { a.references.forEach(ref => alerts.delete(ref)); alerts.delete(a.id); }
            else { alerts.set(a.capId, a); fresh++; }
          } catch (e) { warnings.push(`${feed.id}: ${e.message}`); }   /* a broken message is not tried again */
        }
        const keep = current([...alerts.values()]).slice(0, KEEP_ALERTS_PER_FEED);
        await store.putDoc(`cap-alerts:${feed.id}`, {at: stamp(), alerts: keep, seen: [...seen].slice(-KEEP_SEEN), retry});
        changed.add(feed.country);
      } catch (e) { failed++; warnings.push(`${feed.id}: ${e.message}`); }
    }
    if (feeds.length && failed === feeds.length) throw new Error(`every CAP feed failed (${warnings[0]})`);
    if (changed.size) schedulePublish([...changed]);
    return {summary: {feeds: feeds.length, newAlerts: fresh}, warnings};
  }

  async function runScenes() {
    const events = ((await store.getDoc("gdacs-events")) || {events: []}).events;
    const {byEvent, errors} = await findScenes(net, cfg.stacUrl, events);
    await store.putDoc("satellite-scenes", {at: stamp(), byEvent});
    schedulePublish(null);
    return {summary: {floods: Object.keys(byEvent).length, scenes: Object.values(byEvent).reduce((n, l) => n + l.length, 0)}, warnings: errors};
  }

  async function runWeatherex() {
    const list = feedPlaces.slice(0, cfg.weatherexPlaces);
    const {byPlace, errors} = await fetchComparisons(net, cfg.weatherexUrl, list);
    await writeByCountry("models", list, byPlace);
    schedulePublish(null);
    return {summary: {places: Object.keys(byPlace).length, of: list.length}, warnings: errors};
  }

  const DEFS = [
    {id: "open-meteo-forecast", everyMs: cfg.forecastEveryMs, run: runForecast},
    {id: "open-meteo-baselines", everyMs: cfg.baselineEveryMs, run: runBaselines},
    {id: "open-meteo-rivers", everyMs: 12 * HOUR, run: runRivers},
    {id: "gdacs", everyMs: 10 * 60e3, run: runGdacs},
    {id: "cap", everyMs: cfg.capEveryMs, run: runCap},
    {id: "satellite-scenes", everyMs: 6 * HOUR, run: runScenes},
    {id: "weatherex", everyMs: 6 * HOUR, run: runWeatherex}
  ];
  const scheduler = createScheduler({store, holder, log});
  DEFS.filter(d => enabled(d.id)).forEach(d => scheduler.add(d));

  /* ---------- publishing the per-country summaries ---------- */
  const written = new Map();   /* country -> hash of the last summary this process wrote */
  let pending = null, timer = null, publishing = Promise.resolve();

  function schedulePublish(list) {
    if (pending !== "all") pending = list === null ? "all" : new Set([...(pending || []), ...list]);
    clearTimeout(timer);
    timer = setTimeout(() => { const which = pending; pending = null; publishing = publishing.then(() => publish(which)).catch(e => log.error("publish:", e.message)); }, 1500);
    timer.unref();
  }

  async function capAlertsByCountry() {
    const out = new Map();
    for (const feed of await capFeeds.list()) {
      const doc = await store.getDoc(`cap-alerts:${feed.id}`);
      if (!doc) continue;
      if (!out.has(feed.country)) out.set(feed.country, []);
      out.get(feed.country).push(...doc.alerts);
    }
    return out;
  }

  /* which: "all" or a Set of country codes */
  async function publish(which) {
    const at = stamp();
    const codes = which === "all" || !which ? countryCodes : [...which].filter(c => countryCodes.includes(c));
    const [baselines, gdacs, scenes, cap] = await Promise.all([store.getDoc("heat-baselines"), store.getDoc("gdacs-events"), store.getDoc("satellite-scenes"), capAlertsByCountry()]);
    const docs = [];
    for (const c of codes) {
      const [forecast, rivers, models] = await Promise.all(["forecast", "rivers", "models"].map(p => store.getDoc(`${p}:${c}`)));
      const doc = countryDoc({c, places: placesByCountry.get(c) || [], forecast, rivers, models, baselines: baselines && baselines.byPlace,
        disasters: gdacs ? gdacs.events : [], alerts: cap.get(c) || [], scenes: scenes ? scenes.byEvent : {}, at});
      docs.push(doc);
      const h = hash(Object.assign({}, doc, {updated: null}));
      if (written.get(c) === h) continue;
      await store.putDoc(`hazards:${c}`, doc);
      written.set(c, h);
    }
    const all = [];
    for (const c of countryCodes) { const d = docs.find(x => x.c === c) || (await store.getDoc(`hazards:${c}`)); if (d) all.push(d); }
    await store.putDoc("hazards:world", worldDoc(all, at));
    if (push) await sendHeatAlerts({store, push, countryDocs: docs, now: now(), log}).catch(e => log.error("heat alerts:", e.message));
    return docs.length;
  }

  /* ---------- what the API shows ---------- */
  async function sources({admin = false} = {}) {
    const health = await readHealth(store, SOURCES.map(s => s.id));
    return SOURCES.map(s => {
      const h = health[s.id], on = enabled(s.id);
      const base = Object.assign({}, s, {enabled: on, status: !on ? "off" : h ? h.status : "waiting", lastOk: h ? h.lastOk || null : null, nextRun: on && h ? h.nextRun || null : null});
      return admin ? Object.assign(base, {lastRun: h ? h.lastRun : null, error: h ? h.error : null, warnings: h ? h.warnings || [] : [], summary: h ? h.summary || {} : {}, failures: h ? h.failures || 0 : 0}) : base;
    });
  }

  return {
    start() { scheduler.start(); },
    stop() { scheduler.stop(); clearTimeout(timer); },
    runNow: id => scheduler.runNow(id),
    feeds: () => scheduler.ids(),
    sources,
    capFeeds,
    publish(which) { const run = publishing.then(() => publish(which || "all")); publishing = run.catch(() => {}); return run; },
    hazards: c => store.getDoc(`hazards:${c}`),
    countries: new Set(countryCodes)
  };
}

module.exports = {createFeeds};
