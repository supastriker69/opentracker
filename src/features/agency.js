/* ===== Agency publishing: linked agency staff post warnings, forecasts, dam status and readings =====
   Each agency account writes only under agencyData/<its own id>/posts (enforced by database rules).
   The public sees a post only if its author is listed as a publisher of an active agency. */
const AG = {posts: {}, subs: {}, own: null, ownPosts: [], requests: [], reqSub: null, ownSub: null};
const POST_TYPES = [["warning", "Flood warning"], ["forecast", "Rain forecast"], ["dam", "Dam status"], ["reading", "Gauge or station reading"]];
const READING_KINDS = [["river", "River level (m)"], ["rain", "Rainfall (mm)"], ["reservoir", "Reservoir level (m)"], ["release", "Dam release (m³/s)"]];

function publisherMap() {
  const map = {};
  agencies().filter(a => a.status !== "suspended").forEach(a => (a.publishers || []).forEach(uid => map[uid] = a));
  return map;
}
/* keep one live subscription per approved publisher */
function syncAgencySubs() {
  if (!DB.api) return;
  const want = new Set(Object.keys(publisherMap()));
  Object.keys(AG.subs).forEach(uid => { if (!want.has(uid)) { AG.subs[uid](); delete AG.subs[uid]; delete AG.posts[uid]; } });
  want.forEach(uid => {
    if (AG.subs[uid]) return;
    try {
      AG.subs[uid] = DB.api.collection(`agencyData/${uid}/posts`).orderBy("at", "desc").limit(60)
        .onSnapshot(s => { AG.posts[uid] = s.docs.map(d => Object.assign({}, d.data(), {id: d.id, uid})); afterData(); }, () => {});
    } catch (e) { /* malformed id: ignore that publisher */ }
  });
  if (AUTH.can("agencies.manage") && !AG.reqSub) {
    AG.reqSub = DB.api.collection("agencyData").onSnapshot(s => { AG.requests = s.docs.map(d => Object.assign({}, d.data(), {id: d.id})).filter(d => d.request); afterData(); }, () => {});
  }
  if (DB.uid && !AG.ownSub) {
    try {
      AG.ownSub = DB.api.doc(`agencyData/${DB.uid}`).onSnapshot(s => { AG.own = s.exists ? s.data() : null; afterData(); }, () => {});
      DB.api.collection(`agencyData/${DB.uid}/posts`).orderBy("at", "desc").limit(40)
        .onSnapshot(s => { AG.ownPosts = s.docs.map(d => Object.assign({}, d.data(), {id: d.id})); afterData(); }, () => {});
    } catch (e) {}
  }
}
/* agency accounts write free-form documents, so every field is checked and coerced here */
const str = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
const fin = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) && x >= lo && x <= hi ? x : null; };
function cleanPost(p, agency) {
  const at = str(p.at, 40); if (isNaN(new Date(at))) return null;
  const base = {id: str(p.id, 200), uid: p.uid, type: p.type, at, agency};
  if (p.type === "warning") {
    const msg = str(p.msg, 1000).trim(); if (!msg) return null;
    const areas = Array.isArray(p.areas) ? p.areas.filter(id => IX.areaById[id] && IX.areaById[id].c === agency.c).slice(0, 60) : [];
    return Object.assign(base, {level: ["warning", "watch", "info"].includes(p.level) ? p.level : "warning", c: agency.c, areas, msg, expires: isNaN(new Date(p.expires)) ? "" : str(p.expires, 40),
      push: p.push === true && agency.push !== false});
  }
  if (p.type === "forecast") {
    const mm24 = fin(p.mm24, 0, 2000), mm72 = fin(p.mm72, 0, 3000);
    if (mm24 === null || mm72 === null || !settings().climate[p.zone]) return null;
    return Object.assign(base, {zone: p.zone, mm24, mm72});
  }
  if (p.type === "dam") {
    if (!IX.damById[p.dam] || !FT.damStatus[p.status] || p.status === "season") return null;
    return Object.assign(base, {dam: p.dam, status: p.status, notice: str(p.notice, 200)});
  }
  if (p.type === "reading") {
    const ll = Array.isArray(p.ll) ? [fin(p.ll[0], -180, 180), fin(p.ll[1], -90, 90)] : [null, null];
    const value = fin(p.value, -1e6, 1e7), station = str(p.station, 120).trim();
    if (ll.includes(null) || value === null || !station || !READING_KINDS.some(k => k[0] === p.kind)) return null;
    return Object.assign(base, {station, kind: p.kind, value, ll});
  }
  return null;
}
function approvedPosts(type) {
  const pm = publisherMap();
  const out = [];
  Object.entries(AG.posts).forEach(([uid, list]) => {
    const a = pm[uid]; if (!a) return;
    list.forEach(p => { if (!p.retracted && p.type === type && APPROVAL.postStatus(p, uid, a) === "live") { const c = cleanPost(p, a); if (c) out.push(c); } });
  });
  return out.sort((x, y) => String(y.at).localeCompare(String(x.at)));
}

/* ---------- what the rest of the app reads ---------- */
function officialAlerts() {
  return data("alerts").concat(approvedPosts("warning").map(p => ({
    id: "ag-" + p.uid + "-" + p.id, level: p.level || "warning", c: p.c || p.agency.c, areas: p.areas || [],
    agency: p.agency.n, msg: p.msg, issued: p.at, expires: p.expires})));
}
function officialForecasts() {
  return data("forecasts").concat(approvedPosts("forecast").map(p => ({zone: p.zone, mm24: p.mm24, mm72: p.mm72, src: p.agency.n, at: p.at})))
    .concat((window.WEBAPP?.forecasts() || []).map(f => Object.assign({}, f, {model: true})));   /* weather-model forecasts rank below official ones */
}
/* latest official dam state: an agency post wins if it is newer than the editor's setting */
function damState(dam) {
  const post = approvedPosts("dam").find(p => p.dam === dam.id);
  if (post && (!dam.updated || String(post.at) > String(dam.updated))) return {status: post.status, notice: post.notice ? `${post.notice} (${post.agency.n})` : `Reported by ${post.agency.n}.`};
  return {status: dam.status || "season", notice: dam.lastNotice || ""};
}
function officialReadings() { return approvedPosts("reading"); }

/* ---------- agency portal ---------- */
function viewAgency() {
  if (!DB.api || !DB.uid) return `<h1>Agency portal</h1><div class="notice">${ICON.info}<div><b>Sign in to publish</b>Agency staff publish live data here after an administrator links their account.</div></div>`;
  const a = AUTH.agency();
  if (!a) return agencyRequestView();
  const t = UI.ag.type;
  const f = (inner) => `<form class="card" id="ag-form" data-type="${t}"><h2>Publish ${esc(POST_TYPES.find(x => x[0] === t)[1].toLowerCase())}</h2><div class="formgrid">${inner}</div><p class="small muted" id="ag-err" role="alert"></p><div class="toolbar"><button class="sbtn primary" type="submit">Publish now</button></div></form>`;
  const sel = (id, label, opts, v) => `<label class="field"><span>${label}</span><select id="${id}">${opts.map(([k, n]) => `<option value="${esc(k)}" ${String(v) === String(k) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
  const areasOpts = FT.areas.filter(x => x.c === a.c);
  let form = "";
  if (t === "warning") form = f(`${sel("ag-level", "Type", [["warning", "Flood warning (red)"], ["watch", "Flood watch (amber)"], ["info", "Notice (blue)"]], "warning")}
      <label class="field wide"><span>Regions or states (hold Ctrl or Cmd to choose several; none = whole country)</span><select id="ag-areas" multiple size="6">${areasOpts.map(x => `<option value="${x.id}">${esc(x.n)}</option>`).join("")}</select></label>
      <label class="field wide"><span>Message in plain words</span><textarea id="ag-msg" required></textarea></label>
      <label class="field"><span>Valid until</span><input id="ag-exp" type="datetime-local" value="${localDT(Date.now() + 864e5)}"></label>
      ${a.push !== false ? `<div class="checks wide"><label><input type="checkbox" id="ag-push" checked> Also send to people's phones as a public notification</label></div>` : ""}`);
  if (t === "forecast") form = f(`${sel("ag-zone", "Weather zone", Object.entries(settings().climate).map(([k, v]) => [k, v.n]), "acc")}
      <label class="field"><span>Rain next 24 hours (mm)</span><input id="ag-mm24" type="number" min="0" step="any" required></label>
      <label class="field"><span>Rain next 3 days (mm)</span><input id="ag-mm72" type="number" min="0" step="any" required></label>`);
  if (t === "dam") form = f(`${sel("ag-dam", "Dam", data("dams").map(d => [d.id, d.n]), data("dams")[0]?.id)}
      ${sel("ag-status", "Status", Object.entries(FT.damStatus).filter(([k]) => k !== "season").map(([k, v]) => [k, v.n]), "normal")}
      <label class="field wide"><span>Notice for the public</span><input id="ag-notice" placeholder="For example: release of 200 m³/s from 10:00"></label>`);
  if (t === "reading") form = f(`<label class="field"><span>Station name</span><input id="ag-station" required></label>
      ${sel("ag-kind", "Measurement", READING_KINDS, "river")}
      <label class="field"><span>Value</span><input id="ag-value" type="number" step="any" required></label>
      <label class="field"><span>Latitude</span><input id="ag-lat" type="number" step="any" required></label>
      <label class="field"><span>Longitude</span><input id="ag-lon" type="number" step="any" required></label>`);
  return `
    <h1>Agency portal</h1>
    <div class="notice info">${ICON.info}<div><b>Publishing for ${esc(a.n)}</b>${APPROVAL.needed(a.id) ? "An administrator checks each post. It appears on Open Tracker, labelled with your agency's name, as soon as it is approved." : "Posts appear on Open Tracker within seconds, labelled with your agency's name, and feed straight into the risk model."}</div></div>
    <nav class="tabs" aria-label="What to publish">${POST_TYPES.map(([k, n]) => `<button data-act="ag-type" data-k="${k}" aria-pressed="${t === k}">${n}</button>`).join("")}</nav>
    ${form}
    <div class="card"><h2>Your recent posts</h2>
      <div class="tablewrap"><table><thead><tr><th>When</th><th>Type</th><th>Details</th><th>Status</th><th></th></tr></thead><tbody>
      ${AG.ownPosts.map(p => `<tr><td class="num">${esc(fmtDate(p.at))}</td><td>${esc((POST_TYPES.find(x => x[0] === p.type) || [0, p.type])[1])}</td><td>${esc(postSummary(p))}</td><td>${p.retracted ? "Withdrawn" : {live: "Live", pending: "Waiting for approval", rejected: "Not approved"}[APPROVAL.postStatus(p, DB.uid, a)]}</td><td>${p.retracted ? "" : `<button class="sbtn danger" data-act="ag-retract" data-id="${esc(p.id)}">Withdraw</button>`}</td></tr>`).join("") || `<tr><td colspan="5">Nothing published yet.</td></tr>`}
      </tbody></table></div></div>`;
}
function postSummary(p) {
  if (p.type === "warning") return p.msg || "";
  if (p.type === "forecast") return `${settings().climate[p.zone]?.n || p.zone}: ${p.mm24} mm / 24 h, ${p.mm72} mm / 3 days`;
  if (p.type === "dam") return `${IX.damById[p.dam]?.n || p.dam}: ${FT.damStatus[p.status]?.n || p.status}${p.notice ? " · " + p.notice : ""}`;
  if (p.type === "reading") return `${p.station}: ${p.value} ${(READING_KINDS.find(k => k[0] === p.kind) || [0, ""])[1].replace(/^.*\(|\)$/g, "")}`;
  return "";
}
function localDT(ms) { const d = new Date(ms); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); }

function agencyRequestView() {
  const req = AG.own?.request, dec = !req && AG.own?.decision;
  return `
    <h1>Agency portal</h1>
    <p>Staff of NADMO, GMet, NIHSA, NiMet, NEMA, LASEMA, dam operators and other agencies can publish warnings, forecasts and readings here once an administrator approves them.</p>
    ${dec && !dec.approved ? `<div class="notice">${ICON.info}<div><b>Your last request was not approved</b>Contact an Open Tracker administrator, or send a new request below.</div></div>` : ""}
    ${dec && dec.approved ? `<div class="notice">${ICON.info}<div><b>Request approved</b>Your publishing access is being set up. If this message stays, ask an administrator to check your agency link.</div></div>` : ""}
    ${req ? `<div class="notice info">${ICON.info}<div><b>Request sent</b>You asked to publish for ${esc(agencies().find(x => x.id === req.agency)?.n || req.agency)} on ${esc(fmtDate(req.at))}. An administrator will review it.</div></div>` : ""}
    <form class="card" id="ag-request"><h2>${req ? "Change your request" : "Request publishing access"}</h2>
      <label class="field"><span>Your agency</span><select id="ag-req-agency">${agencies().filter(a => a.status !== "suspended").map(a => `<option value="${esc(a.id)}" ${req?.agency === a.id ? "selected" : ""}>${esc(a.n)}</option>`).join("")}</select></label>
      <label class="field"><span>Your job title and office (shown to administrators only)</span><input id="ag-req-note" maxlength="200" value="${esc(req?.note || "")}"></label>
      <p class="small muted" id="ag-err" role="alert"></p>
      <div class="toolbar"><button class="sbtn primary" type="submit">Send request</button></div>
    </form>
    <p class="small muted">If your agency isn't listed, ask an Open Tracker administrator to add it.</p>`;
}

async function agencySubmit(form) {
  const err = form.querySelector("#ag-err");
  const v = id => form.querySelector(id)?.value ?? "";
  try {
    if (form.id === "ag-request") {
      await DB.api.doc(`agencyData/${DB.uid}`).set({request: {agency: v("#ag-req-agency"), note: v("#ag-req-note").trim().slice(0, 200), at: new Date().toISOString()}});
      toast("Request sent.");
      return;
    }
    const a = AUTH.agency(); if (!a) throw new Error("Your account isn't linked to an agency.");
    const t = form.dataset.type;
    const post = {type: t, at: new Date().toISOString(), c: a.c, retracted: false};
    const need = (x, msg) => { if (x === "" || x == null || (typeof x === "number" && isNaN(x))) throw new Error(msg); return x; };
    if (t === "warning") Object.assign(post, {level: v("#ag-level"), areas: [...form.querySelector("#ag-areas").selectedOptions].map(o => o.value), msg: need(v("#ag-msg").trim(), "Write the warning message."), expires: v("#ag-exp") ? new Date(v("#ag-exp")).toISOString() : "", push: !!form.querySelector("#ag-push")?.checked});
    if (t === "forecast") Object.assign(post, {zone: v("#ag-zone"), mm24: need(parseFloat(v("#ag-mm24")), "Enter the 24-hour rain."), mm72: need(parseFloat(v("#ag-mm72")), "Enter the 3-day rain.")});
    if (t === "dam") Object.assign(post, {dam: v("#ag-dam"), status: v("#ag-status"), notice: v("#ag-notice").trim().slice(0, 200)});
    if (t === "reading") {
      const lat = parseFloat(v("#ag-lat")), lon = parseFloat(v("#ag-lon"));
      if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("Enter a valid latitude and longitude.");
      Object.assign(post, {station: need(v("#ag-station").trim(), "Enter the station name."), kind: v("#ag-kind"), value: need(parseFloat(v("#ag-value")), "Enter the value."), ll: [lon, lat]});
    }
    if (post.mm24 < 0 || post.mm72 < 0) throw new Error("Rain can't be negative.");
    await DB.api.collection(`agencyData/${DB.uid}/posts`).doc().set(post);
    toast(APPROVAL.needed(a.id) ? "Sent. It goes live once an administrator approves it." : "Published.");
    form.reset();
  } catch (e) {
    if (err) err.textContent = e?.code === "invalid_argument" ? "Your access level can't publish yet. Ask the Open Tracker owner to invite you as a Contributor or Editor." : e?.message && !e.code ? e.message : "That didn't publish. Check your connection and try again.";
  }
}
async function agencyAct(act, el) {
  try {
    if (act === "ag-type") { UI.ag.type = el.dataset.k; return render(); }
    if (act === "ag-retract") { if (!/^[A-Za-z0-9_-]{1,200}$/.test(el.dataset.id)) return; await DB.api.doc(`agencyData/${DB.uid}/posts/${el.dataset.id}`).update({retracted: true, retractedAt: new Date().toISOString()}); toast("Withdrawn."); }
  } catch (e) { toast("That didn't save. Try again."); }
}
