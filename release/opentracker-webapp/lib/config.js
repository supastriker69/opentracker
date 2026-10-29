"use strict";
/* Every setting comes from the environment, so the same build runs on a laptop or on hundreds of servers. */
const path = require("node:path");
const os = require("node:os");

const {SOURCES} = require("./feeds/catalog");

const FEED_IDS = SOURCES.map(s => s.id);

/* a whole number from the environment, kept within [min, max] */
function int(v, fallback, min, max) {
  const n = v === undefined || v === "" ? fallback : Math.round(Number(v));
  if (!Number.isFinite(n)) throw new Error(`not a number: ${v}`);
  return Math.min(max, Math.max(min, n));
}
/* an https base address without a trailing slash, or "" */
function httpsBase(v, name) {
  if (!v) return "";
  let u;
  try { u = new URL(v); } catch (e) { throw new Error(`${name} is not a web address`); }
  if (u.protocol !== "https:") throw new Error(`${name} must start with https://`);
  return u.href.replace(/\/+$/, "");
}
/* a map address that may hold {z}/{x}/{y} or {fontstack}/{range} placeholders; "off" turns it off */
function mapUrl(v, fallback, name) {
  if (v === "off") return "";
  const s = v || fallback;
  if (!/^https:\/\/[^\s"'<>]+$/.test(s)) throw new Error(`${name} must be an https address (or "off")`);
  try { new URL(s.replace(/[{}]/g, "")); } catch (e) { throw new Error(`${name} is not a web address`); }
  return s;
}
function feedsOff(v) {
  const list = String(v || "").split(",").map(s => s.trim()).filter(Boolean);
  const bad = list.filter(s => s !== "all" && !FEED_IDS.includes(s));
  if (bad.length) throw new Error(`FEEDS_OFF: unknown feeds ${bad.join(", ")} (known: ${FEED_IDS.join(", ")}, all)`);
  return new Set(list);
}

function loadConfig(env = process.env) {
  const redisUrl = env.REDIS_URL || "";
  const workers = env.WORKERS === "auto" ? os.availableParallelism() : Math.max(1, +(env.WORKERS || 1));
  if (!redisUrl && workers > 1) throw new Error("WORKERS above 1 needs shared storage: set REDIS_URL.");
  return Object.freeze({
    port: +(env.PORT || 8080),
    host: env.HOST || "127.0.0.1",
    publicDir: path.resolve(env.PUBLIC_DIR || path.join(__dirname, "..", "public")),
    dataDir: path.resolve(env.DATA_DIR || path.join(__dirname, "..", ".data")),
    redisUrl,
    workers,
    role: env.ROLE || "all",                 /* "web" (HTTP only), "push" (notifications and data feeds only) or "all" */
    vapidSubject: env.VAPID_SUBJECT || "mailto:alerts@example.org",
    trustProxy: env.TRUST_PROXY === "1",
    weatherKey: env.GOOGLE_WEATHER_API_KEY || "",
    pushConcurrency: Math.min(500, Math.max(1, +(env.PUSH_CONCURRENCY || 50))),
    pushBatch: 500,
    maxNotices: 300,
    maxContributions: 100000,

    /* data feeds (docs: webapp/README.md → Data feeds) */
    feedsOff: feedsOff(env.FEEDS_OFF),
    feedPlaces: int(env.FEED_PLACES, 300, 0, 100000),
    feedRivers: int(env.FEED_RIVERS, 150, 0, 100000),
    forecastEveryMs: int(env.FEED_FORECAST_HOURS, 6, 1, 24) * 3600e3,
    capEveryMs: int(env.CAP_EVERY_SEC, 120, 30, 3600) * 1000,
    baselineEveryMs: int(env.BASELINE_EVERY_MIN, 90, 1, 1440) * 60e3,
    baselinePerRun: int(env.BASELINE_PER_RUN, 1, 1, 1000),
    baselineYears: int(env.BASELINE_YEARS, 10, 3, 60),
    openMeteoKey: env.OPEN_METEO_KEY || "",
    openMeteoUrl: httpsBase(env.OPEN_METEO_URL, "OPEN_METEO_URL"),
    openMeteoFloodUrl: httpsBase(env.OPEN_METEO_FLOOD_URL, "OPEN_METEO_FLOOD_URL"),
    openMeteoArchiveUrl: httpsBase(env.OPEN_METEO_ARCHIVE_URL, "OPEN_METEO_ARCHIVE_URL"),
    gdacsUrl: httpsBase(env.GDACS_URL, "GDACS_URL") || "https://www.gdacs.org/xml/rss.xml",
    stacUrl: httpsBase(env.STAC_URL, "STAC_URL") || "https://earth-search.aws.element84.com/v1",
    weatherexEnabled: env.WEATHEREX_ENABLED === "1",
    weatherexUrl: httpsBase(env.WEATHEREX_URL, "WEATHEREX_URL") || "https://meteo.weatherex.ai",
    weatherexPlaces: int(env.WEATHEREX_PLACES, 30, 0, 5000),

    /* 3D map in the browser: street map (vector TileJSON), its fonts, and ground heights (Terrarium PNG tiles) */
    mapTiles: mapUrl(env.MAP_TILES_URL, "https://tiles.openfreemap.org/planet", "MAP_TILES_URL"),
    mapGlyphs: mapUrl(env.MAP_GLYPHS_URL, "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf", "MAP_GLYPHS_URL"),
    mapTerrain: mapUrl(env.TERRAIN_TILES_URL, "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", "TERRAIN_TILES_URL")
  });
}
module.exports = {loadConfig, FEED_IDS};
