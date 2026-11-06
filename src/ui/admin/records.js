/* ===== Admin: the table of a kind of record, and the form that adds or edits one ===== */
import {FT} from "../../data/data.js";
import {APPROVAL} from "../../core/approval.js";
import {agencies, canDelete} from "../../core/auth.js";
import {clone, data, esc, fmtDate, ICON, IX, MONTHS, norm, safeUrl, settings, UI} from "../../core/core.js";
import {localDT} from "../../features/agency.js";
import {NOTICE_LEVELS} from "../../features/notify.js";
import {noticeSenders, SCHEMA} from "./schema.js";
import {confirmBox} from "../views-admin.js";

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
export function adCollection(key) {
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
export const ID_RE = /^[A-Za-z0-9_\-]{1,60}$/;
export function readForm(key, form) {
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
