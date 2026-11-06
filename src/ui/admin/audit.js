/* ===== Admin: the audit log of every change (filter, undo, download) and saving files ===== */
import {canWrite} from "../../core/auth.js";
import {DB, esc, fmtDate, norm, toast, UI} from "../../core/core.js";
import {ensureNames, nameOf} from "./people.js";
import {ID_RE} from "./records.js";
import {SCHEMA, tabLabel} from "./schema.js";
import {render} from "../main.js";

export const AUDIT = {loaded: false, rows: [], err: false, open: null};
async function loadAudit() {
  try {
    const snap = await DB.api.collection("audit").orderBy("at", "desc").limit(1000).get();
    AUDIT.rows = snap.docs.map(d => Object.assign({}, d.data(), {_id: d.id}));
    AUDIT.err = false;
  } catch (e) { AUDIT.err = true; }
  AUDIT.loaded = true;
  if (UI.mode === "admin" && UI.admin.tab === "audit") render();
}
export function auditFiltered() {
  const f = UI.admin.auditF, q = norm(f.q);
  return AUDIT.rows.filter(r => (!f.coll || r.coll === f.coll) && (!f.by || r.by === f.by) && (!q || norm(`${r.act} ${r.coll} ${r.id} ${JSON.stringify(r.after || "")}`).includes(q)));
}
export function changedKeys(b, a) {
  if (!b || !a) return "";
  const keys = [...new Set(Object.keys(b).concat(Object.keys(a)))].filter(k => !["updated", "updatedBy", "proposedBy", "proposedFor"].includes(k) && JSON.stringify(b[k]) !== JSON.stringify(a[k]));
  return keys.join(", ");
}
export function adAudit() {
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
    <div class="tablewrap"><table><thead><tr><th>When</th><th>Who</th><th>Role</th><th>Action</th><th>Section</th><th>Record</th><th>Fields changed</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
    ${rows.slice(0, 400).map((r, i) => `<tr><td class="num small">${esc(fmtDate(r.at))}</td><td>${esc(r.by ? nameOf(r.by) : "—")}</td><td class="small">${esc(r.role || "")}</td><td>${esc(r.act)}</td><td>${esc(tabLabel(r.coll))}</td><td class="small">${esc(r.id)}</td><td class="small">${esc(changedKeys(r.before, r.after))}</td>
      <td style="white-space:nowrap"><button class="sbtn" data-act="audit-open" data-i="${i}">Details</button>${canUndo(r) ? ` <button class="sbtn" data-act="audit-undo" data-i="${i}">Undo</button>` : ""}</td></tr>
      ${AUDIT.open === i ? `<tr><td colspan="8"><div class="grid2"><div><b>Before</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(r.before, null, 1))}</pre></div><div><b>After</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(r.after, null, 1))}</pre></div></div></td></tr>` : ""}`).join("") || `<tr><td colspan="8">No entries match.</td></tr>`}
    </tbody></table></div></div>`;
}
/* undo is offered only for whole-record changes made through the editor */
export function canUndo(r) { return !!SCHEMA[r.coll] && canWrite(r.coll) && /^(undid )?(approved )?(added|edited|deleted)$/.test(r.act) && (r.before || r.after) && ID_RE.test(r.id); }
export function auditCsv(rows) {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["when", "who_id", "who", "role", "action", "section", "record", "fields_changed", "before", "after"];
  return [head.join(",")].concat(rows.map(r => [r.at, r.by, r.by ? nameOf(r.by) : "", r.role, r.act, r.coll, r.id, changedKeys(r.before, r.after), JSON.stringify(r.before), JSON.stringify(r.after)].map(cell).join(","))).join("\n");
}
export async function saveFile(filename, text, type) {
  if (!DB.downloads) { toast("Downloads aren't available in this view."); return; }
  try { const r = await DB.downloads.save({filename, data: new Blob([text], {type})}); if (r?.status === "saved") toast("Saved " + filename); }
  catch (e) { if (e?.code !== "cancelled" && e?.code !== "declined") toast("The file could not be saved. Try again."); }
}
