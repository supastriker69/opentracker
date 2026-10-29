"use strict";
/* Phone notifications. Sending is split from deciding:
   - enqueue(notice): finds the phones that follow the notice's places and queues them in batches
   - worker loop: any number of sender processes take batches from the shared queue and deliver them
   so one notice can reach millions of phones without holding up the web servers. */
const webpush = require("web-push");

function createPush({store, cfg, log = console}) {
  let running = false;

  async function enqueue(notice) {
    const ids = await store.targetIds(notice);
    const jobs = [];
    for (let i = 0; i < ids.length; i += cfg.pushBatch) jobs.push({notice: notice.id, ids: ids.slice(i, i + cfg.pushBatch)});
    await store.pushJobs(jobs);
    return {targeted: ids.length};
  }

  async function deliver(job) {
    const n = await store.getNotice(job.notice);
    if (!n || n.status !== "live" || n.withdrawn) return;   /* withdrawn while queued: stop sending */
    const payload = JSON.stringify({title: n.title, body: `${n.msg}\n— ${n.agencyName}`, level: n.level, tag: "ot-" + n.id, url: "/?alerts", at: n.at});
    const subs = await store.getSubs(job.ids);
    const gone = [];
    let sent = 0, failed = 0;
    const q = subs.slice();
    const worker = async () => {
      for (let item = q.shift(); item; item = q.shift()) {
        const [id, s] = item;
        try {
          await webpush.sendNotification(s.subscription, payload, {TTL: 6 * 3600, urgency: n.level === "warning" ? "high" : "normal", timeout: 10000});
          sent++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) gone.push(id);   /* the person uninstalled or turned alerts off */
          else failed++;
        }
      }
    };
    await Promise.all(Array.from({length: Math.min(cfg.pushConcurrency, q.length)}, worker));
    await store.delSubs(gone);
    await store.addDelivery(n.id, {sent, failed, removed: gone.length});
  }

  async function loop() {
    while (running) {
      let job = null;
      try { job = await store.popJob(5); } catch (e) { if (running) { log.error("push queue:", e.message); await new Promise(r => setTimeout(r, 1000)); } continue; }
      if (!job) continue;
      try { await deliver(job); } catch (e) { log.error("push delivery:", e.message); }
    }
  }
  return {
    enqueue,
    deliver,
    start() { if (!running) { running = true; loop(); } },
    stop() { running = false; }
  };
}

function configureVapid(subject, keys) { webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey); }
module.exports = {createPush, configureVapid};
