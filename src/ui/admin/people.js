/* ===== Admin: people and their roles, the roles themselves, agency access requests and agency posts ===== */
/* names are resolved at render time and never stored */
import {agencies, PERMS, roles} from "../../core/auth.js";
import {$, data, DB, esc, fmtDate, UI} from "../../core/core.js";
import {AG, POST_TYPES, postSummary, publisherMap} from "../../features/agency.js";
import {render} from "../main.js";
import {confirmBox} from "../views-admin.js";

const NAMES = {map: {}, pending: false};
export function nameOf(uid) { return uid === DB.uid ? "You" : NAMES.map[uid] || "Unnamed person"; }
export async function ensureNames(ids) {
  const miss = [...new Set(ids.filter(id => id && !(id in NAMES.map)))];
  if (!miss.length || !DB.user || NAMES.pending) return;
  NAMES.pending = true;
  try { const ps = await DB.user.profiles(miss); miss.forEach(id => NAMES.map[id] = ps[id]?.name || ""); } catch (e) { miss.forEach(id => NAMES.map[id] = ""); }
  NAMES.pending = false;
  if (UI.mode === "admin") render();
}
function roleOpts(sel) { return roles().map(r => `<option value="${esc(r.id)}" ${r.id === sel ? "selected" : ""}>${esc(r.n)}</option>`).join(""); }
function agencyOpts(sel) { return `<option value="">—</option>` + agencies().map(a => `<option value="${esc(a.id)}" ${a.id === sel ? "selected" : ""}>${esc(a.n)}</option>`).join(""); }
export function adPeople() {
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
    <div class="tablewrap"><table><thead><tr><th>Person</th><th>Role</th><th>Agency</th><th>Active</th><th>Added</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
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
export async function peopleSearch(q) {
  const pp = UI.admin.people; pp.q = q;
  const seq = ++peopleSeq;
  let hits = [];
  try { hits = DB.user && q.trim() ? await DB.user.search(q) : []; } catch (e) {}
  if (seq !== peopleSeq) return;
  pp.hits = hits.slice(0, 8);
  hits.forEach(h => NAMES.map[h.id] = h.name || "");
  const box = $("#pp-hits"); if (box) box.innerHTML = peopleHits();
}
export function adRoles() {
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
    <div class="tablewrap"><table><thead><tr><th>Role</th><th>Permissions</th><th class="n">People</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
    ${roles().map(r => `<tr><td><b>${esc(r.n)}</b> ${r.builtin ? `<span class="badge">Built-in</span>` : ""}</td><td class="small">${esc((r.perms || []).map(p => PERMS.find(x => x[0] === p)?.[1] || p).join("; "))}</td><td class="n">${inUse(r.id)}</td>
      <td style="white-space:nowrap"><button class="sbtn" data-act="role-edit" data-id="${esc(r.id)}">${r.builtin ? "View" : "Edit"}</button>${!r.builtin && !inUse(r.id) ? ` <button class="sbtn danger" data-act="ad-ask" data-k="rm-role" data-id="${esc(r.id)}">Delete</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div></div>`;
}
export function adRequests() {
  const reqs = AG.requests;
  ensureNames(reqs.map(r => r.id));
  return `<div class="card"><h2>Access requests</h2>
    <p class="small muted">Agency staff ask for publishing access from the Agency portal. Approving links them to the agency; their posts then appear publicly.</p>
    <div class="tablewrap"><table><thead><tr><th>Person</th><th>Agency</th><th>Their note</th><th>Sent</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
    ${reqs.map(r => `<tr><td>${esc(nameOf(r.id))}</td><td><select id="rq-${esc(r.id)}" aria-label="Agency">${agencyOpts(r.request.agency)}</select></td><td class="small">${esc(r.request.note || "")}</td><td class="num small">${esc(fmtDate(r.request.at))}</td>
      <td style="white-space:nowrap"><button class="sbtn primary" data-act="rq-yes" data-id="${esc(r.id)}">Approve</button> <button class="sbtn danger" data-act="rq-no" data-id="${esc(r.id)}">Decline</button></td></tr>`).join("") || `<tr><td colspan="5">No requests waiting.</td></tr>`}
    </tbody></table></div></div>`;
}
export function adPosts() {
  const pm = publisherMap();
  const rows = [];
  Object.entries(AG.posts).forEach(([uid, l]) => l.forEach(p => rows.push(Object.assign({}, p, {uid, agency: pm[uid]}))));
  rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  ensureNames(rows.map(r => r.uid));
  return `<div class="card"><h2>Agency posts</h2><p class="small muted">Everything linked agency staff have published. Withdraw a post to remove it from public pages; it stays in this list.</p>
    <div class="tablewrap"><table><thead><tr><th>When</th><th>Agency</th><th>By</th><th>Type</th><th>Details</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
    ${rows.map(p => `<tr><td class="num small">${esc(fmtDate(p.at))}</td><td>${esc(p.agency?.n || "")}</td><td>${esc(nameOf(p.uid))}</td><td>${esc((POST_TYPES.find(x => x[0] === p.type) || [0, p.type])[1])}</td><td class="small">${esc(postSummary(p))}</td><td>${p.retracted ? "Withdrawn" : "Live"}</td>
      <td>${p.retracted ? "" : `<button class="sbtn danger" data-act="post-withdraw" data-uid="${esc(p.uid)}" data-id="${esc(p.id)}">Withdraw</button>`}</td></tr>`).join("") || `<tr><td colspan="7">No agency posts yet.</td></tr>`}
    </tbody></table></div></div>`;
}
