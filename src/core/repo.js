/* ===== Repository: every write goes through here, is permission-checked, and is audit-logged =====
   Audit entries are one document each in "audit" (readable and writable by Editors only, by database rule),
   so concurrent editors never overwrite each other's log lines. */
class AccessError extends Error {}
const BACKUP_IDS = ["OpenTracker", "FloodTrack"];   /* backups from before the rename still restore */
const REPO = {
  require(ok, what) { if (!DB.api) throw new AccessError("The shared database isn't available here."); if (!ok) throw new AccessError(`Your role doesn't allow you to ${what}.`); },

  async audit(act, coll, id, before, after) {
    const entry = {at: new Date().toISOString(), by: DB.uid || null, role: AUTH.label() || null, act, coll, id: String(id ?? ""), before: before ?? null, after: after ?? null};
    try { await DB.api.collection("audit").doc().set(entry); } catch (e) { /* the change itself stands; the log is best effort */ }
  },

  /* opts.approvedFrom: the change request an administrator is approving */
  async set(coll, rec, opts = {}) {
    REPO.require(canWrite(coll), "change " + coll);
    const gate = opts.approvedFrom ? null : APPROVAL.gate();
    if (gate) return APPROVAL.propose("set", coll, rec, gate);
    const before = data(coll).find(r => r.id === rec.id) || null;
    const body = clone(rec); delete body.id;
    body.updated = new Date().toISOString(); body.updatedBy = DB.uid || null;
    if (opts.approvedFrom) { body.proposedBy = opts.approvedFrom.by || null; body.proposedFor = opts.approvedFrom.agency || null; }
    await DB.api.collection(coll).doc(rec.id).set(body);
    await REPO.audit((opts.approvedFrom ? "approved " : "") + (before ? "edited" : "added"), coll, rec.id, before, Object.assign({id: rec.id}, body));
  },

  async del(coll, id, opts = {}) {
    REPO.require(canDelete(coll), "delete from " + coll);
    const gate = opts.approvedFrom ? null : APPROVAL.gate();
    if (gate) return APPROVAL.propose("delete", coll, id, gate);
    const before = data(coll).find(r => r.id === id) || null;
    await DB.api.collection(coll).doc(id).delete();
    await REPO.audit((opts.approvedFrom ? "approved " : "") + "deleted", coll, id, before, null);
  },

  async setSettings(next, act) {
    REPO.require(AUTH.can("model.manage"), "change model settings");
    const before = DB.cfg || null;
    const body = Object.assign({}, DB.cfg || {}, next, {seeded: true, updated: new Date().toISOString(), updatedBy: DB.uid || null});
    await DB.api.doc("config/settings").set(body);
    await REPO.audit(act || "edited", "settings", "settings", before, body);
  },

  /* ----- people and agencies ----- */
  async setMember(uid, patch) {
    REPO.require(AUTH.can("users.manage") || (patch.role === "agency-publisher" && AUTH.can("agencies.manage")), "manage people");
    if (uid === DB.uid && !AUTH.isOwner && patch.role && patch.role !== AUTH.role()?.id) throw new AccessError("You can't change your own role. Ask another administrator.");
    const before = data("members").find(m => m.id === uid) || null;
    const body = Object.assign({}, before ? clone(before) : {addedBy: DB.uid || null, addedAt: new Date().toISOString(), active: true}, patch);
    delete body.id;
    await DB.api.collection("members").doc(uid).set(body);
    await REPO.audit(before ? "changed access" : "added person", "members", uid, before, Object.assign({id: uid}, body));
    await REPO.syncPublisher(uid, body.active !== false && body.agency ? body.agency : null);
  },
  async removeMember(uid) {
    REPO.require(AUTH.can("users.manage"), "remove people");
    if (uid === DB.uid) throw new AccessError("You can't remove yourself.");
    const before = data("members").find(m => m.id === uid) || null;
    await DB.api.collection("members").doc(uid).delete();
    await REPO.audit("removed person", "members", uid, before, null);
    await REPO.syncPublisher(uid, null);
  },
  /* keep agencies.publishers in step with members: a person publishes for at most one agency */
  async syncPublisher(uid, agencyId) {
    for (const a of agencies()) {
      const has = (a.publishers || []).includes(uid), want = a.id === agencyId;
      if (has === want) continue;
      const body = clone(a); delete body.id;
      body.publishers = want ? [...(a.publishers || []), uid] : (a.publishers || []).filter(x => x !== uid);
      await DB.api.collection("agencies").doc(a.id).set(body);
      await REPO.audit(want ? "linked publisher" : "unlinked publisher", "agencies", a.id, {publisher: uid}, {publisher: want ? uid : null});
    }
  },
  async decideRequest(uid, approve, agencyId) {
    REPO.require(AUTH.can("agencies.manage"), "review agency requests");
    if (approve) await REPO.setMember(uid, {role: "agency-publisher", agency: agencyId, active: true});
    await DB.api.doc(`agencyData/${uid}`).set({decision: {approved: !!approve, agency: agencyId || null, at: new Date().toISOString(), by: DB.uid || null}});
    await REPO.audit(approve ? "approved request" : "declined request", "requests", uid, null, {agency: agencyId || null});
  },
  async withdrawPost(uid, postId) {
    REPO.require(AUTH.can("agencies.manage") || AUTH.can("warnings.manage"), "withdraw agency posts");
    await DB.api.doc(`agencyData/${uid}/posts/${postId}`).update({retracted: true, retractedAt: new Date().toISOString(), retractedBy: DB.uid || null});
    await REPO.audit("withdrew agency post", "agencyPosts", uid + "/" + postId, null, null);
  },

  /* ----- whole-database operations ----- */
  snapshot(fromBuilt) {
    const o = {app: "OpenTracker", version: 3, exported: new Date().toISOString(), settings: fromBuilt ? clone(DEFAULT_SETTINGS) : settings()};
    COLLS.forEach(k => o[k] = clone(fromBuilt ? BUILT[k] : data(k)));
    if (!fromBuilt && !AUTH.can("users.manage")) delete o.members;
    return o;
  },
  async writeAll(src, label) {
    REPO.require(AUTH.can("backup.manage"), "replace all data");
    toast(label + "…");
    let n = 0;
    for (const coll of COLLS) {
      if (!Array.isArray(src[coll])) continue;                 /* a backup without a section leaves that section alone */
      if (coll === "members" && !src.members.some(m => m.id === DB.uid) && !AUTH.isOwner) continue;  /* never lock yourself out */
      const want = src[coll].filter(r => r && typeof r.id === "string" && /^[A-Za-z0-9_\-:.@+~]{1,190}$/.test(r.id));
      const ids = new Set(want.map(r => r.id));
      const existing = DB.cfg ? (DB.cols[coll] || []) : [];
      for (const r of existing) if (!ids.has(r.id)) { await DB.api.collection(coll).doc(r.id).delete(); n++; }
      for (const r of want) { const b = clone(r); delete b.id; await DB.api.collection(coll).doc(r.id).set(b); n++; }
    }
    const cfg = Object.assign(clone(DEFAULT_SETTINGS), src.settings || {}, {seeded: true, updated: new Date().toISOString(), updatedBy: DB.uid || null});
    await DB.api.doc("config/settings").set(cfg);
    await REPO.audit(label, "all data", "-", null, {records: n});
    toast(label + " done.");
  },
  /* first set-up: the owner copies the built-in data into the database */
  async seed() {
    if (!(AUTH.isOwner || AUTH.can("backup.manage"))) throw new AccessError("Only the owner or an administrator can set up the database.");
    const src = REPO.snapshot(true);
    toast("Setting up the database…");
    for (const coll of COLLS) for (const r of src[coll]) { const b = clone(r); delete b.id; await DB.api.collection(coll).doc(r.id).set(b); }
    await DB.api.doc("config/settings").set(Object.assign(clone(DEFAULT_SETTINGS), {seeded: true, updated: new Date().toISOString(), updatedBy: DB.uid || null}));
    await REPO.audit("set up database", "all data", "-", null, null);
    toast("Database ready.");
  }
};
function errText(e) {
  if (e instanceof AccessError) return e.message;
  if (e?.code === "invalid_argument") return "Your sharing access doesn't allow this change. Ask the owner to give you Editor access in the Share menu.";
  if (e?.code === "quota_exceeded") return "The database is full. Delete old records, then try again.";
  if (e?.message && !e.code) return e.message;
  return "That didn't save. Check your connection and try again.";
}
