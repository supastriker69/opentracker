/* ===== Admin: editors can add, correct, replace and delete every record ===== */
import {adApprovals, APPROVAL, myChangesHtml} from "../core/approval.js";
import {AGENCY_ROLES, AUTH, PERM_KEYS, roles} from "../core/auth.js";
import {$, clone, COLLS, data, DB, DEFAULT_SETTINGS, esc, fmtDate, ICON, NOW, toast, UI} from "../core/core.js";
import {BACKUP_IDS, errText, REPO} from "../core/repo.js";
import {AG, publisherMap} from "../features/agency.js";
import {adAnalytics, anHousekeep} from "../features/analytics.js";
import {adContributions} from "../features/contribute.js";
import {hazardsDoc, hazardsUpdated, importSnapshot} from "../features/hazards.js";
import {adReplays, deleteReplay} from "../features/replay.js";
import {adAudit, AUDIT, auditCsv, auditFiltered, canUndo, saveFile} from "./admin/audit.js";
import {adModel, readModel} from "./admin/model.js";
import {adPeople, adPosts, adRequests, adRoles} from "./admin/people.js";
import {adCollection, readForm} from "./admin/records.js";
import {noticeSenders, tabLabel, TABS} from "./admin/schema.js";
import {render} from "./main.js";

export function viewAdmin() {
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
export function confirmBox() {
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
export async function liveImport(file) {
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
export async function adminAct(act, el) {
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
export async function adminSubmit(form) {
  const err = form.querySelector("#ad-err");
  try {
    if (form.id === "ad-model") { await REPO.setSettings(readModel(form)); toast("Model settings saved."); return render(); }
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
export async function memberChange(el) {
  try {
    const uid = el.dataset.member, f = el.dataset.f, m = data("members").find(x => x.id === uid) || {};
    const patch = f === "active" ? {active: el.checked} : {[f]: el.value};
    if (f === "agency") patch.agency = el.value || null;
    if (f === "role" && AGENCY_ROLES.includes(el.value) && !m.agency) toast("Now choose the agency for this person.");
    await REPO.setMember(uid, patch);
    toast("Access updated.");
  } catch (e) { toast(errText(e)); render(); }
}
export async function adminImport(file) {
  try {
    if (file.size > 15e6) throw new Error();
    const o = JSON.parse(await file.text());
    if (!o || !BACKUP_IDS.includes(o.app) || !COLLS.every(k => o[k] === undefined || Array.isArray(o[k]))) throw new Error();
    UI.admin.confirm = {k: "import", payload: o, msg: `Replace all data with “${file.name}” (saved ${fmtDate(o.exported)})? Current data will be overwritten.`, yes: "Replace all data"};
    render();
  } catch (e) { toast("That file isn't an Open Tracker backup."); }
}
