/* ===== Admin: the risk model's settings and the rainy-season outlook lists ===== */
import {clone, esc, IX, MONTHS, safeUrl, settings, UI} from "../../core/core.js";
import {ENSO, outlookSettings} from "../../features/outlook.js";
import {confirmBox} from "../views-admin.js";

export function adModel() {
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
export function readModel(form) {
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
