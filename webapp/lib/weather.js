"use strict";
/* Google Weather (Google Maps Platform Weather API) → rain forecasts for each Open Tracker weather zone.
   Optional: runs only when GOOGLE_WEATHER_API_KEY is set. One request per zone every few hours.
   Official forecasts from GMet / NiMet always take priority in the app; these fill the gaps. */
const ENDPOINT = "https://weather.googleapis.com/v1/forecast/days:lookup";
const SOURCE = "Google Weather";

/* millimetres of rain in one half-day forecast, or null if the field is absent */
function qpf(part) {
  const q = part && part.precipitation && part.precipitation.qpf;
  const v = q ? Number(q.quantity) : NaN;
  if (!Number.isFinite(v) || v < 0) return null;
  return q.unit === "INCHES" ? v * 25.4 : v;
}
function dayRain(day) {
  const a = qpf(day.daytimeForecast), b = qpf(day.nighttimeForecast);
  return a === null && b === null ? null : (a || 0) + (b || 0);
}
function chance(day) {
  const p = [day.daytimeForecast, day.nighttimeForecast].map(x => Number(x?.precipitation?.probability?.percent)).filter(Number.isFinite);
  return p.length ? Math.max(...p) : null;
}
const r1 = x => Math.round(x * 10) / 10;

/* the API response → {mm24, mm72, pop} */
function summarize(json) {
  const days = json && json.forecastDays;
  if (!Array.isArray(days) || !days.length) throw new Error("no forecast days in the response");
  const rain = days.slice(0, 3).map(dayRain);
  if (rain[0] === null) throw new Error("no rain amount in the response");
  return {mm24: r1(rain[0]), mm72: r1(rain.reduce((a, b) => a + (b || 0), 0)), pop: chance(days[0])};
}

async function fetchZone(key, ll, fetchImpl) {
  const q = new URLSearchParams({key, "location.latitude": String(ll[1]), "location.longitude": String(ll[0]), days: "3", unitsSystem: "METRIC"});
  const r = await fetchImpl(ENDPOINT + "?" + q, {signal: AbortSignal.timeout(10000)});
  if (!r.ok) throw new Error(`Google Weather answered ${r.status}`);
  return summarize(await r.json());
}

/* zones: {<zone id>: {n, ll: [lon, lat]}}. With several servers only the lock holder polls Google;
   every server answers from the shared store. */
function startWeather({key, zones, store, everyMs = 3 * 3600e3, fetchImpl = fetch, log = console, holder = String(process.pid)}) {
  async function run() {
    const prev = (await store.getWeather()) || {forecasts: []};
    const out = [], errors = [];
    for (const [zone, z] of Object.entries(zones)) {
      try { out.push(Object.assign({id: "gw-" + zone, zone, src: SOURCE, at: new Date().toISOString()}, await fetchZone(key, z.ll, fetchImpl))); }
      catch (e) { errors.push(`${zone}: ${e.message}`); }
    }
    const keep = (prev.forecasts || []).filter(f => !out.some(o => o.zone === f.zone));   /* zones that failed keep their last forecast */
    const next = {forecasts: out.concat(keep), updated: out.length ? new Date().toISOString() : prev.updated || null, error: errors.length ? errors.join("; ").slice(0, 500) : null};
    if (errors.length) log.error("Google Weather:", next.error);
    await store.putWeather(next);
  }
  async function tick() {
    try { if (await store.lock("weather", everyMs * 1.5, holder)) await run(); }
    catch (e) { log.error("Google Weather:", e.message); }
  }
  let timer = null;
  if (key) { tick(); timer = setInterval(tick, everyMs); timer.unref(); }
  return {
    async get() {
      const w = (await store.getWeather()) || {forecasts: [], updated: null, error: null};
      return {connected: !!key, source: SOURCE, updated: w.updated, error: w.error ? "Some zones could not be updated." : null, forecasts: w.forecasts};
    },
    run,
    stop() { clearInterval(timer); }
  };
}
module.exports = {startWeather, summarize, fetchZone};
