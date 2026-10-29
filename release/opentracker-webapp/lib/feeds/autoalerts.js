"use strict";
/* Automatic heat alerts (off unless an administrator turns them on).
   When the heat model rates a place "dangerous" or "extreme" for today or tomorrow, people who follow that place
   or live within 40 km get one alert per place and day. With approval on, the alert waits for an administrator,
   like any agency notice. Every alert says it is a model estimate, not an official warning. */

const RADIUS_KM = 40;
const ADVICE = "Drink water often, stay in shade or a cool room from late morning to late afternoon, and check on older people, babies and anyone unwell.";

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/* country summaries → notice drafts (pure). A place's first forecast day is its own local today. */
function heatNoticeDrafts(countryDocs) {
  const drafts = [];
  for (const doc of countryDocs) {
    for (const place of doc.heat) {
      const k = place.days.slice(0, 2).findIndex(d => d.level >= 3);
      if (k < 0) continue;
      const day = place.days[k];
      const extreme = day.level >= 4;
      const measures = [day.tmax !== null ? `high ${Math.round(day.tmax)}°C` : "", day.feels !== null ? `feels like ${Math.round(day.feels)}°C` : "",
        day.wetBulb !== null ? `wet-bulb ${Math.round(day.wetBulb)}°C` : ""].filter(Boolean).join(", ");
      drafts.push({
        id: `heat-${place.id}-${day.date}`,
        level: extreme ? "warning" : "watch",
        title: clip(`${extreme ? "Extreme" : "Dangerous"} heat: ${place.n}`, 80),
        msg: clip(`${k === 0 ? "Today" : "Tomorrow"} (${day.date}) in and around ${place.n}: ${measures}. ${ADVICE} This is an Open Tracker estimate from open weather data, not an official warning; follow your national weather service.`, 500),
        c: doc.c, areas: [], ll: place.ll, km: RADIUS_KM,
        expires: new Date(Date.parse(day.date + "T00:00:00Z") + 2 * 864e5).toISOString()
      });
    }
  }
  return drafts;
}

/* sends the drafts that are new; returns how many were created */
async function sendHeatAlerts({store, push, countryDocs, now = new Date(), log = console}) {
  const settings = await store.getSettings();
  if (!settings.autoHeatAlerts) return 0;
  let created = 0;
  for (const d of heatNoticeDrafts(countryDocs)) {
    if (await store.getNotice(d.id)) continue;   /* one alert per place and day */
    const pending = settings.approval !== false;
    const n = Object.assign(d, {agency: "opentracker-model", agencyName: "Open Tracker heat model (estimate)", keyId: null,
      at: now.toISOString(), withdrawn: null, status: pending ? "pending" : "live"});
    await store.putNotice(n);
    await store.log({at: n.at, act: pending ? "heat alert waiting for approval" : "heat alert sent", key: null, notice: n.id, title: n.title});
    if (!pending) await push.enqueue(n).catch(e => log.error("heat alert:", e.message));
    created++;
  }
  return created;
}

module.exports = {heatNoticeDrafts, sendHeatAlerts, RADIUS_KM};
