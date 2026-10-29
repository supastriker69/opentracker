"use strict";
/* Satellite pictures of current floods: for each active GDACS flood, the newest Sentinel-2 (optical, 10 m)
   and Sentinel-1 (radar, sees through cloud) scenes, found through a STAC catalogue (Earth Search on AWS by default).
   These are the inputs administrators turn into date-by-date flood outlines (satellite/ tools). */
const {FeedError} = require("./net");

const COLLECTIONS = {optical: "sentinel-2-l2a", radar: "sentinel-1-grd"};
const MAX_SPAN = 2;   /* degrees: very large event boxes are cut down around the event's point */

/* a search box no wider than MAX_SPAN degrees, around the point when the event box is too big */
function searchBox(ev) {
  if (ev.bbox && ev.bbox[2] - ev.bbox[0] <= MAX_SPAN && ev.bbox[3] - ev.bbox[1] <= MAX_SPAN) return ev.bbox;
  if (!ev.ll) return null;
  const h = MAX_SPAN / 2, clamp = (v, m) => Math.max(-m, Math.min(m, v));
  return [clamp(ev.ll[0] - h, 180), clamp(ev.ll[1] - h, 90), clamp(ev.ll[0] + h, 180), clamp(ev.ll[1] + h, 90)];
}

function searchBody(collection, bbox, sinceIso, untilIso, maxCloud) {
  const body = {collections: [collection], bbox, datetime: `${sinceIso}/${untilIso}`, limit: 5, sortby: [{field: "properties.datetime", direction: "desc"}]};
  if (collection === COLLECTIONS.optical) body.query = {"eo:cloud_cover": {lt: maxCloud}};
  return body;
}

const httpsHref = a => (a && typeof a.href === "string" && /^https:\/\//.test(a.href) ? a.href : null);

function readItems(json, kind) {
  if (!json || !Array.isArray(json.features)) throw new FeedError("not a STAC search answer");
  return json.features.slice(0, 5).map(f => {
    const p = f.properties || {}, a = f.assets || {};
    return {id: String(f.id || "").slice(0, 120), kind, at: typeof p.datetime === "string" ? p.datetime : null,
      cloud: typeof p["eo:cloud_cover"] === "number" ? Math.round(p["eo:cloud_cover"]) : null,
      preview: httpsHref(a.thumbnail) || httpsHref(a.rendered_preview), data: httpsHref(a.visual) || httpsHref(a.vv) || null};
  }).filter(s => s.id && s.at);
}

/* events: GDACS events; returns {<event id>: [scenes]} for current floods */
async function findScenes(net, stacUrl, events, {days = 10, maxCloud = 40, now = Date.now()} = {}) {
  const since = new Date(now - days * 864e5).toISOString(), until = new Date(now).toISOString();
  const out = {}, errors = [];
  for (const ev of events.filter(e => e.type === "FL" && e.current).slice(0, 30)) {
    const bbox = searchBox(ev);
    if (!bbox) continue;
    out[ev.id] = [];
    for (const [kind, collection] of Object.entries(COLLECTIONS)) {
      try {
        const {json} = await net.postJson(`${stacUrl}/search`, searchBody(collection, bbox, since, until, maxCloud), {maxBytes: 4 * 1024 * 1024});
        out[ev.id].push(...readItems(json, kind));
      } catch (e) { errors.push(`${ev.id} ${kind}: ${e.message}`); }
    }
  }
  return {byEvent: out, errors};
}

module.exports = {findScenes, searchBox, searchBody, readItems};
