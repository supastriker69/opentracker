"use strict";
/* Official warnings in the Common Alerting Protocol (CAP 1.2), the format national weather services and
   disaster agencies use worldwide. The WMO Register of Alerting Authorities lists each country's feeds.

   A feed (Atom or RSS) lists alerts; each entry links to one CAP message. Only real, public alerts are kept
   ("Actual" status, "Public" scope); cancellations remove the alerts they refer to. */
const {parseXml, list, text, clip} = require("./xml");
const {FeedError} = require("./net");

const CAP_TYPE = "application/cap+xml";
const FLOOD_RE = /flood|inundat|flash|river|heavy rain|rainfall|torrential|storm surge|tropical (storm|cyclone)|hurricane|typhoon|monsoon/i;
const HEAT_RE = /heat|high temperature|hot (day|weather|spell)|canicule|calor|hitze|thermal/i;
const MAX_POLYGONS = 20, MAX_POINTS = 1000;

/* ---------- the feed: which CAP messages does it list? ---------- */
function absolute(href, base) {
  try { const u = new URL(href, base); return u.protocol === "https:" ? u.href : null; } catch (e) { return null; }
}

/* feed text → [{id, updated, url}] */
function parseCapFeed(xml, feedUrl) {
  const doc = parseXml(xml);
  if (doc.alert) return [{id: text(doc.alert.identifier), updated: text(doc.alert.sent), url: feedUrl, inline: doc.alert}];   /* a single CAP message */
  const entries = doc.feed ? list(doc.feed.entry).map(e => {
    const links = list(e.link);
    const cap = links.find(l => l["@type"] === CAP_TYPE) || links.find(l => /related|alternate/.test(l["@rel"] || "alternate")) || links[0];
    return {id: text(e.id), updated: text(e.updated), url: cap ? absolute(cap["@href"], feedUrl) : null};
  }) : doc.rss && doc.rss.channel ? list(doc.rss.channel.item).map(i => {
    const enc = list(i.enclosure).find(x => x["@type"] === CAP_TYPE) || list(i.enclosure)[0];
    return {id: text(i.guid) || text(i.link), updated: text(i.pubDate), url: absolute(enc ? enc["@url"] : text(i.link), feedUrl)};
  }) : null;
  if (!entries) throw new FeedError("not an Atom or RSS feed");
  return entries.filter(e => e.id && e.url);
}

/* ---------- one CAP message ---------- */
const isoDate = v => { const t = Date.parse(text(v)); return Number.isFinite(t) ? new Date(t).toISOString() : null; };

/* "lat,lon lat,lon …" → [[lon, lat], …] closed ring, or null */
function readPolygon(s) {
  const pts = String(s).trim().split(/\s+/).slice(0, MAX_POINTS).map(pair => {
    const [lat, lon] = pair.split(",").map(Number);
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [Math.round(lon * 1e4) / 1e4, Math.round(lat * 1e4) / 1e4] : null;
  });
  if (pts.length < 4 || pts.some(p => p === null)) return null;
  return pts;
}
/* "lat,lon radius-km" → {ll, km} */
function readCircle(s) {
  const m = /^\s*(-?[\d.]+),(-?[\d.]+)\s+([\d.]+)\s*$/.exec(String(s));
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]), km = Number(m[3]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && km >= 0 && km <= 2000 ? {ll: [lon, lat], km} : null;
}

function hazardOf(info) {
  const words = [text(info.event), text(info.headline), ...list(info.category).map(text), ...list(info.eventCode).map(c => text(c.value))].join(" ");
  return HEAT_RE.test(words) ? "heat" : FLOOD_RE.test(words) ? "flood" : "other";
}

function pickInfo(infos, lang) {
  const english = infos.find(i => /^en\b/i.test(text(i.language)));
  return (lang && infos.find(i => text(i.language).toLowerCase().startsWith(lang))) || english || infos[0];
}

/* CAP XML (or an already-parsed <alert>) → a normalized alert, a cancellation, or null when it is not for the public */
function parseCapAlert(input, {country, agency, lang} = {}) {
  const alert = typeof input === "string" ? parseXml(input).alert : input;
  if (!alert || typeof alert !== "object") throw new FeedError("not a CAP message");
  const status = text(alert.status), scope = text(alert.scope), msgType = text(alert.msgType);
  if (status !== "Actual" || (scope && scope !== "Public")) return null;
  const id = clip(text(alert.identifier), 200), sender = clip(text(alert.sender), 200);
  if (!id) throw new FeedError("CAP message without an identifier");
  const references = text(alert.references).split(/\s+/).filter(Boolean).map(r => r.split(",")[1]).filter(Boolean);
  if (msgType === "Cancel") return {cancel: true, id, references};
  const infos = list(alert.info);
  if (!infos.length) return null;
  const info = pickInfo(infos, lang);
  const areas = list(info.area).slice(0, 20).map(a => ({
    desc: clip(text(a.areaDesc), 200),
    polygons: list(a.polygon).slice(0, MAX_POLYGONS).map(p => readPolygon(text(p))).filter(Boolean),
    circles: list(a.circle).slice(0, MAX_POLYGONS).map(c => readCircle(text(c))).filter(Boolean)
  }));
  const web = text(info.web);
  return {
    id: `cap-${country || "XX"}-${id}`.slice(0, 220), source: "cap", capId: id, sender, agency: agency || clip(text(info.senderName), 120) || sender,
    country: country || null, hazard: hazardOf(info), event: clip(text(info.event), 120), headline: clip(text(info.headline), 200),
    description: clip(text(info.description), 1500), instruction: clip(text(info.instruction), 800),
    severity: text(info.severity) || "Unknown", urgency: text(info.urgency) || "Unknown", certainty: text(info.certainty) || "Unknown",
    sent: isoDate(alert.sent), effective: isoDate(info.effective) || isoDate(alert.sent), onset: isoDate(info.onset), expires: isoDate(info.expires),
    web: /^https:\/\//i.test(web) ? absolute(web) || "" : "", references, areas, lang: text(info.language) || ""
  };
}

/* alerts still in force at `now`, newest first, with replaced and cancelled ones removed */
function current(alerts, now = Date.now()) {
  const replaced = new Set(alerts.flatMap(a => a.references || []));
  return alerts.filter(a => !replaced.has(a.capId) && (!a.expires || Date.parse(a.expires) > now))
    .sort((a, b) => String(b.sent).localeCompare(String(a.sent)));
}

module.exports = {parseCapFeed, parseCapAlert, current, hazardOf, readPolygon, readCircle};
