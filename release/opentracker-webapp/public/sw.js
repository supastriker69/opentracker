/* Open Tracker service worker: works offline and shows phone alerts. */
"use strict";
const VERSION = "34b62526b8";
const CACHE = "opentracker-" + VERSION;
const SHELL = ["/", "/app.css", "/app.js", "/geo.js", "/webapp.js", "/vendor/maplibre-gl.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/badge-96.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("opentracker-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* live data: network first, last copy when offline */
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) {
    if (!["/api/notices", "/api/data", "/api/weather"].includes(url.pathname)) return;
    e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => caches.match(req).then(m => m || Response.error())));
    return;
  }
  if (req.mode === "navigate") {   /* pages: always fresh when online; the app page when offline */
    e.respondWith(fetch(req).catch(() => caches.match(req, {ignoreSearch: true}).then(m => m || caches.match("/"))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {   /* files: cached copy at once, refreshed in the background */
    const hit = await c.match(req, {ignoreSearch: true});
    const net = fetch(req).then(r => { if (r.ok && r.type === "basic") c.put(req, r.clone()); return r; }).catch(() => hit || Response.error());
    return hit || net;
  }));
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = {title: "Open Tracker", body: e.data ? e.data.text() : ""}; }
  const title = String(d.title || "Open Tracker alert").slice(0, 80);
  e.waitUntil(self.registration.showNotification(title, {
    body: String(d.body || "").slice(0, 600), icon: "/icons/icon-192.png", badge: "/icons/badge-96.png",
    tag: d.tag || "opentracker", renotify: true, requireInteraction: d.level === "warning",
    timestamp: Date.parse(d.at) || Date.now(), data: {url: typeof d.url === "string" && d.url.startsWith("/") ? d.url : "/?alerts"}
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/?alerts", location.origin).href;
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(list => {
    const open = list.find(c => new URL(c.url).origin === location.origin);
    return open ? open.navigate(url).then(c => (c || open).focus()) : self.clients.openWindow(url);
  }));
});
/* the browser replaced the subscription: subscribe again and tell the server */
self.addEventListener("pushsubscriptionchange", e => {
  e.waitUntil((async () => {
    const opts = e.oldSubscription?.options;
    if (!opts) return;
    const sub = await self.registration.pushManager.subscribe(opts);
    await fetch("/api/resubscribe", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({oldEndpoint: e.oldSubscription.endpoint, subscription: sub.toJSON()})}).catch(() => {});
  })());
});
