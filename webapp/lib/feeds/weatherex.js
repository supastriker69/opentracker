"use strict";
/* WeatherEx-meteo (meteo.weatherex.ai): the same place's forecast from several global models (GFS, ECMWF, ICON),
   so people can see how much the models agree. Off by default: WeatherEx publishes no terms of use yet,
   so turn it on (WEATHEREX_ENABLED=1) only with WeatherEx's permission. */
const {FeedError} = require("./net");

const MODELS = ["gfs", "ecmwf", "icon"];

function weatherexUrl(base, place, days) {
  const q = new URLSearchParams({latitude: String(place.ll[1]), longitude: String(place.ll[0]), models: MODELS.join(","),
    resolution: "1h", forecast_days: String(days), variables: "temperature"});
  return `${base}/api/forecast?${q}`;
}

/* answer → {<model>: [{date, tmax}]}: daily highest temperature (°C) per model, by UTC day */
function readComparison(json) {
  if (!json || json.success !== true || !Array.isArray(json.models)) throw new FeedError("not a WeatherEx answer");
  const out = {};
  for (const m of json.models) {
    if (!m || !MODELS.includes(m.model) || !Array.isArray(m.rows)) continue;
    const byDay = new Map();
    for (const r of m.rows) {
      const t = typeof r.temperature === "number" && Number.isFinite(r.temperature) ? r.temperature : null;
      const day = typeof r.timestamp_key === "string" ? r.timestamp_key.slice(0, 10) : null;
      if (t === null || !day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      byDay.set(day, Math.max(byDay.get(day) ?? -Infinity, t));
    }
    out[m.model] = [...byDay].map(([date, tmax]) => ({date, tmax: Math.round(tmax * 10) / 10}));
  }
  if (!Object.keys(out).length) throw new FeedError("WeatherEx returned no models");
  return out;
}

async function fetchComparisons(net, base, places, {days = 3} = {}) {
  const out = {}, errors = [];
  for (const p of places) {
    try { out[p.id] = readComparison((await net.getJson(weatherexUrl(base, p, days), {maxBytes: 4 * 1024 * 1024})).json); }
    catch (e) { errors.push(`${p.id}: ${e.message}`); }
  }
  if (!Object.keys(out).length && errors.length) throw new FeedError(errors[0]);
  return {byPlace: out, errors};
}

module.exports = {fetchComparisons, readComparison, weatherexUrl, MODELS};
