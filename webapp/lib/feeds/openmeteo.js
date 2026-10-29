"use strict";
/* Open-Meteo (open-meteo.com): forecasts, past weather and river flow for any point on Earth.
   Licence CC BY 4.0: every screen that shows these numbers credits "Weather data by Open-Meteo.com".
   The free public service is for non-commercial use under 10,000 calls a day; for more, set OPEN_METEO_KEY
   (paid plan) or point the URLs at your own copy of the open-source Open-Meteo server. */
const {FeedError} = require("./net");

const FORECAST_DAILY = ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean", "apparent_temperature_max",
  "wet_bulb_temperature_2m_max", "relative_humidity_2m_min", "precipitation_sum", "precipitation_probability_max",
  "weather_code", "uv_index_max"];   /* 10 variables: one call per place and window */
const FLOOD_DAILY = ["river_discharge", "river_discharge_median", "river_discharge_max", "river_discharge_min"];
const ARCHIVE_DAILY = ["temperature_2m_mean", "temperature_2m_max"];
const PER_REQUEST = 50;   /* places per request */

/* the public hosts, or the paid "customer-" hosts when a key is set */
function endpoints(cfg) {
  const host = (name, custom) => custom || `https://${cfg.openMeteoKey ? "customer-" : ""}${name}.open-meteo.com`;
  return {forecast: host("api", cfg.openMeteoUrl), flood: host("flood-api", cfg.openMeteoFloodUrl), archive: host("archive-api", cfg.openMeteoArchiveUrl)};
}

function query(params, key) {
  const q = new URLSearchParams(params);
  if (key) q.set("apikey", key);
  return q.toString();
}
const coords = list => ({latitude: list.map(p => p.ll[1]).join(","), longitude: list.map(p => p.ll[0]).join(",")});

function chunks(list, size = PER_REQUEST) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/* one location gives an object, several give an array */
function asList(json, expected) {
  const list = Array.isArray(json) ? json : [json];
  if (list.length !== expected) throw new FeedError(`expected ${expected} locations, got ${list.length}`);
  for (const item of list) if (item && item.error) throw new FeedError("Open-Meteo: " + String(item.reason || "error").slice(0, 200));
  return list;
}

const num = v => (typeof v === "number" && Number.isFinite(v) ? v : null);

/* ---------- forecast: heat and rain ---------- */
function forecastUrl(base, places, {pastDays, days, key}) {
  return `${base}/v1/forecast?` + query(Object.assign(coords(places), {daily: FORECAST_DAILY.join(","), past_days: String(pastDays),
    forecast_days: String(days), timezone: "auto"}), key);
}

/* one location's daily block → {past: [daily means], days: [{date, ...}]} */
function readForecast(loc, pastDays) {
  const d = loc && loc.daily;
  if (!d || !Array.isArray(d.time)) throw new FeedError("no daily forecast in the answer");
  const col = name => (Array.isArray(d[name]) ? d[name] : []);
  const rows = d.time.map((date, i) => ({
    date, tmax: num(col("temperature_2m_max")[i]), tmin: num(col("temperature_2m_min")[i]), tmean: num(col("temperature_2m_mean")[i]),
    feels: num(col("apparent_temperature_max")[i]), wetBulb: num(col("wet_bulb_temperature_2m_max")[i]), rhMin: num(col("relative_humidity_2m_min")[i]),
    rain: num(col("precipitation_sum")[i]), rainChance: num(col("precipitation_probability_max")[i]), code: num(col("weather_code")[i]), uv: num(col("uv_index_max")[i])
  }));
  return {past: rows.slice(0, pastDays).map(r => r.tmean), days: rows.slice(pastDays), tz: typeof loc.timezone === "string" ? loc.timezone : null};
}

async function fetchForecasts(net, cfg, places, {pastDays = 30, days = 7} = {}) {
  const base = endpoints(cfg).forecast, out = {}, errors = [];
  for (const group of chunks(places)) {
    try {
      const {json} = await net.getJson(forecastUrl(base, group, {pastDays, days, key: cfg.openMeteoKey}), {maxBytes: 8 * 1024 * 1024, timeoutMs: 30000});
      asList(json, group.length).forEach((loc, i) => { out[group[i].id] = readForecast(loc, pastDays); });
    } catch (e) { errors.push(e.message); }
  }
  if (!Object.keys(out).length && errors.length) throw new FeedError(errors[0]);
  return {byPlace: out, errors};
}

/* ---------- river flow (GloFAS through the Open-Meteo Flood API) ---------- */
function floodUrl(base, rivers, {days, key}) {
  const pts = rivers.map(r => ({ll: r.river}));
  return `${base}/v1/flood?` + query(Object.assign(coords(pts), {daily: FLOOD_DAILY.join(","), forecast_days: String(days)}), key);
}

/* daily flow → today's flow, the highest expected in the next 7 and 30 days, and the trend */
function readFlood(loc) {
  const d = loc && loc.daily;
  if (!d || !Array.isArray(d.time) || !Array.isArray(d.river_discharge)) throw new FeedError("no river flow in the answer");
  const q = d.river_discharge.map(num), qmax = (d.river_discharge_max || []).map(num);
  const today = q[0];
  const peak = (n) => { const xs = q.slice(0, n).filter(v => v !== null); return xs.length ? Math.max(...xs) : null; };
  const p7 = peak(7), p30 = peak(30);
  const trend = today === null || p7 === null || today <= 0 ? "unknown" : p7 >= today * 1.5 ? "rising fast" : p7 >= today * 1.1 ? "rising" : "steady or falling";
  return {today, peak7: p7, peak30: p30, trend, days: d.time.slice(0, 30).map((date, i) => ({date, q: q[i], qmax: num(qmax[i])}))};
}

async function fetchRivers(net, cfg, rivers, {days = 30} = {}) {
  const base = endpoints(cfg).flood, out = {}, errors = [];
  for (const group of chunks(rivers)) {
    try {
      const {json} = await net.getJson(floodUrl(base, group, {days, key: cfg.openMeteoKey}), {maxBytes: 8 * 1024 * 1024, timeoutMs: 30000});
      asList(json, group.length).forEach((loc, i) => { out[group[i].id] = readFlood(loc); });
    } catch (e) { errors.push(e.message); }
  }
  if (!Object.keys(out).length && errors.length) throw new FeedError(errors[0]);
  return {byPlace: out, errors};
}

/* ---------- past weather for a place's heat baseline (ERA5 through the Historical Weather API) ---------- */
function archiveUrl(base, place, {start, end, key}) {
  return `${base}/v1/archive?` + query({latitude: String(place.ll[1]), longitude: String(place.ll[0]), start_date: start, end_date: end,
    daily: ARCHIVE_DAILY.join(","), models: "era5", timezone: "auto"}, key);
}

async function fetchPastTemperatures(net, cfg, place, {years, endYear}) {
  const start = `${endYear - years + 1}-01-01`, end = `${endYear}-12-31`;
  const {json} = await net.getJson(archiveUrl(endpoints(cfg).archive, place, {start, end, key: cfg.openMeteoKey}), {maxBytes: 16 * 1024 * 1024, timeoutMs: 60000});
  const d = json && json.daily;
  if (!d || !Array.isArray(d.temperature_2m_mean)) throw new FeedError("no past temperatures in the answer");
  return {tmean: d.temperature_2m_mean.map(num), tmax: (d.temperature_2m_max || []).map(num)};
}

module.exports = {endpoints, forecastUrl, floodUrl, archiveUrl, readForecast, readFlood, fetchForecasts, fetchRivers, fetchPastTemperatures, chunks, FORECAST_DAILY};
