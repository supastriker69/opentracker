/* ===== Admin: editors can add, correct, replace and delete every record ===== */
const C_OPTS = [["GH", "Ghana"], ["NG", "Nigeria"]];
const C_OPTS_ALL = [["ALL", "Both countries"], ...C_OPTS];
const SCHEMA = {
  alerts: {title: "Official warnings", one: "warning", help: "Post warnings from NADMO, NEMA, LASEMA, GMet or NiMet. They appear at the top of every matching public page until they expire.",
    cols: [["level", "Type"], ["agency", "Agency"], ["msg", "Message"], ["expires", "Until"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "level", l: "Type", t: "select", opts: [["warning", "Flood warning (red)"], ["watch", "Flood watch (amber)"], ["info", "Notice (blue)"]]},
      {k: "c", l: "Country", t: "select", opts: C_OPTS_ALL}, {k: "areas", l: "Regions or states (IDs, comma separated; blank = whole country)", t: "list", hint: "areas"},
      {k: "agency", l: "Agency", t: "text"}, {k: "msg", l: "Message (plain words)", t: "textarea", wide: true},
      {k: "issued", l: "Issued", t: "datetime"}, {k: "expires", l: "Expires", t: "datetime"}]},
  forecasts: {title: "Rain forecasts", one: "forecast", help: "Type rain forecasts from GMet or NiMet bulletins until the live feed is connected. A forecast is used for 36 hours after its issue time.",
    cols: [["zone", "Weather zone"], ["mm24", "Next 24 h (mm)"], ["mm72", "Next 3 days (mm)"], ["src", "Source"], ["at", "Issued"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "zone", l: "Weather zone", t: "select", opts: () => Object.entries(settings().climate).map(([k, v]) => [k, v.n])},
      {k: "mm24", l: "Rain next 24 hours (mm)", t: "number"}, {k: "mm72", l: "Rain next 3 days (mm)", t: "number"},
      {k: "src", l: "Source (e.g. GMet bulletin 06:00)", t: "text"}, {k: "at", l: "Issued", t: "datetime"}]},
  dams: {title: "Dams", one: "dam", help: "Set each dam's official status from the operator's notice. 'Typical for the season' uses the usual monthly pattern below.",
    cols: [["n", "Dam"], ["river", "River"], ["status", "Status"], ["lastNotice", "Latest notice"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text"}, {k: "river", l: "River", t: "text"}, {k: "c", l: "Country", t: "select", opts: C_OPTS},
      {k: "status", l: "Official status", t: "select", opts: () => Object.entries(FT.damStatus).map(([k, v]) => [k, v.n])},
      {k: "lastNotice", l: "Latest notice shown to the public", t: "text", wide: true}, {k: "op", l: "Operator", t: "text"},
      {k: "ll", l: "Location", t: "ll"}, {k: "note", l: "Background note", t: "textarea", wide: true},
      {k: "season", l: "Usual chance of releases by month (0 to 1)", t: "monthly", wide: true}]},
  hotspots: {title: "Flood areas", one: "flood area", help: "Every area people can search and see on the map.",
    cols: [["n", "Name"], ["r", "Region / state"], ["d", "Causes"], ["t", "Rain to flood (mm)"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text"}, {k: "c", l: "Country", t: "select", opts: C_OPTS},
      {k: "r", l: "Region or state", t: "select", opts: () => FT.areas.map(a => [a.id, `${a.n} (${a.c})`])}, {k: "ll", l: "Location", t: "ll"},
      {k: "d", l: "Causes", t: "drivers", wide: true}, {k: "z", l: "Weather zone", t: "select", opts: () => Object.entries(settings().climate).map(([k, v]) => [k, v.n])},
      {k: "t", l: "Rain over 3 days that usually starts flooding (mm)", t: "number"}, {k: "sev", l: "How bad floods get (1 to 3)", t: "number"},
      {k: "exp", l: "People exposed (1 to 3)", t: "number"}, {k: "vul", l: "Vulnerability (0 to 1)", t: "number"},
      {k: "aka", l: "Other names people search for (comma separated)", t: "list", wide: true}, {k: "why", l: "Plain-language reason shown to the public", t: "textarea", wide: true}]},
  events: {title: "Past floods", one: "past flood", help: "Floods linked to named areas. Add the source link so people can check it.",
    cols: [["date", "Date"], ["t", "Title"], ["ids", "Areas"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "t", l: "Title", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS},
      {k: "date", l: "Date (YYYY-MM-DD, YYYY-MM or YYYY)", t: "text"}, {k: "year", l: "Year (blank if not confirmed)", t: "number"},
      {k: "ids", l: "Flood area IDs (comma separated)", t: "list", wide: true, hint: "hot"}, {k: "impact", l: "What happened", t: "textarea", wide: true},
      {k: "src", l: "Source link", t: "text", wide: true}]},
  regionEvents: {title: "Region reports", one: "region report", help: "Floods reported for a whole region or state without named places.",
    cols: [["date", "Date"], ["r", "Region / state"], ["t", "Title"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "r", l: "Region or state", t: "select", opts: () => FT.areas.map(a => [a.id, `${a.n} (${a.c})`])},
      {k: "t", l: "Title", t: "text"}, {k: "date", l: "Date", t: "text"}, {k: "year", l: "Year", t: "number"},
      {k: "impact", l: "What happened", t: "textarea", wide: true}, {k: "src", l: "Source link", t: "text", wide: true}]},
  safe: {title: "Safe places", one: "safe place", help: "Shelters and safe havens named by NADMO, AMA, NEMA or LASEMA.",
    cols: [["n", "Name"], ["c", "Country"], ["src", "Named by"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS}, {k: "ll", l: "Location", t: "ll"}, {k: "src", l: "Named by", t: "text"}]},
  roads: {title: "Roads to avoid", one: "road", help: "Roads reported impassable in floods.",
    cols: [["n", "Road"], ["c", "Country"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Road", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS}, {k: "ll", l: "Location", t: "ll"}]},
  feeds: {title: "Data feeds", one: "feed", help: "Mark a feed 'Entered by staff' while you type its data in, and 'Connected' once it flows automatically.",
    cols: [["n", "Feed"], ["c", "Country"], ["status", "Status"], ["last", "Last update"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS_ALL}, {k: "what", l: "What it provides", t: "text", wide: true},
      {k: "status", l: "Status", t: "select", opts: [["off", "Not connected yet"], ["manual", "Entered by staff"], ["on", "Connected"]]}, {k: "last", l: "Last update", t: "datetime"}, {k: "note", l: "Note shown to the public", t: "text", wide: true}]},
  agencies: {title: "Agencies", one: "agency", help: "Agencies in Ghana, Nigeria and future countries. Link their staff under People or approve their requests; their posts then appear publicly.",
    cols: [["n", "Agency"], ["c", "Country"], ["kind", "Type"], ["status", "Status"], ["publishers", "Linked staff"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text", wide: true}, {k: "c", l: "Country code (GH, NG, or another ISO code such as CI, TG, BJ, SN)", t: "text"},
      {k: "kind", l: "Type", t: "select", opts: [["met", "Weather service"], ["hydro", "River and hydrology"], ["disaster", "Disaster and emergency"], ["dam", "Dam operator"], ["gov", "Ministry or assembly"], ["other", "Other"]]},
      {k: "status", l: "Status", t: "select", opts: [["active", "Active"], ["suspended", "Suspended (posts hidden)"]]},
      {k: "push", l: "May send public notifications", t: "select", opts: [["true", "Yes"], ["false", "No"]]},
      {k: "supplies", l: "What they supply", t: "text", wide: true}, {k: "web", l: "Website", t: "text", wide: true}]},
  notifications: {title: "Public notifications", one: "notification",
    help: "Send credible, official information to the public. It appears at once in everyone's Alerts and, on the Open Tracker web app, as a phone notification for people who follow the places it covers.",
    cols: [["title", "Title"], ["agency", "From"], ["level", "Type"], ["areas", "Where"], ["at", "Sent"], ["expires", "Until"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "level", l: "Type", t: "select", opts: NOTICE_LEVELS}, {k: "agency", l: "Sent on behalf of", t: "select", opts: () => noticeSenders()},
      {k: "title", l: "Title (short, up to 80 characters)", t: "text", wide: true}, {k: "msg", l: "Message in plain words (up to 500 characters)", t: "textarea", wide: true},
      {k: "c", l: "Country", t: "select", opts: C_OPTS_ALL}, {k: "areas", l: "Regions or states (IDs, comma separated; blank = whole country)", t: "list", hint: "areas", wide: true},
      {k: "lat", l: "Or near a spot: latitude", t: "number"}, {k: "lon", l: "Longitude", t: "number"}, {k: "km", l: "Radius (km, 1 to 300)", t: "number"},
      {k: "at", l: "Sent", t: "datetime"}, {k: "expires", l: "Show until", t: "datetime"}]},
  contacts: {title: "Emergency numbers", one: "number", help: "Numbers shown on every answer page for that country.",
    cols: [["c", "Country"], ["n", "Name"], ["num", "Number"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "c", l: "Country", t: "select", opts: C_OPTS}, {k: "n", l: "Name", t: "text"}, {k: "num", l: "Number", t: "text"}]}
};
/* tabs, with the permission each needs */
const TABS = [
  ["overview", "Overview", () => AUTH.anyAdmin()],
  ["analytics", "Analytics", () => AUTH.can("analytics.view")],
  ["approvals", "Approvals", () => AUTH.can("approvals.manage")],
  ["contributions", "Contributions", () => AUTH.can("contributions.review")],
  ["replays", "Flood replays", () => AUTH.can("data.edit")],
  ["live", "Live data", () => AUTH.can("data.edit")],
  ["notifications", "Send notification", () => AUTH.can("notify.send")],
  ["alerts", "Warnings", () => AUTH.can("warnings.manage")],
  ["forecasts", "Rain forecasts", () => AUTH.can("forecasts.manage")],
  ["dams", "Dams", () => AUTH.can("forecasts.manage")],
  ["hotspots", "Flood areas", () => AUTH.can("data.edit")],
  ["events", "Past floods", () => AUTH.can("data.edit")],
  ["regionEvents", "Region reports", () => AUTH.can("data.edit")],
  ["safe", "Safe places", () => AUTH.can("data.edit")],
  ["roads", "Roads", () => AUTH.can("data.edit")],
  ["feeds", "Data feeds", () => AUTH.can("data.edit")],
  ["contacts", "Emergency numbers", () => AUTH.can("data.edit")],
  ["agencies", "Agencies", () => AUTH.can("agencies.manage")],
  ["requests", "Access requests", () => AUTH.can("agencies.manage")],
  ["posts", "Agency posts", () => AUTH.can("agencies.manage") || AUTH.can("warnings.manage")],
  ["people", "People", () => AUTH.can("users.manage")],
  ["roles", "Roles", () => AUTH.can("users.manage")],
  ["model", "Model settings", () => AUTH.can("model.manage")],
  ["audit", "Audit log", () => AUTH.can("audit.view")]
];
function noticeSenders() {
  const own = AUTH.agency();
  if (own && !AUTH.can("users.manage")) return [[own.id, own.n]];
  return [["opentracker", "Open Tracker team"]].concat(agencies().filter(a => a.status !== "suspended" && a.push !== false).map(a => [a.id, a.n]));
}
const tabLabel = k => (TABS.find(t => t[0] === k) || [k, k])[1];

/* names are resolved at render time and never stored */
const NAMES = {map: {}, pending: false};
function nameOf(uid) { return uid === DB.uid ? "You" : NAMES.map[uid] || "Unnamed person"; }
async function ensureNames(ids) {
  const miss = [...new Set(ids.filter(id => id && !(id in NAMES.map)))];
  if (!miss.length || !DB.user || NAMES.pending) return;
  NAMES.pending = true;
  try { const ps = await DB.user.profiles(miss); miss.forEach(id => NAMES.map[id] = ps[id]?.name || ""); } catch (e) { miss.forEach(id => NAMES.map[id] = ""); }
  NAMES.pending = false;
  if (UI.mode === "admin") render();
}

function viewAdmin() {
  const a = UI.admin;
  if (!DB.api) return `<h1>Admin</h1><div class="notice">${ICON.info}<div><b>Editing needs the shared database</b>Open the Open Tracker page signed in to claude.ai to manage its data.</div></div>`;
  const tabs = TABS.filter(t => t[2]());
  if (!tabs.length) return `<h1>Admin</h1><div class="notice">${ICON.info}<div><b>You don't have an admin role</b>Ask an Open Tracker administrator to give you one.</div></div>`;
  if (!tabs.some(t => t[0] === a.tab)) a.tab = tabs[0][0];
  const waiting = AUTH.can("approvals.manage") ? APPROVAL.pendingPosts().length + APPROVAL.pendingChanges().length : 0;
  const nav = `<nav class="tabs" aria-label="Admin sections">${tabs.map(([k, n]) => `<button data-act="ad-tab" data-k="${k}" aria-pressed="${a.tab === k}">${n}${k === "approvals" && waiting ? ` <span class="badge">${waiting}</span>` : ""}</button>`).join("")}</nav>`;
  let body;
  if (!DB.cfg && !["overview", "analytics", "contributions"].includes(a.tab)) body = `<div class="notice">${ICON.info}<div><b>Set up the database first</b>Go to Overview and load the starting data.</div></div>`;
  else body = ({overview: adOverview, approvals: adApprovals, contributions: adContributions, replays: adReplays, live: adLive, analytics: adAnalytics, model: adModel, audit: adAudit, people: adPeople, roles: adRoles, requests: adRequests, posts: adPosts}[a.tab] || (() => adCollection(a.tab)))();
  return `<h1>Admin</h1><p class="muted">Signed in as <b>${esc(AUTH.label() || "editor")}</b>. Every change is saved straight away and recorded in the audit log.</p>${nav}${body}`;
}
function confirmBox() {
  const c = UI.admin.confirm;
  return c ? `<div class="confirm" role="alert"><b>${esc(c.msg)}</b><div class="toolbar"><button class="sbtn danger" type="button" data-act="ad-yes">${esc(c.yes)}</button><button class="sbtn" type="button" data-act="ad-no">Cancel</button></div></div>` : "";
}

/* live flood and heat data from the Open Tracker website's data feeds */
function adLive() {
  const w = hazardsDoc("world");
  const n = w ? Object.keys(w.countries).length : 0;
  return `<div class="card"><h2>Live flood and heat data</h2>
    <p>The Open Tracker website reads forecasts, river flow, official warnings and satellite scenes for every country around the clock. This page can't reach other sites, so bring that data here as a file:</p>
    <ol class="steps"><li>On the website, open the push console (<code>/console.html</code>) as an administrator and choose <b>Download live data</b>.</li><li>Import the file here. Every country's heat and flood reach updates for everyone.</li></ol>
    <p class="small muted">${w === undefined ? "Checking…" : w ? `Now showing data for ${n} countr${n === 1 ? "y" : "ies"}. ${esc(hazardsUpdated(w))}.` : "No live data imported yet."}</p>
    <label class="sbtn primary" for="hz-import">Import live data file</label><input id="hz-import" type="file" accept="application/json,.json" class="sr">
    <p id="hz-msg" role="status"></p></div>`;
}
async function liveImport(file) {
  const m = $("#hz-msg");
  try { const r = await importSnapshot(file); toast(`Imported live data for ${r.countries} countries.`); render(); }
  catch (e) { if (m) { m.textContent = e.message; m.className = "small err"; } }
}

function adOverview() {
  const rows = COLLS.filter(k => k !== "members" || AUTH.can("users.manage")).map(k => [tabLabel(k), data(k).length]);
  const reqs = AG.requests.length, publishers = Object.keys(publisherMap()).length;
  const waiting = AUTH.can("approvals.manage") ? APPROVAL.pendingPosts().length + APPROVAL.pendingChanges().length : 0;
  return `
  ${waiting ? `<div class="notice">${ICON.info}<div><b>${waiting} agency item${waiting === 1 ? " is" : "s are"} waiting for approval</b><button class="sbtn primary" data-act="ad-tab" data-k="approvals">Review now</button></div></div>` : ""}
  ${myChangesHtml()}
  <div class="grid2">
    <div class="card"><h2>Data source</h2>
      <p>${DB.cfg ? "Public pages show the shared database. Changes reach everyone signed in within seconds." : "The database is empty, so public pages show Open Tracker's built-in starting data."}</p>
      <div class="kv">${rows.map(([n, c]) => `<span>${esc(n)}</span><b class="num">${c}</b>`).join("")}<span>Linked agency staff</span><b class="num">${publishers}</b>${AUTH.can("agencies.manage") ? `<span>Access requests waiting</span><b class="num">${reqs}</b>` : ""}</div>
      ${!DB.cfg && (AUTH.isOwner || AUTH.can("backup.manage")) ? `<button class="sbtn primary" data-act="ad-seed">Set up the database with the starting data</button>` : ""}
    </div>
    ${AUTH.can("backup.manage") ? `<div class="card"><h2>Back up and restore</h2>
      <p class="small">Download everything as one file, or replace all data from a backup.</p>
      <div class="toolbar"><button class="sbtn" data-act="ad-export">Download backup</button><label class="sbtn" for="ad-import" style="display:inline-flex;align-items:center">Restore from file</label><input id="ad-import" type="file" accept="application/json,.json" class="sr"></div>
      ${DB.cfg ? `<button class="sbtn danger" data-act="ad-ask" data-k="reset">Reset all data to the starting data</button>` : ""}
      ${confirmBox()}
    </div>` : ""}
    <div class="card"><h2>Quick actions</h2><div class="toolbar">
      ${AUTH.can("notify.send") ? `<button class="sbtn primary" data-act="ad-new" data-k="notifications">Send a public notification</button>` : ""}
      ${AUTH.can("warnings.manage") ? `<button class="sbtn primary" data-act="ad-new" data-k="alerts">Post a warning</button>` : ""}
      ${AUTH.can("forecasts.manage") ? `<button class="sbtn" data-act="ad-new" data-k="forecasts">Enter a rain forecast</button><button class="sbtn" data-act="ad-tab" data-k="dams">Update a dam</button>` : ""}
      ${AUTH.can("data.edit") ? `<button class="sbtn" data-act="ad-new" data-k="events">Record a flood</button>` : ""}
      ${AUTH.can("users.manage") ? `<button class="sbtn" data-act="ad-tab" data-k="people">Add a person</button>` : ""}
      ${AUTH.can("agencies.manage") ? `<button class="sbtn" data-act="ad-new" data-k="agencies">Add an agency</button>` : ""}
    </div></div>
  </div>`;
}

function fmtCell(k, v) {
  if (v == null || v === "") return "—";
  if (k === "publishers") return String((v || []).length);
  if (Array.isArray(v)) return esc(v.join(", "));
  if (k === "status") return esc(FT.damStatus[v]?.n || {off: "Not connected yet", manual: "Entered by staff", on: "Connected", active: "Active", suspended: "Suspended"}[v] || v);
  if (k === "r") return esc(IX.areaById[v]?.n || v);
  if (["expires", "issued", "at", "last"].includes(k)) return esc(fmtDate(v));
  if (k === "zone") return esc(settings().climate[v]?.n || v);
  if (k === "level") return esc((NOTICE_LEVELS.find(l => l[0] === v) || [0, {warning: "Flood warning", watch: "Flood watch", info: "Notice"}[v] || v])[1]);
  if (k === "agency" && agencies().some(a => a.id === v)) return esc(agencies().find(a => a.id === v).n);
  if (k === "push") return v === false ? "No" : "Yes";
  const s = String(v); return esc(s.length > 70 ? s.slice(0, 70) + "…" : s);
}

function adCollection(key) {
  const sc = SCHEMA[key], a = UI.admin;
  if (!sc) return "";
  if (a.edit && a.edit.coll === key) return adForm(key);
  const q = norm(a.q);
  const rows = data(key).filter(r => !q || norm(JSON.stringify(r)).includes(q)).sort((x, y) => String(x[sc.cols[0][0]] ?? "").localeCompare(String(y[sc.cols[0][0]] ?? "")));
  const del = canDelete(key);
  return `
  <div class="card">
    <h2>${esc(sc.title)}</h2><p class="small muted">${esc(sc.help)}</p>
    ${APPROVAL.gate() ? `<div class="notice info">${ICON.info}<div>Changes you make here are sent to an administrator and go live once approved. Follow them under Overview.</div></div>` : ""}
    <div class="toolbar"><input id="ad-q" type="search" placeholder="Search ${esc(sc.title.toLowerCase())}" value="${esc(a.q)}" aria-label="Search ${esc(sc.title)}"><button class="sbtn primary" data-act="ad-new" data-k="${key}">Add ${esc(sc.one)}</button></div>
    ${a.confirm?.coll === key ? confirmBox() : ""}
    <div class="tablewrap"><table><thead><tr>${sc.cols.map(c => `<th>${esc(c[1])}</th>`).join("")}<th>Actions</th></tr></thead><tbody>
      ${rows.map(r => `<tr>${sc.cols.map(([k]) => `<td>${fmtCell(k, r[k])}</td>`).join("")}<td style="white-space:nowrap"><button class="sbtn" data-act="ad-edit" data-k="${key}" data-id="${esc(r.id)}">Edit</button>${del ? ` <button class="sbtn danger" data-act="ad-ask" data-k="del" data-coll="${key}" data-id="${esc(r.id)}">Delete</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="${sc.cols.length + 1}">Nothing here yet.</td></tr>`}
    </tbody></table></div>
    <p class="small muted">${rows.length} shown.</p>
  </div>`;
}

function fieldHtml(f, v) {
  const id = "f-" + f.k, lab = `<span>${esc(f.l)}</span>`, wide = f.wide ? " wide" : "";
  if (f.t === "id") {
    const isNew = UI.admin.edit.isNew;
    return `<label class="field"><span>${esc(f.l)}${isNew ? " (letters, numbers, dashes)" : " (fixed)"}</span><input id="${id}" value="${esc(v ?? "")}" ${isNew ? "" : "readonly"} required></label>`;
  }
  if (f.t === "select") {
    const opts = typeof f.opts === "function" ? f.opts() : f.opts;
    return `<label class="field${wide}">${lab}<select id="${id}">${opts.map(([o, n]) => `<option value="${esc(o)}" ${String(v ?? "") === String(o) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
  }
  if (f.t === "textarea") return `<label class="field${wide}">${lab}<textarea id="${id}">${esc(v ?? "")}</textarea></label>`;
  if (f.t === "number") return `<label class="field${wide}">${lab}<input id="${id}" type="number" step="any" value="${esc(v ?? "")}"></label>`;
  if (f.t === "datetime") {
    let val = ""; if (v) { const d = new Date(v); if (!isNaN(d)) val = localDT(d.getTime()); }
    return `<label class="field${wide}">${lab}<input id="${id}" type="datetime-local" value="${val}"></label>`;
  }
  if (f.t === "list") {
    const hint = f.hint === "areas" ? `For example: ${FT.areas.slice(0, 3).map(a => a.id).join(", ")}` : f.hint === "hot" ? `For example: ${IX.hot.slice(0, 3).map(h => h.id).join(", ")}` : "";
    return `<label class="field${wide}">${lab}<input id="${id}" value="${esc((v || []).join(", "))}">${hint ? `<span class="small muted">${esc(hint)}</span>` : ""}</label>`;
  }
  if (f.t === "ll") {
    const ll = v || [0, 0];
    return `<div class="field"><span>${esc(f.l)} (latitude, longitude)</span><div class="row" style="gap:6px"><input id="f-lat" type="number" step="any" value="${esc(ll[1])}" aria-label="Latitude"><input id="f-lon" type="number" step="any" value="${esc(ll[0])}" aria-label="Longitude"></div></div>`;
  }
  if (f.t === "drivers") {
    const d = v || [];
    const opts = [["rain", "Heavy rain"], ["river", "River"], ["coast", "Coast and tide"], ...data("dams").map(x => [x.id, x.n])];
    return `<fieldset class="field wide" style="border:0;padding:0;margin:0"><span>${esc(f.l)}</span><div class="checks">${opts.map(([k, n]) => `<label><input type="checkbox" data-drv="${esc(k)}" ${d.includes(k) ? "checked" : ""}> ${esc(n)}</label>`).join("")}</div></fieldset>`;
  }
  if (f.t === "monthly") {
    const m = v || Array(12).fill(0);
    return `<div class="field wide"><span>${esc(f.l)}</span><div class="tablewrap"><table class="mtable"><tr>${MONTHS.map(x => `<th>${x.slice(0, 3)}</th>`).join("")}</tr><tr>${m.map((x, i) => `<td><input data-mon="${i}" type="number" step="any" value="${esc(x)}" aria-label="${MONTHS[i]}"></td>`).join("")}</tr></table></div></div>`;
  }
  return `<label class="field${wide}">${lab}<input id="${id}" value="${esc(v ?? "")}"></label>`;
}

function adForm(key) {
  const sc = SCHEMA[key], e = UI.admin.edit;
  return `
  <form class="card" id="ad-form" data-coll="${key}" novalidate>
    <h2>${e.isNew ? "Add " : "Edit "}${esc(sc.one)}</h2>
    <div class="formgrid">${sc.fields.map(f => fieldHtml(f, e.rec[f.k])).join("")}</div>
    <p class="small" id="ad-err" role="alert" style="color:var(--vhigh)"></p>
    <div class="toolbar"><button class="sbtn primary" type="submit">Save</button><button class="sbtn" type="button" data-act="ad-cancel">Cancel</button>${!e.isNew && canDelete(key) ? `<button class="sbtn danger" type="button" data-act="ad-ask" data-k="del" data-coll="${key}" data-id="${esc(e.rec.id)}">Delete</button>` : ""}</div>
    ${UI.admin.confirm?.coll === key ? confirmBox() : ""}
  </form>`;
}

const ID_RE = /^[A-Za-z0-9_\-]{1,60}$/;
function readForm(key, form) {
  const sc = SCHEMA[key], old = UI.admin.edit.rec, out = clone(old);
  for (const f of sc.fields) {
    if (f.t === "ll") {
      const lat = parseFloat(form.querySelector("#f-lat").value), lon = parseFloat(form.querySelector("#f-lon").value);
      if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("Enter a valid latitude (−90 to 90) and longitude (−180 to 180).");
      out.ll = [lon, lat]; continue;
    }
    if (f.t === "drivers") { out.d = [...form.querySelectorAll("[data-drv]")].filter(x => x.checked).map(x => x.dataset.drv); if (!out.d.length) throw new Error("Choose at least one cause."); continue; }
    if (f.t === "monthly") { out[f.k] = [...form.querySelectorAll("[data-mon]")].map(x => Math.max(0, Math.min(1, parseFloat(x.value) || 0))); continue; }
    const el = form.querySelector("#f-" + f.k); if (!el) continue;
    let v = el.value;
    if (f.t === "id") {
      v = v.trim();
      if (!ID_RE.test(v)) throw new Error("The ID can use letters, numbers, dashes and underscores only (up to 60).");
      if (UI.admin.edit.isNew && data(key).some(r => r.id === v)) throw new Error("That ID is already used. Choose another.");
    }
    if (f.t === "number") { v = v.trim() === "" ? null : Number(v); if (v !== null && !isFinite(v)) throw new Error(`${f.l}: enter a number.`); }
    if (f.t === "list") v = v.split(",").map(s => s.trim()).filter(Boolean).slice(0, 200);
    if (f.t === "datetime") v = v ? new Date(v).toISOString() : "";
    if (typeof v === "string") v = v.slice(0, 4000);
    out[f.k] = v;
  }
  if (key === "forecasts") { if (!out.id) out.id = out.zone; if (!(out.mm24 >= 0 && out.mm72 >= 0)) throw new Error("Enter both rain amounts (0 or more)."); }
  if (key === "hotspots") {
    if (!IX.areaById[out.r] || IX.areaById[out.r].c !== out.c) throw new Error("The region or state must be in the chosen country.");
    for (const [k, lo, hi] of [["t", 5, 1000], ["sev", 1, 3], ["exp", 1, 3], ["vul", 0, 1]]) if (!(out[k] >= lo && out[k] <= hi)) throw new Error(`Check “${sc.fields.find(f => f.k === k).l}”: it must be between ${lo} and ${hi}.`);
  }
  if (key === "events") {
    const bad = (out.ids || []).filter(id => !IX.byId[id]);
    if (bad.length) throw new Error("Unknown flood area IDs: " + bad.join(", "));
    if (out.year != null && !(out.year >= 1900 && out.year <= 2100)) throw new Error("Enter a year between 1900 and 2100, or leave it blank.");
  }
  if (key === "alerts") {
    if (!String(out.msg || "").trim()) throw new Error("Write the warning message.");
    const bad = (out.areas || []).filter(id => !IX.areaById[id]); if (bad.length) throw new Error("Unknown region or state IDs: " + bad.join(", "));
  }
  if (key === "agencies") { out.c = String(out.c || "").trim().toUpperCase(); if (!/^[A-Z]{2}$/.test(out.c)) throw new Error("Enter a two-letter country code, such as GH or NG."); out.publishers = old.publishers || []; out.push = out.push !== "false"; }
  if (key === "agencies" && out.web && !safeUrl(out.web)) throw new Error("The website must start with http:// or https://");
  if (key === "notifications") {
    out.title = String(out.title || "").trim(); out.msg = String(out.msg || "").trim();
    if (!out.title || out.title.length > 80) throw new Error("Write a title of up to 80 characters.");
    if (!out.msg || out.msg.length > 500) throw new Error("Write a message of up to 500 characters.");
    if (!noticeSenders().some(s => s[0] === out.agency)) throw new Error("Choose who this is sent on behalf of.");
    const bad = (out.areas || []).filter(id => !IX.areaById[id] || (out.c !== "ALL" && IX.areaById[id].c !== out.c));
    if (bad.length) throw new Error("These regions or states aren't in the chosen country: " + bad.join(", "));
    const spot = [out.lat, out.lon, out.km].filter(v => v !== null && v !== undefined);
    if (spot.length && spot.length < 3) throw new Error("For a spot, enter latitude, longitude and radius, or leave all three blank.");
    if (spot.length) {
      if (Math.abs(out.lat) > 90 || Math.abs(out.lon) > 180 || !(out.km >= 1 && out.km <= 300)) throw new Error("Check the spot: latitude −90 to 90, longitude −180 to 180, radius 1 to 300 km.");
      out.ll = [out.lon, out.lat];
    } else out.ll = null;
    if (!out.at || (UI.admin.edit.isNew && Math.abs(Date.parse(out.at) - Date.now()) < 120e3)) out.at = new Date().toISOString();   /* exact send time */
    if (out.expires && Date.parse(out.expires) <= Date.parse(out.at)) throw new Error("“Show until” must be after the send time.");
  }
  if (key === "events" && out.src && !/^https?:\/\//.test(out.src)) throw new Error("The source link must start with http:// or https://");
  if (sc.fields.some(f => f.k === "n") && !String(out.n || "").trim()) throw new Error("Enter a name.");
  return out;
}

function adModel() {
  const st = settings(), z = Object.entries(st.climate);
  return `
  <form class="card" id="ad-model" novalidate>
    <h2>Model settings</h2>
    <p class="small muted">These change the risk levels everyone sees. Score = P × (wE·E + wV·V) × (1 + wH·H).</p>
    <div class="formgrid">
      <label class="field"><span>wE, weight of people exposed</span><input id="m-wE" type="number" step="0.05" value="${st.wE}"></label>
      <label class="field"><span>wV, weight of vulnerability</span><input id="m-wV" type="number" step="0.05" value="${st.wV}"></label>
      <label class="field"><span>wH, weight of past floods</span><input id="m-wH" type="number" step="0.05" value="${st.wH}"></label>
      <label class="field"><span>Heavy-rain tail (0.2 to 1.5; lower = more extreme days)</span><input id="m-tail" type="number" step="0.05" value="${st.tail}"></label>
      <label class="field"><span>Medium from score</span><input id="m-med" type="number" step="0.01" value="${st.cut.med}"></label>
      <label class="field"><span>High from score</span><input id="m-high" type="number" step="0.01" value="${st.cut.high}"></label>
      <label class="field"><span>Very high from score</span><input id="m-vhigh" type="number" step="0.01" value="${st.cut.vhigh}"></label>
      <label class="field"><span>Use official forecasts for (hours)</span><input id="m-fresh" type="number" step="1" value="${st.freshHours}"></label>
      <label class="field wide"><span>Message at the top of every public page (blank for none)</span><textarea id="m-notice">${esc(st.notice || "")}</textarea></label>
    </div>
    <h3>Typical monthly rain by weather zone (mm)</h3>
    <div class="tablewrap"><table class="mtable"><tr><th>Zone</th>${MONTHS.map(m => `<th>${m.slice(0, 3)}</th>`).join("")}</tr>
      ${z.map(([k, v]) => `<tr><td><input data-zn="${esc(k)}" value="${esc(v.n)}" style="width:170px;text-align:left" aria-label="Zone name"></td>${v.m.map((x, i) => `<td><input data-zone="${esc(k)}" data-mon="${i}" type="number" step="1" value="${esc(x)}" aria-label="${esc(v.n)} ${MONTHS[i]}"></td>`).join("")}</tr>`).join("")}
    </table></div>
    ${outlookFieldsHtml()}
    <p class="small" id="ad-err" role="alert" style="color:var(--vhigh)"></p>
    <div class="toolbar"><button class="sbtn primary" type="submit">Save model settings</button><button class="sbtn" type="button" data-act="ad-ask" data-k="model-reset">Restore default settings</button></div>
    ${UI.admin.confirm?.k === "model-reset" ? confirmBox() : ""}
  </form>`;
}
/* the rainy season outlook: year, ENSO and the official high-risk lists (one blank row adds a list) */
function outlookFieldsHtml() {
  const o = outlookSettings();
  const lists = (o.lists || []).concat([{id: "", n: "", boost: 1.3, src: "", areas: []}]);
  return `<h3>Rainy season outlook</h3>
    <p class="small muted">Update these when GMet, NiMet and NIHSA publish next year's outlooks (February to April). Areas on a list get their chance of flooding raised by its factor.</p>
    <div class="formgrid">
      <label class="field"><span>Outlook for the rainy season of</span><input id="o-year" type="number" step="1" value="${o.year}"></label>
      <label class="field"><span>Flood records count from</span><input id="o-start" type="number" step="1" value="${o.recordStart}"></label>
      <label class="field"><span>ENSO state expected</span><select id="o-enso">${Object.entries(ENSO).map(([k, v]) => `<option value="${k}" ${o.enso === k ? "selected" : ""}>${esc(v[1])}</option>`).join("")}</select></label>
      <label class="field wide"><span>ENSO note shown to the public</span><input id="o-enso-note" maxlength="400" value="${esc(o.ensoNote || "")}"></label>
    </div>
    ${lists.map((l, i) => `<fieldset class="card" style="margin-top:10px"><legend class="small">${l.n ? "Official list" : "Add a new official list"}</legend><div class="formgrid">
      <label class="field wide"><span>Name and date of the official outlook</span><input data-ol="n" data-i="${i}" maxlength="200" value="${esc(l.n)}"></label>
      <label class="field wide"><span>Regions or states on it (IDs, comma separated)</span><input data-ol="areas" data-i="${i}" value="${esc((l.areas || []).join(", "))}"></label>
      <label class="field"><span>Raise the chance by (1 to 3)</span><input data-ol="boost" data-i="${i}" type="number" step="0.05" value="${esc(l.boost)}"></label>
      <label class="field wide"><span>Source link</span><input data-ol="src" data-i="${i}" maxlength="500" value="${esc(l.src || "")}"></label>
    </div></fieldset>`).join("")}`;
}
function readOutlook(form) {
  const num = (id, name, lo, hi) => { const v = Number(form.querySelector(id).value); if (!Number.isInteger(v) || v < lo || v > hi) throw new Error(`${name} must be a whole number from ${lo} to ${hi}.`); return v; };
  const year = num("#o-year", "The outlook year", 2020, 2100), recordStart = num("#o-start", "The record start", 1950, year);
  const enso = form.querySelector("#o-enso").value;
  if (!ENSO[enso]) throw new Error("Choose an ENSO state.");
  const rows = {};
  form.querySelectorAll("[data-ol]").forEach(i => { (rows[i.dataset.i] = rows[i.dataset.i] || {})[i.dataset.ol] = i.value.trim(); });
  const lists = Object.values(rows).filter(r => r.n).map((r, i) => {
    const areas = r.areas.split(",").map(s => s.trim()).filter(Boolean);
    const bad = areas.filter(a => !IX.areaById[a]);
    if (bad.length) throw new Error(`Unknown region or state IDs in "${r.n}": ${bad.join(", ")}`);
    const boost = Number(r.boost);
    if (!(boost >= 1 && boost <= 3)) throw new Error(`The factor for "${r.n}" must be between 1 and 3.`);
    if (r.src && !safeUrl(r.src)) throw new Error(`The source link for "${r.n}" must start with http:// or https://`);
    return {id: "list" + (i + 1), n: r.n.slice(0, 200), areas, boost, src: r.src};
  });
  return {year, recordStart, enso, ensoNote: form.querySelector("#o-enso-note").value.trim().slice(0, 400), lists};
}
function readModel(form) {
  const st = settings();
  const num = (id, name, lo, hi) => { const v = Number(form.querySelector(id).value); if (!isFinite(v) || v < lo || v > hi) throw new Error(`${name} must be between ${lo} and ${hi}.`); return v; };
  const out = {wE: num("#m-wE", "wE", 0, 5), wV: num("#m-wV", "wV", 0, 5), wH: num("#m-wH", "wH", 0, 5), tail: num("#m-tail", "The heavy-rain tail", .2, 1.5),
    cut: {med: num("#m-med", "Medium", 0, 5), high: num("#m-high", "High", 0, 5), vhigh: num("#m-vhigh", "Very high", 0, 5)},
    freshHours: num("#m-fresh", "Forecast hours", 1, 240), notice: form.querySelector("#m-notice").value.trim().slice(0, 500), climate: clone(st.climate)};
  if (!(out.cut.med < out.cut.high && out.cut.high < out.cut.vhigh)) throw new Error("Levels must go up: Medium below High below Very high.");
  out.outlook = readOutlook(form);
  form.querySelectorAll("[data-zone]").forEach(i => { const v = Number(i.value); out.climate[i.dataset.zone].m[+i.dataset.mon] = isFinite(v) ? Math.max(0, Math.min(2000, v)) : 0; });
  form.querySelectorAll("[data-zn]").forEach(i => { out.climate[i.dataset.zn].n = i.value.trim().slice(0, 60) || out.climate[i.dataset.zn].n; });
  return out;
}

/* ----- people ----- */
const AGENCY_ROLES = ["agency-publisher", "agency-editor"];
function roleOpts(sel) { return roles().map(r => `<option value="${esc(r.id)}" ${r.id === sel ? "selected" : ""}>${esc(r.n)}</option>`).join(""); }
function agencyOpts(sel) { return `<option value="">—</option>` + agencies().map(a => `<option value="${esc(a.id)}" ${a.id === sel ? "selected" : ""}>${esc(a.n)}</option>`).join(""); }
function adPeople() {
  const pp = UI.admin.people, members = data("members");
  ensureNames(members.map(m => m.id));
  return `
  <div class="card"><h2>Add a person</h2>
    <p class="small muted">Search people in your organisation or already invited to Open Tracker. To add someone from outside, first invite them from the Share menu, then find them here.</p>
    <div class="formgrid">
      <label class="field wide"><span>Name or email</span><input id="pp-q" type="search" autocomplete="off" value="${esc(pp.q)}"></label>
      <label class="field"><span>Role</span><select id="pp-role">${roleOpts(pp.role)}</select></label>
      <label class="field"><span>Acts for agency (needed for agency roles)</span><select id="pp-agency">${agencyOpts(pp.agency)}</select></label>
    </div>
    <div class="results" id="pp-hits">${peopleHits()}</div>
  </div>
  <div class="card"><h2>People with access (${members.length})</h2>
    <p class="small muted">The owner always has full access. People who edit data also need Editor access in the Share menu; agency publishers need at least Contributor access.</p>
    ${UI.admin.confirm?.k === "rm-member" ? confirmBox() : ""}
    <div class="tablewrap"><table><thead><tr><th>Person</th><th>Role</th><th>Agency</th><th>Active</th><th>Added</th><th></th></tr></thead><tbody>
    ${members.map(m => `<tr><td>${esc(nameOf(m.id))}</td>
      <td><select data-member="${esc(m.id)}" data-f="role" aria-label="Role">${roleOpts(m.role)}</select></td>
      <td><select data-member="${esc(m.id)}" data-f="agency" aria-label="Agency">${agencyOpts(m.agency)}</select></td>
      <td><input type="checkbox" data-member="${esc(m.id)}" data-f="active" ${m.active !== false ? "checked" : ""} aria-label="Active"></td>
      <td class="num small">${esc(m.addedAt ? fmtDate(m.addedAt) : "")}</td>
      <td><button class="sbtn danger" data-act="ad-ask" data-k="rm-member" data-id="${esc(m.id)}">Remove</button></td></tr>`).join("") || `<tr><td colspan="6">No one added yet.</td></tr>`}
    </tbody></table></div></div>`;
}
function peopleHits() {
  const pp = UI.admin.people;
  if (!pp.q.trim()) return "";
  if (!pp.hits.length) return `<p class="muted">No one found. Check the spelling, or invite them from the Share menu first.</p>`;
  const have = new Set(data("members").map(m => m.id));
  return pp.hits.map(h => `<div class="pick"><span class="grow"><span class="t">${esc(h.name || "Unnamed person")}</span><span class="s">${h.guest ? "Outside your organisation" : "In your organisation"}</span></span>${have.has(h.id) ? `<span class="badge">Already added</span>` : `<button class="sbtn primary" data-act="pp-add" data-id="${esc(h.id)}">Add</button>`}</div>`).join("");
}
let peopleSeq = 0;
async function peopleSearch(q) {
  const pp = UI.admin.people; pp.q = q;
  const seq = ++peopleSeq;
  let hits = [];
  try { hits = DB.user && q.trim() ? await DB.user.search(q) : []; } catch (e) {}
  if (seq !== peopleSeq) return;
  pp.hits = hits.slice(0, 8);
  hits.forEach(h => NAMES.map[h.id] = h.name || "");
  const box = $("#pp-hits"); if (box) box.innerHTML = peopleHits();
}

/* ----- roles ----- */
function adRoles() {
  const e = UI.admin.edit;
  if (e && e.coll === "roles") {
    const r = e.rec, locked = !!r.builtin;
    return `<form class="card" id="ad-role" novalidate><h2>${e.isNew ? "Create a role" : locked ? esc(r.n) + " (built-in)" : "Edit role"}</h2>
      ${locked ? `<p class="small muted">Built-in roles can't be changed. Create a custom role to choose different permissions.</p>` : ""}
      <label class="field"><span>Role name</span><input id="r-n" value="${esc(r.n || "")}" ${locked ? "readonly" : ""} maxlength="60"></label>
      <fieldset class="field" style="border:0;padding:0;margin:0"><span>Permissions</span><div class="checks" style="flex-direction:column;align-items:flex-start">
        ${PERMS.map(([k, n]) => `<label><input type="checkbox" data-perm="${k}" ${(r.perms || []).includes(k) ? "checked" : ""} ${locked ? "disabled" : ""}> ${esc(n)}</label>`).join("")}
      </div></fieldset>
      <p class="small" id="ad-err" role="alert" style="color:var(--vhigh)"></p>
      <div class="toolbar">${locked ? "" : `<button class="sbtn primary" type="submit">Save role</button>`}<button class="sbtn" type="button" data-act="ad-cancel">${locked ? "Close" : "Cancel"}</button></div></form>`;
  }
  const inUse = id => data("members").filter(m => m.role === id).length;
  return `<div class="card"><h2>Roles</h2><p class="small muted">A role is a named set of permissions. Assign roles to people under People.</p>
    <div class="toolbar"><button class="sbtn primary" data-act="role-new">Create a role</button></div>
    ${UI.admin.confirm?.k === "rm-role" ? confirmBox() : ""}
    <div class="tablewrap"><table><thead><tr><th>Role</th><th>Permissions</th><th class="n">People</th><th></th></tr></thead><tbody>
    ${roles().map(r => `<tr><td><b>${esc(r.n)}</b> ${r.builtin ? `<span class="badge">Built-in</span>` : ""}</td><td class="small">${esc((r.perms || []).map(p => PERMS.find(x => x[0] === p)?.[1] || p).join("; "))}</td><td class="n">${inUse(r.id)}</td>
      <td style="white-space:nowrap"><button class="sbtn" data-act="role-edit" data-id="${esc(r.id)}">${r.builtin ? "View" : "Edit"}</button>${!r.builtin && !inUse(r.id) ? ` <button class="sbtn danger" data-act="ad-ask" data-k="rm-role" data-id="${esc(r.id)}">Delete</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div></div>`;
}

/* ----- agency access requests and posts ----- */
function adRequests() {
  const reqs = AG.requests;
  ensureNames(reqs.map(r => r.id));
  return `<div class="card"><h2>Access requests</h2>
    <p class="small muted">Agency staff ask for publishing access from the Agency portal. Approving links them to the agency; their posts then appear publicly.</p>
    <div class="tablewrap"><table><thead><tr><th>Person</th><th>Agency</th><th>Their note</th><th>Sent</th><th></th></tr></thead><tbody>
    ${reqs.map(r => `<tr><td>${esc(nameOf(r.id))}</td><td><select id="rq-${esc(r.id)}" aria-label="Agency">${agencyOpts(r.request.agency)}</select></td><td class="small">${esc(r.request.note || "")}</td><td class="num small">${esc(fmtDate(r.request.at))}</td>
      <td style="white-space:nowrap"><button class="sbtn primary" data-act="rq-yes" data-id="${esc(r.id)}">Approve</button> <button class="sbtn danger" data-act="rq-no" data-id="${esc(r.id)}">Decline</button></td></tr>`).join("") || `<tr><td colspan="5">No requests waiting.</td></tr>`}
    </tbody></table></div></div>`;
}
function adPosts() {
  const pm = publisherMap();
  const rows = [];
  Object.entries(AG.posts).forEach(([uid, l]) => l.forEach(p => rows.push(Object.assign({}, p, {uid, agency: pm[uid]}))));
  rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  ensureNames(rows.map(r => r.uid));
  return `<div class="card"><h2>Agency posts</h2><p class="small muted">Everything linked agency staff have published. Withdraw a post to remove it from public pages; it stays in this list.</p>
    <div class="tablewrap"><table><thead><tr><th>When</th><th>Agency</th><th>By</th><th>Type</th><th>Details</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map(p => `<tr><td class="num small">${esc(fmtDate(p.at))}</td><td>${esc(p.agency?.n || "")}</td><td>${esc(nameOf(p.uid))}</td><td>${esc((POST_TYPES.find(x => x[0] === p.type) || [0, p.type])[1])}</td><td class="small">${esc(postSummary(p))}</td><td>${p.retracted ? "Withdrawn" : "Live"}</td>
      <td>${p.retracted ? "" : `<button class="sbtn danger" data-act="post-withdraw" data-uid="${esc(p.uid)}" data-id="${esc(p.id)}">Withdraw</button>`}</td></tr>`).join("") || `<tr><td colspan="7">No agency posts yet.</td></tr>`}
    </tbody></table></div></div>`;
}

/* ----- audit log ----- */
const AUDIT = {loaded: false, rows: [], err: false, open: null};
async function loadAudit() {
  try {
    const snap = await DB.api.collection("audit").orderBy("at", "desc").limit(1000).get();
    AUDIT.rows = snap.docs.map(d => Object.assign({}, d.data(), {_id: d.id}));
    AUDIT.err = false;
  } catch (e) { AUDIT.err = true; }
  AUDIT.loaded = true;
  if (UI.mode === "admin" && UI.admin.tab === "audit") render();
}
function auditFiltered() {
  const f = UI.admin.auditF, q = norm(f.q);
  return AUDIT.rows.filter(r => (!f.coll || r.coll === f.coll) && (!f.by || r.by === f.by) && (!q || norm(`${r.act} ${r.coll} ${r.id} ${JSON.stringify(r.after || "")}`).includes(q)));
}
function changedKeys(b, a) {
  if (!b || !a) return "";
  const keys = [...new Set(Object.keys(b).concat(Object.keys(a)))].filter(k => !["updated", "updatedBy", "proposedBy", "proposedFor"].includes(k) && JSON.stringify(b[k]) !== JSON.stringify(a[k]));
  return keys.join(", ");
}
function adAudit() {
  if (!AUDIT.loaded) { loadAudit(); return `<div class="card"><p>Loading the audit log…</p></div>`; }
  if (AUDIT.err) return `<div class="card"><p>The audit log could not be loaded.</p><button class="sbtn" data-act="audit-reload">Try again</button></div>`;
  const f = UI.admin.auditF, rows = auditFiltered();
  const colls = [...new Set(AUDIT.rows.map(r => r.coll))].sort(), people = [...new Set(AUDIT.rows.map(r => r.by).filter(Boolean))];
  ensureNames(people);
  return `<div class="card"><h2>Audit log</h2><p class="small muted">Every change by every editor and administrator: who, when, what, and the record before and after. The latest 1,000 entries are shown.</p>
    <div class="formgrid">
      <label class="field"><span>Section</span><select id="au-coll"><option value="">All sections</option>${colls.map(c => `<option value="${esc(c)}" ${f.coll === c ? "selected" : ""}>${esc(tabLabel(c))}</option>`).join("")}</select></label>
      <label class="field"><span>Person</span><select id="au-by"><option value="">Everyone</option>${people.map(p => `<option value="${esc(p)}" ${f.by === p ? "selected" : ""}>${esc(nameOf(p))}</option>`).join("")}</select></label>
      <label class="field"><span>Search</span><input id="au-q" type="search" value="${esc(f.q)}"></label>
    </div>
    <div class="toolbar"><button class="sbtn" data-act="audit-reload">Refresh</button><button class="sbtn" data-act="audit-export">Download as CSV</button><span class="small muted">${rows.length} entries</span></div>
    <div class="tablewrap"><table><thead><tr><th>When</th><th>Who</th><th>Role</th><th>Action</th><th>Section</th><th>Record</th><th>Fields changed</th><th></th></tr></thead><tbody>
    ${rows.slice(0, 400).map((r, i) => `<tr><td class="num small">${esc(fmtDate(r.at))}</td><td>${esc(r.by ? nameOf(r.by) : "—")}</td><td class="small">${esc(r.role || "")}</td><td>${esc(r.act)}</td><td>${esc(tabLabel(r.coll))}</td><td class="small">${esc(r.id)}</td><td class="small">${esc(changedKeys(r.before, r.after))}</td>
      <td style="white-space:nowrap"><button class="sbtn" data-act="audit-open" data-i="${i}">Details</button>${canUndo(r) ? ` <button class="sbtn" data-act="audit-undo" data-i="${i}">Undo</button>` : ""}</td></tr>
      ${AUDIT.open === i ? `<tr><td colspan="8"><div class="grid2"><div><b>Before</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(r.before, null, 1))}</pre></div><div><b>After</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(r.after, null, 1))}</pre></div></div></td></tr>` : ""}`).join("") || `<tr><td colspan="8">No entries match.</td></tr>`}
    </tbody></table></div></div>`;
}
/* undo is offered only for whole-record changes made through the editor */
function canUndo(r) { return !!SCHEMA[r.coll] && canWrite(r.coll) && /^(undid )?(approved )?(added|edited|deleted)$/.test(r.act) && (r.before || r.after) && ID_RE.test(r.id); }
function auditCsv(rows) {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["when", "who_id", "who", "role", "action", "section", "record", "fields_changed", "before", "after"];
  return [head.join(",")].concat(rows.map(r => [r.at, r.by, r.by ? nameOf(r.by) : "", r.role, r.act, r.coll, r.id, changedKeys(r.before, r.after), JSON.stringify(r.before), JSON.stringify(r.after)].map(cell).join(","))).join("\n");
}
async function saveFile(filename, text, type) {
  if (!DB.downloads) { toast("Downloads aren't available in this view."); return; }
  try { const r = await DB.downloads.save({filename, data: new Blob([text], {type})}); if (r?.status === "saved") toast("Saved " + filename); }
  catch (e) { if (e?.code !== "cancelled" && e?.code !== "declined") toast("The file could not be saved. Try again."); }
}

/* ----- admin actions ----- */
const NEW_DEFAULTS = () => ({
  alerts: {level: "warning", c: "GH", issued: new Date().toISOString(), expires: new Date(Date.now() + 864e5).toISOString(), areas: [], agency: ""},
  forecasts: {zone: "acc", at: new Date().toISOString()},
  hotspots: {c: "GH", r: "GH-AA", d: ["rain"], z: "acc", t: 70, sev: 2, exp: 2, vul: .5, ll: [-0.2, 5.6], aka: []},
  events: {c: "GH", year: NOW.getFullYear(), ids: []}, regionEvents: {r: "GH-AA", year: NOW.getFullYear()},
  safe: {c: "GH", ll: [-0.2, 5.6]}, roads: {c: "GH", ll: [-0.2, 5.6]}, feeds: {status: "off", c: "GH"}, contacts: {c: "GH"},
  dams: {c: "GH", status: "season", season: Array(12).fill(0), ll: [0, 8]}, agencies: {c: "GH", kind: "disaster", status: "active", publishers: [], push: true},
  notifications: {level: "warning", c: AUTH.agency()?.c || "GH", agency: noticeSenders()[0]?.[0], areas: [], at: new Date().toISOString(), expires: new Date(Date.now() + 864e5).toISOString()}
});
async function adminAct(act, el) {
  const a = UI.admin;
  try {
    switch (act) {
      case "ad-tab": a.tab = el.dataset.k; a.edit = null; a.q = ""; a.confirm = null; if (a.tab === "audit") AUDIT.loaded = false; return render();
      case "ad-new": {
        const k = el.dataset.k; a.tab = k; a.confirm = null;
        const prefix = {alerts: "alert", events: "ev", agencies: "ag", notifications: "nt"}[k] || k.slice(0, 4);
        a.edit = {coll: k, isNew: true, rec: Object.assign({id: k === "forecasts" ? "" : `${prefix}-${Date.now().toString(36)}`}, NEW_DEFAULTS()[k] || {})};
        return render();
      }
      case "ad-edit": a.edit = {coll: el.dataset.k, isNew: false, rec: clone(data(el.dataset.k).find(r => r.id === el.dataset.id) || {})}; a.confirm = null; return render();
      case "ad-cancel": a.edit = null; a.confirm = null; return render();
      case "ad-ask": {
        const k = el.dataset.k;
        a.confirm = {
          del: {k, coll: el.dataset.coll, id: el.dataset.id, msg: `Delete “${el.dataset.id}”? You can undo this from the audit log.`, yes: "Delete"},
          reset: {k, msg: "Replace ALL data with the starting data? Download a backup first if you need your edits.", yes: "Reset everything"},
          "model-reset": {k, msg: "Restore the default model weights, levels and rain tables?", yes: "Restore defaults"},
          "rm-member": {k, id: el.dataset.id, msg: "Remove this person's Open Tracker role? They keep their Share-menu access until you change it there.", yes: "Remove"},
          "rm-role": {k, id: el.dataset.id, msg: "Delete this role?", yes: "Delete role"},
          "rm-replay": {k, id: el.dataset.id, msg: "Delete this replay and all its map layers?", yes: "Delete replay"},
          "an-prune": {k, msg: "Delete every visit recorded more than 90 days ago?", yes: "Delete old visits"},
          "an-clear": {k, msg: "Delete ALL analytics? Visit counts start again from zero.", yes: "Delete all analytics"}
        }[k];
        return render();
      }
      case "ad-no": a.confirm = null; return render();
      case "ad-yes": {
        const c = a.confirm; a.confirm = null;
        if (c.k === "del") { await REPO.del(c.coll, c.id); a.edit = null; if (!APPROVAL.gate()) toast("Deleted."); }
        if (c.k === "reset") await REPO.writeAll(REPO.snapshot(true), "Reset to starting data");
        if (c.k === "import") await REPO.writeAll(c.payload, "Restore from backup");
        if (c.k === "model-reset") { await REPO.setSettings(clone(DEFAULT_SETTINGS), "restored defaults"); toast("Default settings restored."); }
        if (c.k === "rm-member") { await REPO.removeMember(c.id); toast("Removed."); }
        if (c.k === "rm-role") { await REPO.del("roles", c.id); toast("Role deleted."); }
        if (c.k === "rm-replay") { await deleteReplay(c.id); toast("Replay deleted."); }
        if (c.k === "an-prune" || c.k === "an-clear") await anHousekeep(c.k === "an-clear");
        return render();
      }
      case "ad-seed": await REPO.seed(); return render();
      case "ad-export": return saveFile(`opentracker-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(REPO.snapshot(false), null, 2), "application/json");
      case "pp-add": {
        const pp = a.people;
        if (AGENCY_ROLES.includes(pp.role) && !pp.agency) { toast("Choose the agency this person works for."); return; }
        await REPO.setMember(el.dataset.id, {role: pp.role, agency: pp.agency || null, active: true});
        pp.q = ""; pp.hits = []; toast("Person added."); return render();
      }
      case "role-new": a.edit = {coll: "roles", isNew: true, rec: {id: "role-" + Date.now().toString(36), n: "", perms: []}}; return render();
      case "role-edit": a.edit = {coll: "roles", isNew: false, rec: clone(roles().find(r => r.id === el.dataset.id) || {})}; return render();
      case "rq-yes": { const ag = $("#rq-" + CSS.escape(el.dataset.id))?.value; if (!ag) { toast("Choose an agency first."); return; } await REPO.decideRequest(el.dataset.id, true, ag); toast("Approved."); return render(); }
      case "rq-no": await REPO.decideRequest(el.dataset.id, false, null); toast("Declined."); return render();
      case "post-withdraw": await REPO.withdrawPost(el.dataset.uid, el.dataset.id); toast("Withdrawn."); return render();
      case "audit-reload": AUDIT.loaded = false; return render();
      case "audit-open": AUDIT.open = AUDIT.open === +el.dataset.i ? null : +el.dataset.i; return render();
      case "audit-export": return saveFile(`opentracker-audit-${new Date().toISOString().slice(0, 10)}.csv`, auditCsv(auditFiltered()), "text/csv");
      case "audit-undo": {
        const r = auditFiltered()[+el.dataset.i]; if (!r) return;
        REPO.require(canUndo(r), "undo this change");
        if (r.before) { const b = clone(r.before); delete b.id; await DB.api.collection(r.coll).doc(r.id).set(b); }
        else await DB.api.collection(r.coll).doc(r.id).delete();
        await REPO.audit("undid " + r.act, r.coll, r.id, r.after, r.before);
        toast("Change undone."); AUDIT.loaded = false; return render();
      }
    }
  } catch (e) { toast(errText(e)); }
}
async function adminSubmit(form) {
  const err = form.querySelector("#ad-err");
  try {
    if (form.id === "ad-model") { await REPO.setSettings(readModel(form)); toast("Model settings saved."); return; }
    if (form.id === "ad-role") {
      const rec = UI.admin.edit.rec;
      const n = form.querySelector("#r-n").value.trim();
      if (!n) throw new Error("Give the role a name.");
      if (roles().some(r => r.id !== rec.id && r.n.toLowerCase() === n.toLowerCase())) throw new Error("A role with that name already exists.");
      const perms = [...form.querySelectorAll("[data-perm]")].filter(x => x.checked).map(x => x.dataset.perm).filter(p => PERM_KEYS.includes(p));
      if (!perms.length) throw new Error("Choose at least one permission.");
      await REPO.set("roles", {id: rec.id, n: n.slice(0, 60), perms});
      UI.admin.edit = null; toast("Role saved."); return render();
    }
    const coll = form.dataset.coll;
    await REPO.set(coll, readForm(coll, form));
    UI.admin.edit = null; if (!APPROVAL.gate()) toast("Saved."); render();
  } catch (e) { if (err) err.textContent = errText(e); else toast(errText(e)); }
}
async function memberChange(el) {
  try {
    const uid = el.dataset.member, f = el.dataset.f, m = data("members").find(x => x.id === uid) || {};
    const patch = f === "active" ? {active: el.checked} : {[f]: el.value};
    if (f === "agency") patch.agency = el.value || null;
    if (f === "role" && AGENCY_ROLES.includes(el.value) && !m.agency) toast("Now choose the agency for this person.");
    await REPO.setMember(uid, patch);
    toast("Access updated.");
  } catch (e) { toast(errText(e)); render(); }
}
async function adminImport(file) {
  try {
    if (file.size > 15e6) throw new Error();
    const o = JSON.parse(await file.text());
    if (!o || !BACKUP_IDS.includes(o.app) || !COLLS.every(k => o[k] === undefined || Array.isArray(o[k]))) throw new Error();
    UI.admin.confirm = {k: "import", payload: o, msg: `Replace all data with “${file.name}” (saved ${fmtDate(o.exported)})? Current data will be overwritten.`, yes: "Replace all data"};
    render();
  } catch (e) { toast("That file isn't an Open Tracker backup."); }
}
