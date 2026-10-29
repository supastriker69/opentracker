/* ===== Open-source contributions: flood reports, corrections, suggestions and data sources from the public =====
   Inside claude.ai each person writes only their own document, contributions/<their id> (database rule);
   administrators read all of them and record decisions in "reviews", which only they can write.
   On the self-hosted web app the same form posts to the server (window.WEBAPP.contribute). */
const CONTRIB_TYPES = [
  ["report", "Report a flood", "Tell us where it flooded, when, and how deep."],
  ["correction", "Suggest a correction", "Something wrong or missing about a place?"],
  ["suggestion", "Suggestion box", "Ideas to make Open Tracker better."],
  ["data", "Share a data source", "Rain gauges, river levels, maps or studies we can use."]
];
const DEPTHS = [["", "Not sure"], ["ankle", "Up to the ankles"], ["knee", "Up to the knees"], ["waist", "Up to the waist"], ["chest", "Up to the chest"], ["above", "Over a person's head"]];
const SUGGEST_CATS = [["feature", "A new feature"], ["data", "Data or information"], ["design", "Easier to use"], ["other", "Something else"]];
const CONTRIB = {mine: null, sub: null};

/* the contributor's own items (claude.ai): one live subscription */
function syncContribSub() {
  if (!DB.api || !DB.uid || CONTRIB.sub) return;
  try { CONTRIB.sub = DB.api.doc("contributions/" + DB.uid).onSnapshot(s => { CONTRIB.mine = s.exists ? s.data() : null; afterData(); }, () => {}); } catch (e) {}
}
const reviewKey = (uid, id) => "r" + APPROVAL.fnv(uid + "/" + id) + APPROVAL.fnv(id + "#" + uid);
function reviewOf(uid, id) { return data("reviews").find(r => r.id === reviewKey(uid, id)) || null; }

/* same rules as the server, so people see problems before sending */
function readContribution(form, type) {
  const v = id => (form.querySelector(id)?.value || "").trim();
  const item = {type, text: v("#c-text")};
  if (!item.text) throw new Error(type === "suggestion" ? "Write your idea." : "Tell us what happened.");
  if (item.text.length > 1000) throw new Error("Please keep it under 1,000 characters.");
  const placeKeyV = form.querySelector("#c-place")?.value || "";
  if (placeKeyV) { const p = keyPlace(placeKeyV); if (p) item.place = {type: p.type, id: p.id}; }
  const placeText = v("#c-where"); if (placeText) item.placeText = placeText.slice(0, 120);
  const date = v("#c-date");
  if (date) { if (Date.parse(date) > Date.now() + 864e5) throw new Error("The date can't be in the future."); item.date = date; }
  const depth = v("#c-depth"); if (depth) item.depth = depth;
  const cat = v("#c-cat"); if (cat) item.category = cat;
  const src = v("#c-src");
  if (src) { if (!safeUrl(src)) throw new Error("The link must start with http:// or https://"); item.src = src.slice(0, 500); }
  if (type === "data" && !item.src) throw new Error("Add a link to the data.");
  if (type === "report" && !item.place && !item.placeText) throw new Error("Say where the flooding is.");
  return item;
}
async function submitContribution(form) {
  const err = form.querySelector("#c-err");
  try {
    const item = readContribution(form, form.dataset.type);
    item.at = new Date().toISOString();
    if (window.WEBAPP) await window.WEBAPP.contribute(item);
    else {
      if (!DB.api || !DB.uid) throw new Error("Sign in to send contributions here, or use the Open Tracker website.");
      const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const ref = DB.api.doc("contributions/" + DB.uid);
      const exists = (await ref.get()).exists;
      if (exists) await ref.update({items: {[id]: item}});
      else await ref.set({items: {[id]: item}});
    }
    UI.contrib = {type: null, sent: true};
    render(); window.scrollTo(0, 0);
  } catch (e) {
    if (err) err.textContent = ["invalid_argument", "not_granted"].includes(e?.code) ? "Your access to this page can't send contributions. Use the Open Tracker website, or ask the owner for Contributor access." : e?.message && !e.code ? e.message : "That didn't send. Check your connection and try again.";
  }
}

/* ---------- public screen ---------- */
function viewContribute() {
  const c = UI.contrib;
  const head = `<button class="back" data-act="back">← Back</button><h1>Help improve Open Tracker</h1>`;
  if (c.sent) return `${head}<div class="notice info">${ICON.info}<div><b>Thank you. We've received it.</b>Our team checks every contribution against official sources before anything changes on the map.</div></div>
    <button class="btn" data-act="contrib-type" data-k="">Send something else</button>${myContribsHtml()}`;
  if (!c.type) return `${head}
    <p>Open Tracker is open source. Anyone can help: tell us about flooding you've seen, fix mistakes, or share ideas and data. Every contribution is checked before it appears.</p>
    <div class="results">${CONTRIB_TYPES.map(([k, n, s]) => `<button class="pick" data-act="contrib-type" data-k="${k}"><span class="grow"><span class="t">${n}</span><span class="s">${s}</span></span></button>`).join("")}</div>
    ${myContribsHtml()}`;
  const p = !c.noPlace && UI.place && placeKey(UI.place) ? UI.place : null;
  const placeField = p ? `<input type="hidden" id="c-place" value="${esc(placeKey(p))}"><p><b>Place:</b> ${esc(placeName(p))} <button type="button" class="linkbtn" data-act="contrib-noplace">Change</button></p>`
    : `<label class="field"><span>Where? Town, area or street</span><input id="c-where" maxlength="120" autocomplete="off"></label>`;
  const fields = {
    report: `${placeField}
      <label class="field"><span>When did it flood?</span><input id="c-date" type="date" max="${new Date().toISOString().slice(0, 10)}"></label>
      <label class="field"><span>How deep was the water?</span><select id="c-depth">${DEPTHS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>
      <label class="field"><span>What happened?</span><textarea id="c-text" maxlength="1000" placeholder="For example: the drain overflowed and shops were flooded for two hours."></textarea></label>
      <label class="field"><span>Link to a photo, video or news report (helps us check it)</span><input id="c-src" type="url" maxlength="500" placeholder="https://"></label>`,
    correction: `${placeField}
      <label class="field"><span>What is wrong, and what should it say?</span><textarea id="c-text" maxlength="1000"></textarea></label>
      <label class="field"><span>Where can we check this? (link, optional)</span><input id="c-src" type="url" maxlength="500" placeholder="https://"></label>`,
    suggestion: `<label class="field"><span>Your idea is about</span><select id="c-cat">${SUGGEST_CATS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>
      <label class="field"><span>Your suggestion</span><textarea id="c-text" maxlength="1000"></textarea></label>`,
    data: `<label class="field"><span>What data is it, and who publishes it?</span><textarea id="c-text" maxlength="1000"></textarea></label>
      <label class="field"><span>Link to the data</span><input id="c-src" type="url" maxlength="500" placeholder="https://" required></label>`
  }[c.type];
  return `${head}
    <form class="card" id="contrib-form" data-type="${c.type}" novalidate>
      <h2>${esc(CONTRIB_TYPES.find(t => t[0] === c.type)[1])}</h2>
      ${fields}
      <p class="small muted">Please don't include names, phone numbers or other personal details.</p>
      <p class="small" id="c-err" role="alert" style="color:var(--vhigh)"></p>
      <div class="toolbar"><button class="btn primary inline" type="submit">Send</button><button class="btn inline" type="button" data-act="contrib-type" data-k="">Cancel</button></div>
    </form>`;
}
function myContribsHtml() {
  const items = Object.entries((window.WEBAPP ? window.WEBAPP.sentItems() : CONTRIB.mine?.items) || {}).sort((a, b) => String(b[1].at).localeCompare(String(a[1].at)));
  if (!items.length) return "";
  const label = s => ({accepted: "Accepted, thank you", rejected: "Not used"}[s] || "Waiting to be checked");
  return `<div class="card"><h2>What you've sent</h2><ul class="plain">${items.slice(0, 20).map(([id, it]) => {
    const r = reviewOf(DB.uid, id);
    return `<li><b>${esc(CONTRIB_TYPES.find(t => t[0] === it.type)?.[1] || it.type)}</b> · ${esc(fmtDate(it.at))}<br><span class="small">${esc(it.text.slice(0, 140))}</span><br><span class="small muted">${label(r?.status)}${r?.note ? " · " + esc(r.note) : ""}</span></li>`;
  }).join("")}</ul></div>`;
}
function contributeCta(p) {
  return `<div class="card contribute-cta"><h2>Seen something we should know?</h2><div class="toolbar">
    <button class="sbtn" data-act="contribute" data-k="report">Report a flood${p ? " here" : ""}</button>
    ${p ? `<button class="sbtn" data-act="contribute" data-k="correction">Suggest a correction</button>` : ""}
    <button class="sbtn" data-act="contribute" data-k="suggestion">Suggestion box</button></div></div>`;
}

/* ---------- admin: every contribution, newest first ---------- */
const AD_CONTRIB = {rows: null, loading: false, filter: "new"};
async function loadContribs() {
  if (AD_CONTRIB.loading) return;
  AD_CONTRIB.loading = true;
  try {
    const snap = await DB.api.collection("contributions").get();
    AD_CONTRIB.rows = [];
    snap.docs.forEach(d => Object.entries(d.data()?.items || {}).forEach(([id, it]) => { if (it && typeof it.text === "string") AD_CONTRIB.rows.push(Object.assign({}, it, {id, uid: d.id})); }));
    AD_CONTRIB.rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  } catch (e) { AD_CONTRIB.rows = []; toast("Contributions could not be loaded."); }
  AD_CONTRIB.loading = false;
  if (UI.mode === "admin" && UI.admin.tab === "contributions") render();
}
function adContributions() {
  if (!AD_CONTRIB.rows) { loadContribs(); return `<div class="card"><p>Loading contributions…</p></div>`; }
  const st = r => reviewOf(r.uid, r.id)?.status || "new";
  const rows = AD_CONTRIB.rows.filter(r => !AD_CONTRIB.filter || st(r) === AD_CONTRIB.filter);
  ensureNames(rows.map(r => r.uid));
  const counts = ["new", "accepted", "rejected"].map(s => [s, AD_CONTRIB.rows.filter(r => st(r) === s).length]);
  return `<div class="card"><h2>Contributions from the public</h2>
    <p class="small muted">Flood reports, corrections, suggestions and data sources. Check sources before changing data. "Add as past flood" opens a new record filled in from the report.</p>
    <div class="toolbar"><label class="field"><span>Show</span><select id="ct-filter">${[["new", "New"], ["accepted", "Accepted"], ["rejected", "Rejected"], ["", "All"]].map(([k, n]) => `<option value="${k}" ${AD_CONTRIB.filter === k ? "selected" : ""}>${n}${k ? ` (${counts.find(c => c[0] === k)[1]})` : ""}</option>`).join("")}</select></label>
      <button class="sbtn" data-act="ct-reload" style="align-self:end">Refresh</button></div>
    <div class="stack">${rows.slice(0, 200).map(r => {
      const rv = reviewOf(r.uid, r.id);
      const where = r.place ? placeName(keyPlace(r.place.type + ":" + r.place.id) || {}) || r.place.id : r.placeText || "";
      return `<article class="notice-card"><div class="nc-head"><b>${esc(CONTRIB_TYPES.find(t => t[0] === r.type)?.[1] || r.type)}${where ? " · " + esc(where) : ""}</b><span class="small">${esc(fmtDate(r.at))}</span></div>
        <p>${esc(r.text)}</p>
        <p class="small muted">From ${esc(nameOf(r.uid))}${r.date ? " · flooded " + esc(r.date) : ""}${r.depth ? " · water " + esc(DEPTHS.find(d => d[0] === r.depth)?.[1].toLowerCase() || r.depth) : ""}${r.category ? " · " + esc(SUGGEST_CATS.find(c => c[0] === r.category)?.[1] || r.category) : ""}${rv ? " · " + esc(rv.status) + (rv.note ? ": " + esc(rv.note) : "") : ""}</p>
        ${safeUrl(r.src) ? `<a class="small" href="${esc(safeUrl(r.src))}" target="_blank" rel="noopener noreferrer">Open their source</a>` : ""}
        <div class="toolbar"><input id="ct-note-${esc(r.id)}" maxlength="300" placeholder="Note to the contributor (optional)" aria-label="Note">
          <button class="sbtn primary" data-act="ct-decide" data-ok="accepted" data-uid="${esc(r.uid)}" data-id="${esc(r.id)}">Accept</button>
          <button class="sbtn danger" data-act="ct-decide" data-ok="rejected" data-uid="${esc(r.uid)}" data-id="${esc(r.id)}">Reject</button>
          ${r.type === "report" && AUTH.can("data.edit") ? `<button class="sbtn" data-act="ct-event" data-uid="${esc(r.uid)}" data-id="${esc(r.id)}">Add as past flood</button>` : ""}
          ${r.place?.type === "hotspot" && AUTH.can("data.edit") ? `<button class="sbtn" data-act="ad-edit" data-k="hotspots" data-id="${esc(r.place.id)}">Open the place record</button>` : ""}</div></article>`;
    }).join("") || `<p>Nothing here.</p>`}</div></div>`;
}
async function contribAct(act, el) {
  try {
    if (act === "ct-reload") { AD_CONTRIB.rows = null; return render(); }
    if (act === "ct-decide") {
      REPO.require(AUTH.can("contributions.review"), "review contributions");
      const {uid, id, ok} = el.dataset;
      const note = ($("#ct-note-" + CSS.escape(id))?.value || "").trim().slice(0, 300);
      await DB.api.collection("reviews").doc(reviewKey(uid, id)).set({uid, item: id, status: ok, note, at: new Date().toISOString(), by: DB.uid || null});
      await REPO.audit(ok === "accepted" ? "accepted contribution" : "rejected contribution", "contributions", uid + "/" + id, null, {note});
      toast(ok === "accepted" ? "Accepted." : "Rejected.");
      return render();
    }
    if (act === "ct-event") {
      const r = AD_CONTRIB.rows.find(x => x.uid === el.dataset.uid && x.id === el.dataset.id);
      if (!r) return;
      const p = r.place ? keyPlace(r.place.type + ":" + r.place.id) : null;
      const yr = r.date ? +r.date.slice(0, 4) : null;
      UI.admin.tab = "events"; UI.admin.confirm = null;
      UI.admin.edit = {coll: "events", isNew: true, rec: {id: "ev-" + Date.now().toString(36), t: "Community report" + (p ? ": " + placeName(p) : r.placeText ? ": " + r.placeText : ""),
        c: (p && placeCountry(p)) || "GH", date: r.date || "", year: yr, ids: p?.type === "hotspot" ? [p.id] : [], impact: r.text + (r.depth ? ` Water ${DEPTHS.find(d => d[0] === r.depth)?.[1].toLowerCase()}.` : ""), src: safeUrl(r.src)}};
      return render();
    }
  } catch (e) { toast(errText(e)); }
}
