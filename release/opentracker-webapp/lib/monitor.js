"use strict";
/* Watches the running service and tells the operators when something needs a person.

   Problems it looks for, every minute:
     feed:<id>     a data feed has missed two runs in a row (no good run for twice its interval, at least 15 minutes)
     approval      an agency notice has waited more than 15 minutes for an administrator to approve it
     push-failing  more than 5% of phone alerts failed since the last check (at least 100 sent)
     push-backlog  phone alerts are piling up: the queue has grown for 3 checks in a row and holds over 1,000 batches

   Each problem is reported once when it starts and once when it clears: in the logs (level "error" / "info",
   msg "alert …") and, when ALERT_WEBHOOK_URL is set, as a JSON POST that Slack, Discord, Teams, ntfy and most
   paging services accept ({text, content, …}). With several servers, one at a time does the checking (shared lock).

   The same checks back GET /readyz/feeds (503 while a feed is stale) for outside uptime monitors, and the gauges
   on GET /metrics. */
const {renderMetrics} = require("./metrics");

const MINUTE = 60e3;
const STATE_DOC = "monitor-state";

/* how long a feed may go without a good run before it counts as stopped */
const staleAfter = everyMs => Math.max(2 * everyMs, everyMs + 15 * MINUTE);

/* feeds that are on but stopped; startedMs is when this service started (a feed that never ran is judged from then) */
function staleFeeds(sources, everyMs, nowMs, startedMs) {
  const out = [];
  for (const s of sources) {
    if (!s.enabled || !everyMs[s.id]) continue;
    const since = s.lastOk ? Date.parse(s.lastOk) : startedMs;
    const age = nowMs - since;
    if (age > staleAfter(everyMs[s.id])) out.push({id: s.id, name: s.name, lastOk: s.lastOk || null, ageMin: Math.round(age / MINUTE), error: s.error || null});
  }
  return out;
}

const HELP = {
  opentracker_http_requests_total: "HTTP requests answered, by route and status class",
  opentracker_http_request_duration_seconds: "Time to answer HTTP requests, by route",
  opentracker_push_sent_total: "Phone alerts by result: ok, gone (phone unsubscribed) or failed",
  opentracker_feed_runs_total: "Data feed runs by result",
  opentracker_alerts_total: "Operator alerts raised, by problem kind",
  opentracker_feed_age_seconds: "Seconds since each data feed's last good run (-1: never)",
  opentracker_feed_stale: "1 when a data feed has missed two runs",
  opentracker_push_queue_batches: "Phone alert batches waiting to be sent",
  opentracker_notices_pending_approval: "Agency notices waiting for approval",
  opentracker_subscribers: "Phones subscribed to alerts",
  opentracker_process_uptime_seconds: "Seconds this process has been running"
};

function createMonitor({cfg, store, feeds, metrics, log = console, post = postJson, now = () => Date.now(), holder = String(process.pid), everyMs = MINUTE}) {
  const startedMs = now();
  let timer = null;
  const feedEvery = () => (feeds && feeds.schedule ? feeds.schedule() : {});

  async function stale() {
    if (!feeds) return [];
    return staleFeeds(await feeds.sources({admin: true}), feedEvery(), now(), startedMs);
  }

  /* everything that is wrong right now: {key: {kind, text, detail}} */
  async function problems(prev) {
    const out = {};
    for (const f of await stale()) {
      out["feed:" + f.id] = {kind: "feed", text: `Data feed "${f.name}" has stopped: no good run for ${f.ageMin} minutes${f.error ? ` (last error: ${f.error})` : ""}.`, detail: f};
    }
    const waiting = (await store.listNotices(cfg.maxNotices || 300)).filter(n => n.status === "pending" && now() - Date.parse(n.at) > 15 * MINUTE);
    if (waiting.length) out.approval = {kind: "approval", text: `${waiting.length} agency notice${waiting.length > 1 ? "s have" : " has"} waited over 15 minutes for approval: ${waiting.slice(0, 3).map(n => `"${n.title}"`).join(", ")}.`, detail: {ids: waiting.map(n => n.id)}};
    const totals = metrics ? await metrics.totals() : {};
    const push = {ok: totals['opentracker_push_sent_total{result="ok"}'] || 0, failed: totals['opentracker_push_sent_total{result="failed"}'] || 0};
    const was = prev.push || push;
    const sent = push.ok - was.ok + push.failed - was.failed, failed = push.failed - was.failed;
    if (sent >= 100 && failed / sent > 0.05) out["push-failing"] = {kind: "push", text: `${Math.round(100 * failed / sent)}% of phone alerts failed in the last check (${failed} of ${sent}).`, detail: {sent, failed}};
    const queue = await store.queueLength();
    const grew = (prev.queue || []).concat(queue).slice(-4);
    if (queue > 1000 && grew.length === 4 && grew.every((q, i) => i === 0 || q > grew[i - 1])) out["push-backlog"] = {kind: "push", text: `Phone alerts are piling up: ${queue} batches waiting and growing.`, detail: {queue}};
    return {now: out, push, queue: grew};
  }

  async function alert(level, key, p, cleared) {
    const text = cleared ? `Resolved: ${p.text.replace(/\.$/, "")}.` : p.text;
    if (metrics && !cleared) metrics.inc("opentracker_alerts_total", {kind: p.kind});
    log[cleared ? "info" : "error"](`alert ${cleared ? "resolved" : "raised"}: ${text}`, {alert: key, kind: p.kind, resolved: !!cleared});
    if (!cfg.alertWebhook) return;
    const body = {text: `[${cfg.alertName}] ${text}`, content: `[${cfg.alertName}] ${text}`, service: cfg.alertName, level, problem: key, resolved: !!cleared, at: new Date(now()).toISOString()};
    await post(cfg.alertWebhook, body).catch(e => log.error("alert webhook failed", {error: e.message, alert: key}));
  }

  /* one round of checks; returns the problems now open */
  async function check() {
    if (!(await store.lock("monitor", 2 * everyMs, holder).catch(() => false))) return null;   /* another server is checking */
    const prev = (await store.getDoc(STATE_DOC)) || {open: {}};
    const found = await problems(prev);
    for (const [key, p] of Object.entries(found.now)) if (!prev.open[key]) await alert("error", key, p, false);
    for (const [key, p] of Object.entries(prev.open)) if (!found.now[key]) await alert("info", key, p, true);
    const open = Object.fromEntries(Object.entries(found.now).map(([k, p]) => [k, Object.assign({since: prev.open[k] ? prev.open[k].since : new Date(now()).toISOString()}, p)]));
    await store.putDoc(STATE_DOC, {open, push: found.push, queue: found.queue, checked: new Date(now()).toISOString()});
    return open;
  }

  /* the gauges on /metrics, read fresh from the store */
  async function gauges() {
    const out = [];
    if (feeds) {
      const every = feedEvery(), sources = await feeds.sources({admin: true});
      const staleIds = new Set(staleFeeds(sources, every, now(), startedMs).map(f => f.id));
      for (const s of sources.filter(x => x.enabled && every[x.id])) {
        out.push({name: "opentracker_feed_age_seconds", labels: {feed: s.id}, value: s.lastOk ? Math.round((now() - Date.parse(s.lastOk)) / 1000) : -1});
        out.push({name: "opentracker_feed_stale", labels: {feed: s.id}, value: staleIds.has(s.id) ? 1 : 0});
      }
    }
    out.push({name: "opentracker_push_queue_batches", value: await store.queueLength()});
    out.push({name: "opentracker_notices_pending_approval", value: (await store.listNotices(cfg.maxNotices || 300)).filter(n => n.status === "pending").length});
    out.push({name: "opentracker_subscribers", value: (await store.subStats()).subscribers});
    out.push({name: "opentracker_process_uptime_seconds", value: Math.round((now() - startedMs) / 1000)});
    return out;
  }

  return {
    check, stale, staleFeeds,
    async metricsText() { return renderMetrics(metrics ? await metrics.totals() : {}, await gauges(), HELP); },
    start() {
      if (timer) return;
      const tick = () => check().catch(e => log.error("monitor check failed", {error: e.message}));
      timer = setInterval(tick, everyMs); timer.unref();
      setTimeout(tick, Math.min(everyMs, 15e3)).unref();
    },
    stop() { clearInterval(timer); timer = null; }
  };
}

/* POST a JSON body with a 10-second limit; the operator's own webhook address, so no private-address check */
async function postJson(url, body) {
  const res = await fetch(url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body), signal: AbortSignal.timeout(10e3)});
  if (!res.ok) throw new Error(`webhook answered ${res.status}`);
}

module.exports = {createMonitor, staleFeeds, staleAfter, postJson};
