"use strict";
/* GDACS (Global Disaster Alert and Coordination System, United Nations and European Commission):
   current floods, tropical cyclones, droughts and other disasters worldwide, from its RSS feed.
   Each item carries an alert level (Green, Orange, Red), the country, dates, a point and a map box. */
const {parseXml, list, text, clip} = require("./xml");
const {FeedError} = require("./net");

const TYPES = {FL: "flood", TC: "tropical cyclone", DR: "drought", EQ: "earthquake", VO: "volcano", WF: "wildfire", TS: "tsunami"};
const LEVELS = ["Green", "Orange", "Red"];

const coord = (v, max) => { const n = Number(v); return Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 1e4) / 1e4 : null; };

/* "lonmin lonmax latmin latmax" → [west, south, east, north] */
function readBbox(s) {
  const n = String(s || "").trim().split(/\s+/).map(Number);
  if (n.length !== 4 || !n.every(Number.isFinite)) return null;
  const [w, e, s2, nn] = n;
  if (Math.abs(w) > 180 || Math.abs(e) > 180 || Math.abs(s2) > 90 || Math.abs(nn) > 90 || w > e || s2 > nn) return null;
  return [w, s2, e, nn].map(v => Math.round(v * 1e4) / 1e4);
}

function readPoint(item) {
  const p = item.Point;
  if (p && typeof p === "object") {
    const lon = coord(text(p.long), 180), lat = coord(text(p.lat), 90);
    if (lon !== null && lat !== null) return [lon, lat];
  }
  const g = text(item.point).split(/\s+/);   /* georss:point is "lat lon" */
  if (g.length === 2) { const lat = coord(g[0], 90), lon = coord(g[1], 180); if (lon !== null && lat !== null) return [lon, lat]; }
  return null;
}

const isoDate = s => { const t = Date.parse(text(s)); return Number.isFinite(t) ? new Date(t).toISOString() : null; };
const safeLink = s => { try { const u = new URL(text(s), "https://www.gdacs.org/"); return u.protocol === "https:" ? u.href : ""; } catch (e) { return ""; } };

/* RSS text → events; iso3to2 maps GDACS's three-letter codes to Open Tracker's two-letter ones */
function parseGdacs(xml, iso3to2) {
  const doc = parseXml(xml);
  const channel = doc && doc.rss && doc.rss.channel;
  if (!channel) throw new FeedError("not a GDACS RSS feed");
  const out = [];
  for (const item of list(channel.item)) {
    const type = text(item.eventtype).toUpperCase(), id = text(item.eventid);
    if (!TYPES[type] || !/^\d{1,10}$/.test(id)) continue;
    const level = LEVELS.find(l => l.toLowerCase() === text(item.alertlevel).toLowerCase()) || "Green";
    const countries = [...new Set(text(item.iso3).split(/[,;\s]+/).map(c => iso3to2[c.toUpperCase()]).filter(Boolean))];
    out.push({
      id: `gdacs-${type}-${id}`, source: "gdacs", type, hazard: TYPES[type], level,
      title: clip(text(item.title), 160), countries, place: clip(text(item.country), 120),
      from: isoDate(item.fromdate), to: isoDate(item.todate), current: text(item.iscurrent).toLowerCase() === "true",
      ll: readPoint(item), bbox: readBbox(text(item.bbox)), link: safeLink(item.link),
      severity: clip(text(item.severity), 160), population: clip(text(item.population), 160)
    });
  }
  return out;
}

module.exports = {parseGdacs, readBbox, TYPES};
