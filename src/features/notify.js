/* ===== Public notifications and "My alerts" =====
   Sources, newest first: notices sent from Admin ("notifications"), agency warnings marked for broadcast,
   and — on the self-hosted web app — notices from its push server (window.WEBAPP).
   Saved places live in this browser only (localStorage); they decide which notices are "for you".
   Real device push needs the self-hosted web app; inside claude.ai alerts appear while the page is open. */
const NOTICE_LEVELS = [["warning", "Flood warning"], ["watch", "Flood watch"], ["info", "Information"], ["clear", "All clear"]];
const MY = {places: [], seen: 0, shown: new Set(), since: Date.now() - 30e3};
const MY_MAX = 12;
(function loadMy() {
  try {
    const p = JSON.parse(localStorage.getItem("ft-places") || "[]");
    MY.places = Array.isArray(p) ? p.filter(k => typeof k === "string" && /^(area|hotspot|country|wc|wp):[A-Za-z0-9_-]{1,60}$/.test(k)).slice(0, MY_MAX) : [];
    MY.seen = +localStorage.getItem("ft-seen") || 0;
  } catch (e) { /* storage blocked: alerts still work for this visit */ }
})();
function saveMy() { try { localStorage.setItem("ft-places", JSON.stringify(MY.places)); localStorage.setItem("ft-seen", String(MY.seen)); } catch (e) {} }

const placeKey = p => p && p.type !== "water" ? p.type + ":" + p.id : "";
function keyPlace(k) {
  const i = k.indexOf(":"), type = k.slice(0, i), id = k.slice(i + 1);
  const ok = type === "hotspot" ? IX.byId[id] : type === "area" ? IX.areaById[id] : type === "country" ? FT.countries[id]
    : type === "wc" ? worldCountry(id) : type === "wp" ? worldPlace(id) : null;
  return ok ? {type, id} : null;
}
function myPlaces() { return MY.places.map(keyPlace).filter(Boolean); }
function isMine(p) { return MY.places.includes(placeKey(p)); }
function toggleMine(p) {
  const k = placeKey(p); if (!k) return;
  if (isMine(p)) MY.places = MY.places.filter(x => x !== k);
  else { if (MY.places.length >= MY_MAX) { toast(`You can follow up to ${MY_MAX} places. Remove one first.`); return; } MY.places.push(k); }
  saveMy();
  toast(isMine(p) ? `You'll get alerts for ${placeName(p)}.` : `Alerts for ${placeName(p)} turned off.`);
  window.WEBAPP?.sync();
}

/* ---------- reading notices ---------- */
function normNotice(n, src) {
  const at = String(n.at || n.issued || ""), t = Date.parse(at);
  if (!t || !String(n.msg || "").trim()) return null;
  const ll = Array.isArray(n.ll) && n.ll.length === 2 && n.ll.every(Number.isFinite) ? n.ll : null;
  return {id: src + ":" + n.id, level: NOTICE_LEVELS.some(l => l[0] === n.level) ? n.level : "info", title: String(n.title || "").slice(0, 80),
    msg: String(n.msg).slice(0, 600), c: n.c || "ALL", areas: Array.isArray(n.areas) ? n.areas.filter(a => IX.areaById[a]) : [],
    ll, km: ll ? Math.min(300, Math.max(1, +n.km || 10)) : 0, agency: n.agencyName || agencies().find(a => a.id === n.agency)?.n || n.agency || "Open Tracker",
    at, t, expires: n.expires || ""};
}
function publicNotices() {
  const now = Date.now();
  const out = data("notifications").map(n => normNotice(n, "fl"))
    .concat(approvedPosts("warning").filter(p => p.push).map(p => normNotice({id: p.uid + "-" + p.id, level: p.level, title: "", msg: p.msg, c: p.c, areas: p.areas, agencyName: p.agency.n, at: p.at, expires: p.expires}, "ag")))
    .concat((window.WEBAPP?.notices() || []).map(n => normNotice(n, "web")));
  return out.filter(n => n && (!n.expires || Date.parse(n.expires) > now)).sort((a, b) => b.t - a.t);
}
function noticeMatches(n, p) {
  const c = placeCountry(p);
  if (n.c !== "ALL" && c && n.c !== c) return false;
  if (!n.areas.length && !n.ll) return true;                            /* whole country */
  if (p.type === "wc") return true;                                     /* following a whole country */
  const hs = placeHot(p);
  const regs = new Set(p.type === "area" ? [p.id] : hs.map(h => h.r));
  if (n.areas.some(a => regs.has(a))) return true;
  if (n.ll) return (hs.length ? hs.map(h => h.ll) : [placeCenter(p).ll]).some(ll => km(ll, n.ll) <= n.km);
  return false;
}
/* notices for this person: anything touching a saved place; with no saved places, everything current */
function noticesForMe() {
  const mine = myPlaces();
  const all = publicNotices();
  if (!mine.length) return all.map(n => ({n, places: []}));
  return all.map(n => ({n, places: mine.filter(p => noticeMatches(n, p))})).filter(x => x.places.length);
}
function unseenCount() { return noticesForMe().filter(x => x.n.t > MY.seen).length; }
function noticeTitle(n) { return n.title || (NOTICE_LEVELS.find(l => l[0] === n.level) || [0, "Notice"])[1]; }
function noticeWhere(n) {
  const a = n.areas.map(id => IX.areaById[id]?.n).filter(Boolean);
  const country = n.c === "ALL" ? "every country" : countryName(n.c);
  return a.length ? a.join(", ") : n.ll ? `Within ${n.km} km of the marked spot` : "All of " + country;
}

/* live pop-up while the page is open: only notices sent after it loaded, each once */
function checkNewNotices() {
  const fresh = noticesForMe().filter(x => x.n.t >= MY.since && !MY.shown.has(x.n.id));
  fresh.forEach(x => MY.shown.add(x.n.id));
  if (!fresh.length || UI.screen === "alerts") return;
  const {n, places} = fresh[0];
  const box = document.createElement("div");
  box.className = "livealert lv-" + (n.level === "warning" ? "vhigh" : n.level === "watch" ? "high" : "low");
  box.setAttribute("role", "alert");
  box.innerHTML = `<div><b>${esc(noticeTitle(n))}${places.length ? " · " + esc(places.map(placeName).join(", ")) : ""}</b><p>${esc(n.msg)}</p><span class="small">${esc(n.agency)} · ${esc(fmtDate(n.at))}</span></div><div class="toolbar"><button class="sbtn primary" data-act="alerts">See alerts</button><button class="sbtn" data-act="live-close">Close</button></div>`;
  document.querySelectorAll(".livealert").forEach(x => x.remove());
  document.body.appendChild(box);
  header();
}

/* ---------- screens ---------- */
function alertMeHtml(p) {
  if (!placeKey(p)) return "";
  const on = isMine(p);
  return `<button class="btn ${on ? "" : "ghost"}" data-act="alert-me" aria-pressed="${on}">${ICON.bell}${on ? "You get alerts for this place · Turn off" : "Alert me about this place"}</button>`;
}
function noticeCard(n, places) {
  const lv = n.level === "warning" ? "vhigh" : n.level === "watch" ? "high" : n.level === "clear" ? "low" : "med";
  return `<article class="notice-card lv-${lv}"><div class="nc-head"><b>${esc(noticeTitle(n))}</b><span class="small">${esc(fmtDate(n.at))}</span></div>
    <p>${esc(n.msg)}</p>
    <p class="small muted">From <b>${esc(n.agency)}</b> · ${esc(noticeWhere(n))}${places?.length ? " · Matches " + esc(places.map(placeName).join(", ")) : ""}${n.expires ? " · Until " + esc(fmtDate(n.expires)) : ""}</p></article>`;
}
function viewAlerts() {
  const mine = myPlaces(), list = noticesForMe();
  MY.seen = Date.now(); saveMy();
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Alerts</h1>
    <div class="card"><h2>Places you follow</h2>
      ${mine.length ? `<ul class="plain myplaces">${mine.map(p => `<li><button class="linkbtn" data-act="open" data-type="${p.type}" data-id="${esc(p.id)}">${esc(placeName(p))}</button><button class="sbtn" data-act="unfollow" data-k="${esc(placeKey(p))}" aria-label="Stop alerts for ${esc(placeName(p))}">Remove</button></li>`).join("")}</ul>`
        : `<p>You don't follow any places yet. Open your area and tap <b>Alert me about this place</b>. Until then, you see every current alert.</p>`}
      <button class="sbtn" data-act="home">Find a place</button>
    </div>
    <div class="card"><h2>${mine.length ? "Alerts for your places" : "Current alerts"}</h2>
      ${list.length ? `<div class="stack">${list.map(x => noticeCard(x.n, x.places)).join("")}</div>` : `<p>No alerts right now${mine.length ? " for your places" : ""}. Official warnings appear here as soon as an agency sends them.</p>`}
    </div>
    <div class="card"><h2>Get alerts on your phone</h2>${window.WEBAPP ? window.WEBAPP.controlsHtml() : installGuideHtml(false)}</div>`;
}
/* how to put Open Tracker on a home screen, like Stake.com and other web apps that skip the app stores */
function installGuideHtml(hosted) {
  return `
    ${hosted ? "" : `<p class="small muted">Phone notifications come from the Open Tracker web app at its own web address. On that site, follow these steps once and Open Tracker works like an app, with no app store download.</p>`}
    <details class="howto" open><summary><b>iPhone or iPad</b> (Safari)</summary><ol>
      <li>Go to Open Tracker in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (a square with an arrow pointing up).</li>
      <li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Start Open Tracker from the new icon on your home screen.</li>
      <li>Tap <b>Turn on alerts</b> and choose <b>Allow</b>. Phone alerts need iOS 16.4 or later.</li></ol></details>
    <details class="howto"><summary><b>Android phone</b> (Chrome)</summary><ol>
      <li>Go to Open Tracker in <b>Chrome</b>.</li><li>Tap <b>Install app</b> when it appears, or tap the <b>⋮</b> menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</li>
      <li>Start Open Tracker from the new icon, tap <b>Turn on alerts</b> and choose <b>Allow</b>.</li></ol></details>
    <details class="howto"><summary><b>Computer</b> (Chrome or Edge)</summary><ol>
      <li>Click the <b>install</b> icon at the right end of the address bar, or open the browser menu and choose <b>Install Open Tracker</b>.</li>
      <li>Click <b>Turn on alerts</b> and choose <b>Allow</b>.</li></ol></details>`;
}
