"use strict";
/* Heat model: pure functions, no I/O.

   Two kinds of evidence decide a day's heat level:
   1. Unusual for this place (needs the place's baseline from past weather):
      - hot day: daily high at or above the local 90th percentile, or daily mean at or above the local 90th;
      - heatwave: Excess Heat Factor (Nairn & Fawcett) above zero; its severity is EHF / EHF85;
   2. Dangerous for any human body, wherever it is:
      - wet-bulb temperature (sweat stops cooling the body near 31 °C);
      - NOAA heat index from the daily high and the afternoon humidity.

   Levels: 0 normal · 1 hot · 2 heatwave · 3 dangerous heat · 4 extreme danger. */

const LEVELS = ["normal", "hot", "heatwave", "danger", "extreme"];
const LIMITS = Object.freeze({
  wetBulbDanger: 28, wetBulbExtreme: 30,        /* °C */
  heatIndexHot: 39.4, heatIndexDanger: 41, heatIndexExtreme: 52,   /* °C (NOAA: 103 °F, 106 °F, 125 °F) */
  severeEhf: 1, extremeEhf: 3                   /* EHF / EHF85 */
});
const MIN_BASELINE_DAYS = 3 * 365;

const finite = v => typeof v === "number" && Number.isFinite(v);
const r1 = v => Math.round(v * 10) / 10;

/* linear-interpolated percentile (0-100) of the finite values, or null */
function percentile(values, p) {
  const xs = values.filter(finite).sort((a, b) => a - b);
  if (!xs.length) return null;
  const pos = (xs.length - 1) * p / 100, lo = Math.floor(pos), hi = Math.ceil(pos);
  return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
}

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

/* Excess Heat Factor for the 3 days starting at day i: needs days i-30 … i+2 of daily mean temperature. */
function ehf(tmean, i, t95) {
  if (i < 30 || i + 2 >= tmean.length) return null;
  const next3 = tmean.slice(i, i + 3), prev30 = tmean.slice(i - 30, i);
  if (!next3.every(finite) || prev30.filter(finite).length < 25) return null;
  const avg3 = mean(next3);
  const sig = avg3 - t95, accl = avg3 - mean(prev30.filter(finite));
  return sig * Math.max(1, accl);
}

/* A place's baseline from a long run of past days: {tmean: [...], tmax: [...]} in date order. */
function baselineFrom({tmean, tmax}, years) {
  if (!Array.isArray(tmean) || tmean.filter(finite).length < MIN_BASELINE_DAYS) throw new Error("a baseline needs at least 3 years of daily temperatures");
  const t95 = percentile(tmean, 95);
  const positive = [];
  for (let i = 30; i + 2 < tmean.length; i++) { const e = ehf(tmean, i, t95); if (e !== null && e > 0) positive.push(e); }
  const tmax90 = percentile(tmax || [], 90);
  return {t90: r1(percentile(tmean, 90)), t95: r1(t95), tmax90: tmax90 === null ? null : r1(tmax90),
    ehf85: positive.length ? Math.round(percentile(positive, 85) * 100) / 100 : null, years};
}

/* NOAA heat index (Rothfusz regression with NOAA's adjustments), °C in and out */
function heatIndex(tC, rh) {
  if (!finite(tC) || !finite(rh)) return null;
  const T = tC * 9 / 5 + 32, R = Math.min(100, Math.max(0, rh));
  let hi = 0.5 * (T + 61 + (T - 68) * 1.2 + R * 0.094);
  if ((hi + T) / 2 >= 80) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R - 0.00683783 * T * T
      - 0.05481717 * R * R + 0.00122874 * T * T * R + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
    if (R < 13 && T >= 80 && T <= 112) hi -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    else if (R > 85 && T >= 80 && T <= 87) hi += ((R - 85) / 10) * ((87 - T) / 5);
  }
  return r1((hi - 32) * 5 / 9);
}

/* Rates each forecast day.
   days: [{date, tmax, tmin, tmean, feels, wetBulb, rhMin}] in order; past: daily means of the 30 days before days[0];
   baseline: from baselineFrom() or null. Returns one rating per day: {date, level, name, why, ...measures}. */
function rateDays(days, past, baseline, limits = LIMITS) {
  const series = (past || []).concat(days.map(d => d.tmean));
  const offset = series.length - days.length;
  return days.map((d, k) => {
    let level = 0;
    const why = [];
    const raise = (lv, reason) => { if (lv > level) level = lv; why.push(reason); };
    const hi = heatIndex(d.tmax, d.rhMin);
    let severity = null;
    if (baseline) {
      if ((finite(d.tmax) && finite(baseline.tmax90) && d.tmax >= baseline.tmax90) || (finite(d.tmean) && d.tmean >= baseline.t90)) raise(1, "hotter than 9 in 10 days here");
      const e = ehf(series, offset + k, baseline.t95);
      if (e !== null && e > 0) {
        raise(2, "heatwave for this place");
        if (baseline.ehf85 > 0) {
          severity = Math.round(e / baseline.ehf85 * 100) / 100;
          if (severity >= limits.extremeEhf) raise(4, "extreme heatwave for this place");
          else if (severity >= limits.severeEhf) raise(3, "severe heatwave for this place");
        }
      }
    } else if (hi !== null && hi >= limits.heatIndexHot) raise(1, "very hot and humid");
    if (finite(d.wetBulb)) {
      if (d.wetBulb >= limits.wetBulbExtreme) raise(4, "wet-bulb near the limit of human cooling");
      else if (d.wetBulb >= limits.wetBulbDanger) raise(3, "wet-bulb dangerous for the body");
    }
    if (hi !== null) {
      if (hi >= limits.heatIndexExtreme) raise(4, "heat index extreme");
      else if (hi >= limits.heatIndexDanger) raise(3, "heat index dangerous");
    }
    return {date: d.date, level, name: LEVELS[level], why: [...new Set(why)], tmax: d.tmax, tmin: d.tmin, feels: d.feels, wetBulb: d.wetBulb, heatIndex: hi, severity, local: !!baseline};
  });
}

module.exports = {LEVELS, LIMITS, percentile, ehf, baselineFrom, heatIndex, rateDays, MIN_BASELINE_DAYS};
