/* ===== Open Tracker web app layer (self-hosted site only) =====
   Install to home screen, phone push alerts, and "use my location". Loaded before the app; the app calls in
   through window.WEBAPP. Nothing here runs inside claude.ai. */
"use strict";
window.WEBAPP = (() => {
  const st = {notices: [], weather: null, replays: [], deferred: null, reg: null, sub: null, msg: "", loc: null, near: null, busy: false, map: null, hazards: new Map()};
  const LOC_KEY = "ft-loc";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  try { const l = JSON.parse(localStorage.getItem(LOC_KEY) || "null"); if (Array.isArray(l) && l.length === 2 && l.every(Number.isFinite)) st.loc = l; } catch (e) {}

  async function api(path, body) {
    const r = await fetch(path, body === undefined ? {credentials: "same-origin"} : {method: "POST", credentials: "same-origin", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "The server didn't answer. Try again.");
    return j;
  }
  const redraw = () => { if (typeof render === "function") render(); };

  /* ---------- start-up ---------- */
  async function start() {
    window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); st.deferred = e; redraw(); });
    window.addEventListener("appinstalled", () => { st.deferred = null; toast("Open Tracker is on your home screen."); redraw(); });
    if ("serviceWorker" in navigator) {
      try {
        st.reg = await navigator.serviceWorker.register("/sw.js", {scope: "/"});
        st.sub = pushSupported() ? await st.reg.pushManager.getSubscription() : null;
      } catch (e) { /* offline support and push are optional extras */ }
    }
    try {   /* the latest data published from Open Tracker Admin; without it the built-in data is used */
      const d = await api("/api/data");
      if (d && d.app === "OpenTracker") {   /* sections missing from the published file keep the built-in data */
        DB.cfg = Object.assign({}, d.settings || {});
        COLLS.forEach(k => { DB.cols[k] = Array.isArray(d[k]) ? d[k] : clone(BUILT[k]); });
      }
    } catch (e) {}
    try { st.map = (await api("/api/config")).map || null; } catch (e) { st.map = null; }   /* street map and ground heights for 3D */
    await refresh();
    setInterval(() => refresh().then(() => { if (UI.screen === "status") render(); }), 60e3);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
    if (new URLSearchParams(location.search).has("alerts")) { UI.mode = "simple"; UI.screen = "alerts"; }
    if (st.loc) st.near = nearest(st.loc);
    if (st.sub) sync();   /* keep the server's copy of followed places current */
  }
  async function refresh() {
    const [n, w, r] = await Promise.allSettled([api("/api/notices"), api("/api/weather"), api("/api/replays")]);
    if (n.status === "fulfilled") st.notices = Array.isArray(n.value.notices) ? n.value.notices : [];
    if (w.status === "fulfilled") st.weather = w.value;
    if (r.status === "fulfilled") st.replays = Array.isArray(r.value.replays) ? r.value.replays : [];
    hazardsForget();   /* the next screen that needs flood and heat data fetches it fresh (the CDN keeps this cheap) */
    reindex(); header(); checkNewNotices();
  }
  /* one country's flood and heat summary, or the world's ("world") */
  function hazards(key) {
    if (!/^([A-Z]{2}|world)$/.test(key)) return Promise.resolve(null);
    return api("/api/hazards/" + key).catch(e => { if (/unknown country/.test(e.message)) return null; throw e; });
  }

  /* ---------- location ---------- */
  function nearest(ll) {
    let best = null;
    IX.hot.forEach(h => { const d = km(ll, h.ll); if (!best || d < best.d) best = {h, d}; });
    return best && best.d <= 40 ? best : null;
  }
  function locate() {
    if (!("geolocation" in navigator)) { toast("This device can't share its location."); return; }
    st.busy = true; redraw();
    navigator.geolocation.getCurrentPosition(pos => {
      st.busy = false;
      st.loc = [Math.round(pos.coords.longitude * 1e3) / 1e3, Math.round(pos.coords.latitude * 1e3) / 1e3];   /* about 100 m: enough for alerts */
      try { localStorage.setItem(LOC_KEY, JSON.stringify(st.loc)); } catch (e) {}
      st.near = nearest(st.loc);
      toast(st.near ? `You're near ${st.near.h.n}.` : "Location saved. No known flood area within 40 km.");
      sync(); redraw();
    }, err => {
      st.busy = false;
      toast(err.code === 1 ? "Location is turned off for Open Tracker. You can follow places by name instead." : "Couldn't find your location. Try again outdoors or follow places by name.");
      redraw();
    }, {enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60e3});
  }
  function forgetLocation() {
    st.loc = null; st.near = null;
    try { localStorage.removeItem(LOC_KEY); } catch (e) {}
    sync(); redraw();
  }

  /* ---------- push ---------- */
  function b64(s) { const p = "=".repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, c => c.charCodeAt(0)); }
  /* what this phone wants alerts for */
  function prefs() {
    const places = myPlaces(), countries = new Set(), whole = new Set(), areas = new Set(), points = [];
    places.forEach(p => {
      const c = placeCountry(p); if (c) countries.add(c);
      if (p.type === "country") whole.add(p.id);
      if (p.type === "area") areas.add(p.id);
      if (p.type === "wc") whole.add(p.id);
      if (p.type === "wp") { const w = worldPlace(p.id); if (w) points.push(w.ll); }
      placeHot(p).slice(0, 5).forEach(h => { areas.add(h.r); if (p.type === "hotspot") points.push(h.ll); });
    });
    if (st.loc) { points.push(st.loc); if (st.near) { countries.add(st.near.h.c); areas.add(st.near.h.r); } }
    return {countries: [...countries], whole: [...whole], areas: [...areas].slice(0, 60), points: points.slice(0, 20)};
  }
  let syncTimer = null;
  function sync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      if (!st.sub) return;
      try { await api("/api/subscribe", Object.assign({subscription: st.sub.toJSON()}, prefs())); } catch (e) { toast(e.message); }
    }, 400);
  }
  async function turnOn() {
    if (!pushSupported() || !st.reg) { toast("This browser can't receive alerts. Try Chrome on Android, or Safari on iPhone after adding Open Tracker to your home screen."); return; }
    const perm = await Notification.requestPermission();   /* must run straight from the tap */
    if (perm !== "granted") { toast("Alerts were not allowed. You can allow them later in your phone's settings."); redraw(); return; }
    try {
      const {vapidPublicKey} = await api("/api/config");
      st.sub = await st.reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64(vapidPublicKey)});
      await api("/api/subscribe", Object.assign({subscription: st.sub.toJSON()}, prefs()));
      toast(myPlaces().length || st.loc ? "Alerts are on." : "Alerts are on. Follow your places or use your location so we know what to send.");
    } catch (e) { toast("Couldn't turn on alerts. Check your connection and try again."); }
    redraw();
  }
  async function turnOff() {
    if (!st.sub) return;
    try { await api("/api/unsubscribe", {endpoint: st.sub.endpoint}); } catch (e) {}
    try { await st.sub.unsubscribe(); } catch (e) {}
    st.sub = null; toast("Alerts are off on this device."); redraw();
  }

  /* ---------- what the Alerts screen shows ---------- */
  function controlsHtml() {
    const parts = [];
    if (standalone()) parts.push(`<p class="ok">✓ Open Tracker is on this device's home screen.</p>`);
    else if (st.deferred) parts.push(`<button class="btn primary" data-act="wa-install">Install Open Tracker on this device</button>`);
    else parts.push(installGuideHtml(true));
    if (!pushSupported()) parts.push(`<p class="wa-status">${ios && !standalone() ? "On iPhone and iPad, add Open Tracker to your home screen first (steps above), then open it from the icon to turn on alerts." : "This browser can't receive phone alerts. Alerts still show here whenever Open Tracker is open."}</p>`);
    else if (Notification.permission === "denied") parts.push(`<p class="wa-status">Alerts are blocked for Open Tracker. Allow notifications for this site in your phone or browser settings, then come back.</p>`);
    else if (st.sub) parts.push(`<p class="ok">✓ Phone alerts are on${myPlaces().length ? " for " + esc(myPlaces().map(placeName).join(", ")) : ""}${st.loc ? (myPlaces().length ? " and" : "") + " near your location" : ""}.</p><button class="sbtn" data-act="wa-push-off">Turn off phone alerts</button>`);
    else parts.push(`<button class="btn primary" data-act="wa-push">${ICON.bell}Turn on alerts</button>`);
    parts.push(st.loc
      ? `<p class="wa-status">Your location is saved on this device${st.near ? ` (near ${esc(st.near.h.n)})` : ""}. You get alerts for flooding around it.</p><button class="sbtn" data-act="wa-loc-off">Forget my location</button>`
      : `<button class="btn" data-act="wa-locate" ${st.busy ? "disabled" : ""}>${st.busy ? "Finding you…" : "Use my location for alerts"}</button><p class="small muted">Your location stays on this phone and our alert server, rounded to about 100 metres. It is never shown to anyone.</p>`);
    return parts.join("");
  }
  async function act(a) {
    if (a === "wa-install" && st.deferred) { st.deferred.prompt(); await st.deferred.userChoice.catch(() => null); st.deferred = null; redraw(); }
    if (a === "wa-push") await turnOn();
    if (a === "wa-push-off") await turnOff();
    if (a === "wa-locate") locate();
    if (a === "wa-loc-off") forgetLocation();
  }
  function forecasts() { return st.weather && Array.isArray(st.weather.forecasts) ? st.weather.forecasts.filter(f => f && f.zone && Number.isFinite(f.mm24) && Number.isFinite(f.mm72)) : []; }
  function statusHtml() {
    const w = st.weather;
    if (!w) return "";
    const ok = !!(w.connected && w.updated);
    const what = ok ? `Rain for the next 24 hours and 3 days in ${forecasts().length} weather zones. Official GMet and NiMet forecasts take priority.` : "Starts once this site's Google Weather key is set.";
    return `<div class="card"><h2>Live rain forecasts</h2>${feedRow(w.source || "Google Weather", what, ok ? "on" : "off", ok ? w.updated : "")}</div>`;
  }
  /* ---------- open-source contributions ---------- */
  const SENT_KEY = "ot-sent";
  function sentItems() { try { return JSON.parse(localStorage.getItem(SENT_KEY) || "{}"); } catch (e) { return {}; } }
  async function contribute(item) {
    const body = Object.assign({}, item, {website: ""});
    delete body.at;
    if (st.loc && item.type === "report" && !item.place) body.ll = st.loc;   /* where the person is, if they shared it */
    const r = await api("/api/contribute", body);
    try { const all = sentItems(); all[r.id || Date.now().toString(36)] = item; localStorage.setItem(SENT_KEY, JSON.stringify(Object.fromEntries(Object.entries(all).slice(-20)))); } catch (e) {}
  }
  /* flood replays: the list with the live data, each map layer only when watched (cached by the browser) */
  async function geo(id) { const r = await api("/api/geo/" + encodeURIComponent(id)); return r.fc || null; }
  return {start, notices: () => st.notices, replays: () => st.replays, geo, forecasts, statusHtml, controlsHtml, act, sync, contribute, sentItems,
    hazards, mapConfig: () => st.map, location: () => st.loc};
})();
