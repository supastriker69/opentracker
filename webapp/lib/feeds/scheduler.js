"use strict";
/* Runs each data feed on its own timer, forever.
   - With several servers, a shared lock lets exactly one of them run each feed; if it stops, another takes over.
   - A failing feed backs off (1, 2, 4 … minutes, never longer than its own interval or 30 minutes, whichever is
     longer) and keeps its last good data; nothing else is affected.
   - Every run records the feed's health (last success, last error, what it fetched) in the shared store. */

const healthKey = id => `feed-health:${id}`;
const MINUTE = 60e3;

function createScheduler({store, holder, log = console, random = Math.random, now = Date.now}) {
  const jobs = new Map();
  let stopped = false;

  function add(def) {
    if (!/^[a-z0-9-]{2,40}$/.test(def.id) || !(def.everyMs >= 10e3) || typeof def.run !== "function") throw new Error("bad feed definition: " + def.id);
    jobs.set(def.id, {def, timer: null, running: null, failures: 0});
  }

  function backoff(job) {
    const base = Math.max(MINUTE, Math.min(job.def.everyMs, 15 * MINUTE));
    const cap = Math.max(job.def.everyMs, 30 * MINUTE);
    return Math.min(cap, base * 2 ** (job.failures - 1)) * (0.9 + 0.2 * random());
  }

  function schedule(job, ms) {
    if (stopped) return;
    clearTimeout(job.timer);
    job.timer = setTimeout(async () => { schedule(job, await execute(job, false)); }, ms);
    job.timer.unref();
  }

  /* one run of one feed; returns how long to wait before the next */
  async function execute(job, forced) {
    if (job.running) { await job.running.catch(() => {}); return job.def.everyMs; }
    const lockMs = Math.max(job.def.everyMs * 1.5, 2 * MINUTE);
    if (!forced) {
      const mine = await store.lock(`feed:${job.def.id}`, lockMs, holder).catch(e => { log.error(`feed ${job.def.id}: lock failed:`, e.message); return false; });
      if (!mine) return job.def.everyMs;   /* another server runs this feed */
    }
    const started = now();
    let health, wait;
    job.running = (async () => {
      try {
        const result = (await job.def.run()) || {};
        job.failures = 0;
        wait = job.def.everyMs;
        health = {status: result.warnings && result.warnings.length ? "partial" : "ok", lastRun: new Date(started).toISOString(), lastOk: new Date(now()).toISOString(),
          ms: now() - started, summary: result.summary || {}, warnings: (result.warnings || []).slice(0, 5).map(w => String(w).slice(0, 200)), error: null, failures: 0};
      } catch (e) {
        job.failures++;
        wait = backoff(job);
        const prev = (await store.getDoc(healthKey(job.def.id)).catch(() => null)) || {};
        health = Object.assign({}, prev, {status: "failing", lastRun: new Date(started).toISOString(), ms: now() - started,
          error: String(e && e.message || e).slice(0, 300), failures: job.failures});
        log.error(`feed ${job.def.id}:`, health.error);
      }
      health.nextRun = new Date(now() + wait).toISOString();
      await store.putDoc(healthKey(job.def.id), health).catch(e => log.error(`feed ${job.def.id}: could not save health:`, e.message));
    })();
    try { await job.running; } finally { job.running = null; }
    return wait;
  }

  return {
    add,
    ids: () => [...jobs.keys()],
    start() {
      stopped = false;
      for (const job of jobs.values()) schedule(job, 1000 + random() * 9000);   /* spread the first runs */
    },
    /* an administrator asked for a run now: returns false when the feed is unknown */
    runNow(id) {
      const job = jobs.get(id);
      if (!job || stopped) return false;
      execute(job, true).then(wait => schedule(job, wait), e => log.error(`feed ${id}:`, e.message));
      return true;
    },
    stop() { stopped = true; for (const job of jobs.values()) clearTimeout(job.timer); }
  };
}

async function readHealth(store, ids) {
  const out = {};
  for (const id of ids) out[id] = await store.getDoc(healthKey(id)).catch(() => null);
  return out;
}

module.exports = {createScheduler, readHealth, healthKey};
