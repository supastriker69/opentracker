"use strict";
/* Counters and timings for monitoring, in the Prometheus text format (GET /metrics).

   Each process counts in memory and adds its counts to the shared store every few seconds, so /metrics shows
   totals across every web server and sender, whichever one answers the scrape. Gauges (how old each data feed is,
   how many alerts are queued …) are read fresh from the store when scraped (monitor.js).

   Label values come only from fixed lists (route names, feed ids, result words), so the number of series stays small. */
const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const NAME = /^[a-z_][a-z0-9_]*$/;

const esc = v => String(v).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n");
const labelText = labels => {
  const keys = Object.keys(labels);
  return keys.length ? "{" + keys.map(k => `${k}="${esc(labels[k])}"`).join(",") + "}" : "";
};

function createMetrics({store, flushMs = 10000, log = console} = {}) {
  let pending = new Map();
  const add = (key, n) => pending.set(key, (pending.get(key) || 0) + n);
  let timer = null;

  function inc(name, labels = {}, n = 1) {
    if (!NAME.test(name)) throw new Error("bad metric name: " + name);
    add(name + labelText(labels), n);
  }
  function observe(name, labels, seconds) {
    if (!NAME.test(name)) throw new Error("bad metric name: " + name);
    for (const b of BUCKETS) add(`${name}_bucket${labelText(Object.assign({}, labels, {le: b}))}`, seconds <= b ? 1 : 0);   /* every bucket exists, even at 0 */
    add(`${name}_bucket${labelText(Object.assign({}, labels, {le: "+Inf"}))}`, 1);
    add(`${name}_sum${labelText(labels)}`, seconds);
    add(`${name}_count${labelText(labels)}`, 1);
  }
  /* adds this process's counts to the shared totals; on failure they are kept for the next try */
  async function flush() {
    if (!pending.size) return;
    const batch = pending;
    pending = new Map();
    try { await store.addMetrics(Object.fromEntries(batch)); }
    catch (e) { for (const [k, v] of batch) add(k, v); log.warn("metrics: could not save counts", {error: e.message}); }
  }
  /* the shared totals plus anything not yet saved */
  async function totals() {
    const out = Object.assign({}, await store.getMetrics());
    for (const [k, v] of pending) out[k] = (out[k] || 0) + v;
    return out;
  }
  return {
    inc, observe, flush, totals,
    start() { if (!timer) { timer = setInterval(() => { flush(); }, flushMs); timer.unref(); } },
    async stop() { clearInterval(timer); timer = null; await flush(); }
  };
}

/* Prometheus text: counters and histograms from the totals, gauges as [{name, help, labels, value}] */
function renderMetrics(totals, gauges = [], help = {}) {
  const families = new Map();   /* family name → {type, lines} */
  const family = (name, type) => { if (!families.has(name)) families.set(name, {type, lines: []}); return families.get(name); };
  /* order: by name, then labels, with histogram buckets in rising order and +Inf last */
  const le = k => { const m = k.match(/le="([^"]+)"/); return m ? (m[1] === "+Inf" ? Infinity : Number(m[1])) : 0; };
  const keys = Object.keys(totals).sort((a, b) => {
    const sa = a.replace(/,?le="[^"]+"/, ""), sb = b.replace(/,?le="[^"]+"/, "");
    return sa < sb ? -1 : sa > sb ? 1 : le(a) - le(b);
  });
  for (const key of keys) {
    const name = key.split("{")[0];
    const hist = name.match(/^(.*)_(bucket|sum|count)$/);
    const base = hist && Object.keys(totals).some(k => k.startsWith(hist[1] + "_bucket")) ? hist[1] : null;
    family(base || name, base ? "histogram" : "counter").lines.push(`${key} ${+totals[key].toFixed(6)}`);
  }
  for (const g of gauges) family(g.name, "gauge").lines.push(`${g.name}${labelText(g.labels || {})} ${Number.isFinite(g.value) ? g.value : "NaN"}`);
  const out = [];
  for (const [name, f] of families) {
    if (help[name]) out.push(`# HELP ${name} ${help[name]}`);
    out.push(`# TYPE ${name} ${f.type}`, ...f.lines);
  }
  return out.join("\n") + "\n";
}

module.exports = {createMetrics, renderMetrics, BUCKETS};
