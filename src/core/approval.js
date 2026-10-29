/* ===== Approval of agency changes =====
   When approval is on (the default), nothing an agency submits goes live until an administrator approves it:
   - agency posts (warnings, forecasts, dam status, readings, phone notifications) wait for a decision stored in
     "approvals", a collection only administrators can write. The decision is tied to a fingerprint of the post,
     so if the agency edits a post after approval it goes back to waiting.
   - data edits by agency-linked editors become change requests in "changes"; approving one applies it.
   Administrators can turn approval off for everyone, or mark single agencies as trusted. */
const APPROVAL = {
  /* settings.approval = {on: boolean, agencies: {<agency id>: "auto" | "review"}} */
  needed(agencyId) {
    const ap = settings().approval || {};
    if (ap.on === false) return false;
    return (ap.agencies || {})[agencyId] !== "auto";
  },
  /* the agency the current editor acts for, if their edits must be approved */
  gate() {
    const a = AUTH.agency();
    if (!a || AUTH.isOwner || AUTH.can("approvals.manage") || AUTH.can("users.manage")) return null;
    return APPROVAL.needed(a.id) ? a : null;
  },

  /* ----- posts ----- */
  fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); },
  postKey(uid, postId) { return "p" + APPROVAL.fnv(uid + "/" + postId) + APPROVAL.fnv(postId + "#" + uid); },
  fingerprint(p) {
    const f = ["type", "level", "areas", "msg", "expires", "push", "zone", "mm24", "mm72", "dam", "status", "notice", "station", "kind", "value", "ll"];
    return APPROVAL.fnv(JSON.stringify(f.map(k => p[k] === undefined ? null : p[k])));
  },
  /* "live" | "pending" | "rejected" for a raw agency post */
  postStatus(p, uid, agency) {
    if (!APPROVAL.needed(agency.id)) return "live";
    const d = data("approvals").find(x => x.id === APPROVAL.postKey(uid, p.id));
    if (!d || d.fp !== APPROVAL.fingerprint(p)) return "pending";
    return d.ok ? "live" : "rejected";
  },
  pendingPosts() {
    const pm = publisherMap(), out = [];
    Object.entries(AG.posts).forEach(([uid, l]) => { const a = pm[uid]; if (a) l.forEach(p => { if (!p.retracted && APPROVAL.postStatus(p, uid, a) === "pending") out.push(Object.assign({}, p, {uid, agency: a})); }); });
    return out.sort((x, y) => String(x.at).localeCompare(String(y.at)));
  },
  async decidePost(uid, postId, ok) {
    REPO.require(AUTH.can("approvals.manage"), "approve agency posts");
    const p = (AG.posts[uid] || []).find(x => x.id === postId);
    if (!p) throw new AccessError("That post is no longer available.");
    const id = APPROVAL.postKey(uid, postId);
    await DB.api.collection("approvals").doc(id).set({uid, post: postId, fp: APPROVAL.fingerprint(p), ok: !!ok, at: new Date().toISOString(), by: DB.uid || null});
    await REPO.audit(ok ? "approved agency post" : "rejected agency post", "agencyPosts", uid + "/" + postId, null, {agency: publisherMap()[uid]?.n || "", summary: postSummary(p)});
  },

  /* ----- data change requests ----- */
  async propose(op, coll, rec, agency) {
    const rid = op === "delete" ? rec : rec.id;
    const before = data(coll).find(r => r.id === rid) || null;
    const body = {op, coll, rid, rec: op === "delete" ? null : clone(rec), before, agency: agency.id, by: DB.uid || null, at: new Date().toISOString(), status: "pending"};
    const ref = DB.api.collection("changes").doc();
    await ref.set(body);
    await REPO.audit("proposed " + (op === "delete" ? "deletion" : before ? "edit" : "addition"), coll, rid, before, body.rec);
    toast("Sent to an administrator for approval.");
  },
  pendingChanges() { return data("changes").filter(c => c.status === "pending").sort((a, b) => String(a.at).localeCompare(String(b.at))); },
  async decideChange(id, ok, note) {
    REPO.require(AUTH.can("approvals.manage"), "approve agency changes");
    const ch = data("changes").find(c => c.id === id);
    if (!ch || ch.status !== "pending") throw new AccessError("That request has already been decided.");
    if (ok) {
      if (!SCHEMA[ch.coll]) throw new AccessError("That section can't be changed this way.");
      if (ch.op === "delete") await REPO.del(ch.coll, ch.rid, {approvedFrom: ch});
      else {
        const rec = Object.assign(clone(ch.rec), {id: ch.rid});
        if (ch.coll === "notifications") rec.at = new Date().toISOString();   /* a notification goes out when it is approved */
        await REPO.set(ch.coll, rec, {approvedFrom: ch});
      }
    }
    const body = Object.assign({}, ch, {status: ok ? "approved" : "rejected", note: String(note || "").slice(0, 300), decidedBy: DB.uid || null, decidedAt: new Date().toISOString()});
    delete body.id;
    await DB.api.collection("changes").doc(id).set(body);
    if (!ok) await REPO.audit("rejected change", ch.coll, ch.rid, null, {agency: ch.agency, note: body.note});
  },
  async setPolicy(next) {
    REPO.require(AUTH.can("approvals.manage"), "change approval settings");
    const before = settings().approval || null;
    const body = Object.assign({}, DB.cfg || {}, {approval: next, updated: new Date().toISOString(), updatedBy: DB.uid || null});
    await DB.api.doc("config/settings").set(body);
    await REPO.audit("changed approval settings", "settings", "approval", before, next);
  }
};

/* ---------- admin: Approvals tab ---------- */
function adApprovals() {
  const ap = settings().approval || {on: true, agencies: {}};
  const posts = APPROVAL.pendingPosts(), changes = APPROVAL.pendingChanges();
  ensureNames(posts.map(p => p.uid).concat(changes.map(c => c.by)));
  const agName = id => agencies().find(a => a.id === id)?.n || id;
  return `
  <div class="card"><h2>Approval settings</h2>
    <label class="switch"><input type="checkbox" id="ap-on" ${ap.on !== false ? "checked" : ""}> <span><b>Agency changes need approval</b><br><span class="small muted">When on, posts, notifications and data changes from agencies wait here until an administrator approves them. When off, agencies publish directly.</span></span></label>
    ${ap.on !== false ? `<details class="howto"><summary><b>Trusted agencies</b> (publish without approval)</summary>
      <div class="tablewrap"><table><thead><tr><th>Agency</th><th>Their changes</th></tr></thead><tbody>
      ${agencies().map(a => `<tr><td>${esc(a.n)}</td><td><select data-ap-agency="${esc(a.id)}" aria-label="Approval for ${esc(a.n)}"><option value="review" ${(ap.agencies || {})[a.id] !== "auto" ? "selected" : ""}>Need approval</option><option value="auto" ${(ap.agencies || {})[a.id] === "auto" ? "selected" : ""}>Go live at once</option></select></td></tr>`).join("")}
      </tbody></table></div></details>` : ""}
  </div>
  <div class="card"><h2>Agency posts waiting (${posts.length})</h2>
    <p class="small muted">Warnings, phone notifications, rain forecasts, dam status and readings sent from the Agency portal.</p>
    <div class="tablewrap"><table><thead><tr><th>Sent</th><th>Agency</th><th>By</th><th>Type</th><th>Details</th><th></th></tr></thead><tbody>
    ${posts.map(p => `<tr><td class="num small">${esc(fmtDate(p.at))}</td><td>${esc(p.agency.n)}</td><td>${esc(nameOf(p.uid))}</td><td>${esc((POST_TYPES.find(x => x[0] === p.type) || [0, p.type])[1])}${p.push ? " + phone alert" : ""}</td><td class="small">${esc(postSummary(p))}</td>
      <td style="white-space:nowrap"><button class="sbtn primary" data-act="ap-post" data-ok="1" data-uid="${esc(p.uid)}" data-id="${esc(p.id)}">Approve</button> <button class="sbtn danger" data-act="ap-post" data-ok="0" data-uid="${esc(p.uid)}" data-id="${esc(p.id)}">Reject</button></td></tr>`).join("") || `<tr><td colspan="6">Nothing waiting.</td></tr>`}
    </tbody></table></div></div>
  <div class="card"><h2>Data changes waiting (${changes.length})</h2>
    <p class="small muted">Additions, corrections and deletions made by agency editors, including public notifications.</p>
    <div class="stack">${changes.map(c => {
      const cur = data(c.coll).find(r => r.id === c.rid) || null;
      const moved = JSON.stringify(cur) !== JSON.stringify(c.before);
      return `<div class="notice-card"><div class="nc-head"><b>${esc(c.op === "delete" ? "Delete" : c.before ? "Change" : "Add")} · ${esc(tabLabel(c.coll))} · ${esc(c.rid)}</b><span class="small">${esc(fmtDate(c.at))}</span></div>
        <p class="small">From <b>${esc(agName(c.agency))}</b> (${esc(nameOf(c.by))})${c.op !== "delete" && c.before ? " · Fields: " + esc(changedKeys(c.before, c.rec) || "none") : ""}</p>
        ${moved ? `<p class="small" style="color:var(--high)">This record has changed since the request was made. Check before approving.</p>` : ""}
        <details><summary class="small">Show before and after</summary><div class="grid2"><div><b>Before</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(c.before, null, 1))}</pre></div><div><b>After</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(c.rec, null, 1))}</pre></div></div></details>
        <div class="toolbar"><input id="ap-note-${esc(c.id)}" placeholder="Note to the agency (optional)" maxlength="300" aria-label="Note"><button class="sbtn primary" data-act="ap-change" data-ok="1" data-id="${esc(c.id)}">Approve</button><button class="sbtn danger" data-act="ap-change" data-ok="0" data-id="${esc(c.id)}">Reject</button></div></div>`;
    }).join("") || `<p>Nothing waiting.</p>`}</div></div>`;
}
/* agency editors see what they sent and what happened to it */
function myChangesHtml() {
  const mine = data("changes").filter(c => c.by === DB.uid).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 20);
  if (!APPROVAL.gate() && !mine.length) return "";
  return `<div class="card"><h2>Your changes</h2>${APPROVAL.gate() ? `<p class="small muted">Your changes go live after an administrator approves them.</p>` : ""}
    <div class="tablewrap"><table><thead><tr><th>Sent</th><th>Section</th><th>Record</th><th>Change</th><th>Status</th></tr></thead><tbody>
    ${mine.map(c => `<tr><td class="num small">${esc(fmtDate(c.at))}</td><td>${esc(tabLabel(c.coll))}</td><td class="small">${esc(c.rid)}</td><td>${c.op === "delete" ? "Delete" : c.before ? "Change" : "Add"}</td><td>${{pending: "Waiting for approval", approved: "Approved", rejected: "Not approved"}[c.status] || esc(c.status)}${c.note ? `<br><span class="small muted">${esc(c.note)}</span>` : ""}</td></tr>`).join("") || `<tr><td colspan="5">Nothing sent yet.</td></tr>`}
    </tbody></table></div></div>`;
}
async function approvalAct(act, el) {
  try {
    if (act === "ap-post") { await APPROVAL.decidePost(el.dataset.uid, el.dataset.id, el.dataset.ok === "1"); toast(el.dataset.ok === "1" ? "Approved. It is live now." : "Rejected."); }
    if (act === "ap-change") { await APPROVAL.decideChange(el.dataset.id, el.dataset.ok === "1", $("#ap-note-" + CSS.escape(el.dataset.id))?.value); toast(el.dataset.ok === "1" ? "Approved and applied." : "Rejected."); }
    render();
  } catch (e) { toast(errText(e)); }
}
async function approvalChange(el) {
  try {
    const ap = clone(settings().approval || {on: true, agencies: {}});
    ap.agencies = ap.agencies || {};
    if (el.id === "ap-on") ap.on = el.checked;
    if (el.dataset.apAgency) ap.agencies[el.dataset.apAgency] = el.value;
    await APPROVAL.setPolicy(ap);
    toast("Approval settings saved.");
  } catch (e) { toast(errText(e)); render(); }
}
