/* ===== Access control: roles, permissions and who holds them =====
   Two layers protect Open Tracker's data:
   1. Database rules (declared at publish) decide who can write at all: only Editors and the Owner write shared
      data; an agency account can only ever write inside its own agencyData/<its id> area.
   2. Open Tracker roles (below) narrow what each Editor can do in the interface, and decide whose agency posts
      the public sees. Roles are stored in "roles", people in "members" (readable by Editors only). */
const PERMS = [
  ["data.edit", "Add and edit flood data (areas, past floods, safe places, roads, feeds, numbers)"],
  ["data.delete", "Delete flood data"],
  ["warnings.manage", "Post, change and remove official warnings"],
  ["forecasts.manage", "Enter rain forecasts and set dam status"],
  ["notify.send", "Send public notifications (phone alerts)"],
  ["model.manage", "Change the forecast model and public notice"],
  ["agencies.manage", "Add agencies, link their staff and approve access requests"],
  ["approvals.manage", "Approve or reject agency posts and changes"],
  ["contributions.review", "Review contributions and suggestions from the public"],
  ["users.manage", "Add people, assign roles and create roles"],
  ["audit.view", "See and export the audit log"],
  ["analytics.view", "See visitor analytics"],
  ["backup.manage", "Back up, restore and reset all data"],
  ["agency.publish", "Publish live data for their own agency"]
];
const PERM_KEYS = PERMS.map(p => p[0]);
const BUILTIN_ROLES = [
  {id: "administrator", n: "Administrator", builtin: true, perms: PERM_KEYS.filter(p => p !== "agency.publish")},
  {id: "data-editor", n: "Data editor", builtin: true, perms: ["data.edit", "data.delete", "warnings.manage", "forecasts.manage", "contributions.review"]},
  {id: "forecaster", n: "Duty forecaster", builtin: true, perms: ["warnings.manage", "forecasts.manage"]},
  {id: "auditor", n: "Auditor (read-only)", builtin: true, perms: ["audit.view"]},
  {id: "agency-editor", n: "Agency editor", builtin: true, perms: ["data.edit", "data.delete", "warnings.manage", "forecasts.manage", "notify.send", "agency.publish"]},
  {id: "agency-publisher", n: "Agency publisher", builtin: true, perms: ["agency.publish"]}
];

const AUTH = {
  isOwner: false,
  /* role object for the current viewer, or null */
  role() {
    if (!DB.uid) return null;
    const m = (DB.cols.members || []).find(x => x.id === DB.uid);
    if (!m || m.active === false) return null;
    return roles().find(r => r.id === m.role) || null;
  },
  /* agency this viewer publishes for (from the public agency registry) */
  agency() {
    if (!DB.uid) return null;
    return agencies().find(a => a.status !== "suspended" && (a.publishers || []).includes(DB.uid)) || null;
  },
  can(perm) {
    if (!DB.api) return false;
    if (perm === "agency.publish") return !!AUTH.agency();
    if (AUTH.isOwner) return true;
    if (!DB.canEdit) return false;          /* platform write access is required for every shared-data permission */
    const r = AUTH.role();
    return !!(r && (r.perms || []).includes(perm));
  },
  anyAdmin() { return PERM_KEYS.filter(p => p !== "agency.publish").some(p => AUTH.can(p)); },
  label() {
    if (AUTH.isOwner) return "Owner";
    const r = AUTH.role(), a = AUTH.agency(); if (r) return r.n + (a && r.id !== "agency-publisher" ? " · " + a.n : "");
    if (a) return "Publisher for " + a.n;
    return "";
  }
};
function roles() {
  const saved = data("roles");
  const byId = Object.fromEntries(saved.map(r => [r.id, r]));
  /* built-in roles always exist; their permissions can't be removed by mistake */
  return BUILTIN_ROLES.map(r => Object.assign({}, r, byId[r.id] ? {n: byId[r.id].n || r.n} : {})).concat(saved.filter(r => !BUILTIN_ROLES.some(b => b.id === r.id)));
}
function agencies() { return data("agencies"); }
/* which collection needs which permission */
const COLL_PERM = {
  alerts: "warnings.manage", forecasts: "forecasts.manage", dams: "forecasts.manage",
  hotspots: "data.edit", events: "data.edit", regionEvents: "data.edit", safe: "data.edit", roads: "data.edit",
  feeds: "data.edit", contacts: "data.edit", agencies: "agencies.manage", roles: "users.manage", members: "users.manage",
  notifications: "notify.send", changes: "approvals.manage", approvals: "approvals.manage", reviews: "contributions.review", replays: "data.edit"
};
function canWrite(coll) { return AUTH.can(COLL_PERM[coll] || "users.manage"); }
function canDelete(coll) {
  const p = COLL_PERM[coll];
  if (["warnings.manage", "forecasts.manage", "agencies.manage", "users.manage", "notify.send"].includes(p)) return AUTH.can(p);
  return AUTH.can("data.delete");
}
