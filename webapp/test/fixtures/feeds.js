"use strict";
/* Sample answers shaped like the real services' (field names checked against live answers or the services' docs). */

/* Open-Meteo forecast for n places: a JSON object for one place, an array for several */
function openMeteoForecast(n, {past = 30, days = 7, tmean = 30, wetBulb = 25, start = "2026-09-30"} = {}) {
  const total = past + days, t0 = Date.parse(start + "T00:00:00Z");
  const time = Array.from({length: total}, (_, i) => new Date(t0 + i * 864e5).toISOString().slice(0, 10));
  const col = f => time.map((_, i) => Math.round(f(i) * 10) / 10);
  const one = k => ({latitude: 6 + k, longitude: 3 + k, timezone: "Africa/Lagos", utc_offset_seconds: 3600,
    daily: {time, temperature_2m_max: col(i => tmean + 6 + (i >= past ? 2 : 0)), temperature_2m_min: col(() => tmean - 5), temperature_2m_mean: col(i => tmean + (i >= past ? 1 : 0)),
      apparent_temperature_max: col(() => tmean + 9), wet_bulb_temperature_2m_max: col(i => (i >= past ? wetBulb : 24)), relative_humidity_2m_min: col(() => 30),
      precipitation_sum: col(() => 0), precipitation_probability_max: col(() => 5), weather_code: col(() => 1), uv_index_max: col(() => 10)}});
  return n === 1 ? one(0) : Array.from({length: n}, (_, k) => one(k));
}

/* ERA5 daily temperatures for one place: a seasonal cycle around 26 °C */
function openMeteoArchive(years) {
  const n = years * 365, t0 = Date.parse("2016-01-01T00:00:00Z");
  const mean = Array.from({length: n}, (_, d) => Math.round((26 + 4 * Math.sin(2 * Math.PI * d / 365) + ((d * 7919) % 13) / 6) * 10) / 10);
  return {daily: {time: mean.map((_, d) => new Date(t0 + d * 864e5).toISOString().slice(0, 10)), temperature_2m_mean: mean, temperature_2m_max: mean.map(t => t + 7)}};
}

/* Sentinel scenes from a STAC search */
const stacSearch = collection => ({type: "FeatureCollection", features: [{id: `${collection}-scene-1`, properties: {datetime: "2026-10-26T09:50:00Z", "eo:cloud_cover": 18},
  assets: {thumbnail: {href: "https://earth-search.example.org/t.jpg"}, visual: {href: "https://earth-search.example.org/v.tif"}}}]});

/* GloFAS river flow for n places */
function openMeteoFlood(n, q = [100, 130, 170, 200, 190, 160, 140]) {
  const one = {daily: {time: q.map((_, i) => `2026-10-${String(28 + i).padStart(2, "0")}`), river_discharge: q, river_discharge_median: q, river_discharge_max: q.map(v => v * 1.3), river_discharge_min: q.map(v => v * 0.7)}};
  return n === 1 ? one : Array(n).fill(one);
}

const GDACS_RSS = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:gdacs="http://www.gdacs.org" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#" xmlns:georss="http://www.georss.org/georss" version="2.0"><channel>
<title>GDACS</title>
<item><title>Orange flood alert in Nigeria</title><link>https://www.gdacs.org/report.aspx?eventtype=FL&amp;eventid=1103999</link>
<gdacs:eventtype>FL</gdacs:eventtype><gdacs:eventid>1103999</gdacs:eventid><gdacs:alertlevel>Orange</gdacs:alertlevel>
<gdacs:country>Nigeria</gdacs:country><gdacs:iso3>NGA</gdacs:iso3><gdacs:fromdate>Mon, 20 Oct 2026 00:00:00 GMT</gdacs:fromdate><gdacs:todate>Tue, 28 Oct 2026 00:00:00 GMT</gdacs:todate>
<gdacs:iscurrent>true</gdacs:iscurrent><geo:Point><geo:lat>11.85</geo:lat><geo:long>13.15</geo:long></geo:Point><gdacs:bbox>9 15 7 13</gdacs:bbox>
<gdacs:severity unit="" value="0">Magnitude 0</gdacs:severity><gdacs:population unit="" value="0">12 deaths and 3000 displaced</gdacs:population></item>
<item><title>Green flood alert in Indonesia</title><link>report.aspx?eventtype=FL&amp;eventid=1103721</link><gdacs:eventtype>FL</gdacs:eventtype><gdacs:eventid>1103721</gdacs:eventid>
<gdacs:alertlevel>Green</gdacs:alertlevel><gdacs:iso3>IDN</gdacs:iso3><gdacs:iscurrent>false</gdacs:iscurrent><georss:point>-8.7892855 117.146169</georss:point></item>
<item><title>Something else</title><gdacs:eventtype>XX</gdacs:eventtype><gdacs:eventid>1</gdacs:eventid></item>
</channel></rss>`;

const CAP_ATOM = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Warnings</title><id>urn:x</id><updated>2026-10-28T08:00:00Z</updated>
<entry><id>urn:alert:1</id><title>Heat</title><updated>2026-10-28T08:00:00Z</updated><link rel="alternate" type="text/html" href="https://alerts.example.org/1.html"/><link rel="related" type="application/cap+xml" href="/cap/1.xml"/></entry>
<entry><id>urn:alert:2</id><title>Flood</title><updated>2026-10-28T08:00:00Z</updated><link href="https://alerts.example.org/cap/2.xml"/></entry>
<entry><id>urn:alert:3</id><title>Insecure</title><updated>2026-10-28T08:00:00Z</updated><link type="application/cap+xml" href="http://alerts.example.org/cap/3.xml"/></entry>
</feed>`;

const CAP_RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Warnings</title><link>https://alerts.example.org/</link><description>d</description>
<item><title>Heat</title><guid>alert-9</guid><enclosure url="https://alerts.example.org/cap/9.xml" type="application/cap+xml" length="0"/></item></channel></rss>`;

function capAlert({id, event = "Heat Wave", status = "Actual", msgType = "Alert", references = "", polygon = "", circle = "", expires = "2099-01-01T00:00:00+01:00"}) {
  return `<?xml version="1.0" encoding="UTF-8"?><alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
<identifier>${id}</identifier><sender>nimet@example.org</sender><sent>2026-10-27T10:00:00+01:00</sent><status>${status}</status><msgType>${msgType}</msgType><scope>Public</scope>
${references ? `<references>${references}</references>` : ""}
<info><language>en-NG</language><category>Met</category><event>${event}</event><urgency>Expected</urgency><severity>Severe</severity><certainty>Likely</certainty>
<effective>2026-10-27T10:00:00+01:00</effective><expires>${expires}</expires><senderName>Nigerian Meteorological Agency</senderName>
<headline>${event} for the north</headline><description>Very hot days ahead.</description><instruction>Drink water.</instruction><web>https://nimet.example.org/warnings</web>
<area><areaDesc>Kano, Jigawa</areaDesc>${polygon ? `<polygon>${polygon}</polygon>` : ""}${circle ? `<circle>${circle}</circle>` : ""}</area></info></alert>`;
}

/* WeatherEx: the shape returned by meteo.weatherex.ai/api/forecast (checked on 27 Oct 2026) */
const WEATHEREX = {success: true, comparisonMode: true, source: "WeatherEx /v1/forecast API", models: [
  {success: true, model: "gfs", rows: [
    {forecastHour: 0, timestamp_key: "2026-10-27T00:00:00.000Z", temperature: 26.59, temperature_raw: 299.744},
    {forecastHour: 9, timestamp_key: "2026-10-27T09:00:00.000Z", temperature: 32.57, temperature_raw: 305.716},
    {forecastHour: 30, timestamp_key: "2026-10-28T06:00:00.000Z", temperature: 30.1, temperature_raw: 303.25},
    {forecastHour: 31, timestamp_key: "bad", temperature: 99}]},
  {success: true, model: "unknown-model", rows: []}], meta: {totalModels: 2}};

module.exports = {openMeteoForecast, openMeteoArchive, stacSearch, openMeteoFlood, GDACS_RSS, CAP_ATOM, CAP_RSS, capAlert, WEATHEREX};
