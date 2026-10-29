"use strict";
/* Turns the raw feed documents into one small summary per country ("hazards:<CC>") and one for the world map
   ("hazards:world"). Pure functions: the feed runner reads the documents, these decide what people see. */
const {rateDays} = require("./heat");
const {current} = require("./cap");

const ALERT_FIELDS = ["id", "source", "agency", "hazard", "event", "headline", "description", "instruction", "severity", "urgency", "certainty", "effective", "onset", "expires", "web", "areas"];
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));

/* heat ratings for one country's places */
function heatFor(places, forecast, baselines) {
  const out = [];
  for (const p of places) {
    const f = forecast && forecast.byPlace && forecast.byPlace[p.id];
    if (!f || !Array.isArray(f.days) || !f.days.length) continue;
    const base = baselines && baselines[p.id] ? baselines[p.id] : null;
    const rated = rateDays(f.days, f.past, base);
    const days = rated.map((r, i) => Object.assign(r, {rain: f.days[i].rain, rainChance: f.days[i].rainChance, code: f.days[i].code, uv: f.days[i].uv}));
    const top = Math.max(...days.slice(0, 3).map(d => d.level));   /* the next three days decide the place's level */
    out.push({id: p.id, n: p.n, a1: p.a1, ll: p.ll, pop: p.pop, level: top, local: !!base, days});
  }
  return out.sort((a, b) => b.level - a.level || b.pop - a.pop);
}

function riversFor(places, rivers) {
  const out = [];
  for (const p of places) {
    const r = rivers && rivers.byPlace && rivers.byPlace[p.id];
    if (r) out.push({id: p.id, n: p.n, ll: p.ll, river: p.river, today: r.today, peak7: r.peak7, peak30: r.peak30, trend: r.trend, days: r.days});
  }
  return out;
}

/* one country's summary. inputs: {c, places, forecast, rivers, models, baselines, disasters, alerts, scenes, at} */
function countryDoc({c, places, forecast, rivers, models, baselines, disasters, alerts, scenes, at}) {
  const heat = heatFor(places, forecast, baselines);
  const events = (disasters || []).filter(e => e.countries.includes(c));
  const sources = [];
  if (heat.length) sources.push("open-meteo-forecast");
  if (heat.some(h => h.local)) sources.push("open-meteo-baselines");
  const riverList = riversFor(places, rivers);
  if (riverList.length) sources.push("open-meteo-rivers");
  if (events.length) sources.push("gdacs");
  const official = current(alerts || []).slice(0, 100).map(a => pick(a, ALERT_FIELDS));
  if (official.length) sources.push("cap");
  const pictures = {};
  for (const e of events) if (scenes && scenes[e.id] && scenes[e.id].length) pictures[e.id] = scenes[e.id];
  if (Object.keys(pictures).length) sources.push("satellite-scenes");
  const compare = {};
  for (const p of places) if (models && models.byPlace && models.byPlace[p.id]) compare[p.id] = models.byPlace[p.id];
  if (Object.keys(compare).length) sources.push("weatherex");
  return {c, updated: at, heat, rivers: riverList, alerts: official, disasters: events, scenes: pictures, models: compare, sources,
    note: "Heat levels and river trends are Open Tracker model estimates from open data, not official warnings. Official warnings are listed under alerts with the agency that issued them."};
}

/* the world map: the worst heat level in each country and how many alerts and disasters it has */
function worldDoc(countryDocs, at) {
  const countries = {};
  for (const d of countryDocs) {
    if (!d.heat.length && !d.alerts.length && !d.disasters.length && !d.rivers.length) continue;
    countries[d.c] = {heat: d.heat.length ? d.heat[0].level : null, dangerPlaces: d.heat.filter(h => h.level >= 3).length,
      alerts: d.alerts.length, floodAlerts: d.alerts.filter(a => a.hazard === "flood").length, heatAlerts: d.alerts.filter(a => a.hazard === "heat").length,
      disasters: d.disasters.filter(e => e.current).length, risingRivers: d.rivers.filter(r => r.trend === "rising fast").length};
  }
  return {updated: at, countries};
}

module.exports = {countryDoc, worldDoc, heatFor};
