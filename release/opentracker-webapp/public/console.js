/* Open Tracker push console: agencies send public notices to phones; administrators approve them,
   switch approval on or off, publish the data exported from Open Tracker Admin, and look after the data feeds. */
"use strict";
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const S = {key: "", me: null, areas: [], sent: [], approval: true, autoHeat: false};
  try { S.key = sessionStorage.getItem("ftc-key") || ""; } catch (e) {}

  async function api(path, body) {
    const init = {headers: {Authorization: "Bearer " + S.key}, credentials: "same-origin"};
    if (body !== undefined) Object.assign(init, {method: "POST", body: JSON.stringify(body)}), init.headers["Content-Type"] = "application/json";
    const r = await fetch(path, init);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "The server didn't answer.");
    return Object.assign(j, {_status: r.status});
  }
  function say(el, msg, ok) { el.textContent = msg; el.className = "small " + (ok ? "ok" : "err"); }
  const fmt = s => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleString("en-GB", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}); };

  /* ---------- sign in ---------- */
  async function signIn(key) {
    S.key = key.trim();
    try {
      S.me = await api("/api/whoami");
      try { sessionStorage.setItem("ftc-key", S.key); } catch (e) {}
      draw(); await loadSent();
    } catch (e) { S.me = null; S.key = ""; draw(); say($("#login-msg"), e.message); }
  }
  function signOut() { S.key = ""; S.me = null; try { sessionStorage.removeItem("ftc-key"); } catch (e) {} draw(); }

  async function loadSent() {
    try { const r = await api("/api/sent"); S.sent = r.notices; S.approval = r.approval; S.autoHeat = !!r.autoHeatAlerts; drawLists(); } catch (e) { say($("#send-msg"), e.message); }
  }

  /* ---------- drawing ---------- */
  function draw() {
    $("#login").hidden = !!S.me; $("#work").hidden = !S.me;
    if (!S.me) return;
    $("#who").textContent = S.me.name + (S.me.admin ? " · administrator" : "");
    $("#approval-note").textContent = S.me.needsApproval ? "Your notices are checked by an Open Tracker administrator before they reach phones." : "Your notices go to phones as soon as you send them.";
    $("#admin").hidden = !S.me.admin;
    $("#contrib-card").hidden = !S.me.admin;
    $("#replay-card").hidden = !S.me.admin;
    $("#feeds-card").hidden = !S.me.admin;
    if (S.me.admin) { loadContribs(); loadReplays(); loadFeeds(); loadCapFeeds(); }
    drawAreas();
  }
  function drawAreas() {
    const c = $("#n-c").value;
    $("#n-areas").innerHTML = S.areas.filter(a => c === "ALL" || a.c === c).map(a => `<label><input type="checkbox" value="${esc(a.id)}"> ${esc(a.n)}</label>`).join("");
  }
  function drawLists() {
    const row = n => `<tr><td class="num small">${esc(fmt(n.at))}</td><td>${esc(n.agencyName)}</td><td><b>${esc(n.title)}</b><br><span class="small">${esc(n.msg)}</span></td>
      <td>${n.withdrawn ? "Withdrawn" : {live: "Sent", pending: "Waiting for approval", rejected: "Not approved"}[n.status] || esc(n.status)}${n.delivery ? `<br><span class="small muted">${n.delivery.sent} delivered${n.delivery.failed ? `, ${n.delivery.failed} failed` : ""}</span>` : ""}${n.note ? `<br><span class="small muted">${esc(n.note)}</span>` : ""}</td>
      <td style="white-space:nowrap">${n.status === "pending" && S.me.admin ? `<button class="sbtn primary" data-decide="1" data-id="${esc(n.id)}">Approve and send</button> <button class="sbtn danger" data-decide="0" data-id="${esc(n.id)}">Reject</button>` : ""}
      ${n.status === "live" && !n.withdrawn ? `<button class="sbtn" data-withdraw="${esc(n.id)}">Withdraw</button>` : ""}</td></tr>`;
    const pending = S.sent.filter(n => n.status === "pending");
    $("#pending-card").hidden = !(S.me.admin && pending.length);
    $("#pending").innerHTML = pending.map(row).join("");
    $("#sent").innerHTML = S.sent.map(row).join("") || `<tr><td colspan="5">Nothing sent yet.</td></tr>`;
    $("#ap-on").checked = S.approval;
    $("#auto-heat").checked = S.autoHeat;
  }

  /* ---------- actions ---------- */
  function readNotice() {
    const v = id => $(id).value.trim();
    const n = {level: v("#n-level"), title: v("#n-title"), msg: v("#n-msg"), c: v("#n-c"), areas: [...document.querySelectorAll("#n-areas input:checked")].map(i => i.value)};
    const lat = v("#n-lat"), lon = v("#n-lon"), km = v("#n-km");
    if (lat || lon) { n.ll = [Number(lon), Number(lat)]; n.km = Number(km || 10); }
    if (v("#n-exp")) n.expires = new Date(v("#n-exp")).toISOString();
    return n;
  }
  async function send(ev) {
    ev.preventDefault();
    const msg = $("#send-msg"), btn = $("#send-btn");
    btn.disabled = true;
    try {
      const r = await api("/api/notify", readNotice());
      say(msg, r.pending ? "Sent for approval. It reaches phones once approved." : `Sending to ${r.targeted} phone${r.targeted === 1 ? "" : "s"} that follow these places.`, true);
      $("#notice-form").reset(); drawAreas(); await loadSent();
    } catch (e) { say(msg, e.message); }
    btn.disabled = false;
  }
  async function decide(id, ok) {
    const note = $("#decide-note").value.trim();
    try {
      const r = await api("/api/decide", {id, ok, note});
      say($("#decide-msg"), ok ? `Approved. Sending to ${r.targeted || 0} phone${r.targeted === 1 ? "" : "s"}.` : "Rejected.", true);
      $("#decide-note").value = ""; await loadSent();
    } catch (e) { say($("#decide-msg"), e.message); }
  }
  async function withdraw(id) {
    try { await api("/api/withdraw", {id}); await loadSent(); } catch (e) { say($("#send-msg"), e.message); }
  }
  async function setApproval(on) {
    try { await api("/api/settings", {approval: on}); S.approval = on; say($("#admin-msg"), on ? "Agency notices now need approval." : "Agencies now send directly.", true); }
    catch (e) { say($("#admin-msg"), e.message); $("#ap-on").checked = !on; }
  }
  async function publish(file) {
    const m = $("#admin-msg");
    try {
      if (file.size > 8e6) throw new Error("That file is too large.");
      const body = JSON.parse(await file.text());
      const r = await api("/api/data", body);
      say(m, "Published. Everyone sees the new data the next time they open Open Tracker (" + fmt(r.published) + ").", true);
    } catch (e) { say(m, e instanceof SyntaxError ? "That isn't an Open Tracker backup file." : e.message); }
  }
  /* ---------- public contributions (administrators) ---------- */
  const CTYPES = {report: "Flood report", correction: "Correction", suggestion: "Suggestion", data: "Data source"};
  async function loadContribs() {
    try {
      const r = await api("/api/contributions");
      const f = $("#c-filter").value;
      $("#contribs").innerHTML = r.contributions.filter(c => !f || c.status === f).map(c => `<tr><td class="num small">${esc(fmt(c.at))}</td><td>${esc(CTYPES[c.type] || c.type)}${c.category ? `<br><span class="small muted">${esc(c.category)}</span>` : ""}</td>
        <td>${esc(c.text)}<br><span class="small muted">${[c.placeText, c.place ? c.place.type + ": " + c.place.id : "", c.date, c.depth ? "water to the " + c.depth : "", c.ll ? c.ll.join(", ") : ""].filter(Boolean).map(esc).join(" · ")}</span>${c.src ? `<br><a class="small" href="${esc(c.src)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</td>
        <td>${esc(c.status)}${c.note ? `<br><span class="small muted">${esc(c.note)}</span>` : ""}</td>
        <td style="white-space:nowrap"><button class="sbtn primary" data-contrib="accepted" data-id="${esc(c.id)}">Accept</button> <button class="sbtn danger" data-contrib="rejected" data-id="${esc(c.id)}">Reject</button></td></tr>`).join("") || `<tr><td colspan="5">Nothing here.</td></tr>`;
    } catch (e) { say($("#c-msg"), e.message); }
  }
  async function decideContrib(id, status) {
    try { await api("/api/contributions/decide", {id, status, note: $("#c-note").value.trim()}); $("#c-note").value = ""; await loadContribs(); }
    catch (e) { say($("#c-msg"), e.message); }
  }
  /* ---------- flood replays (administrators) ---------- */
  async function loadReplays() {
    try {
      const r = await (await fetch("/api/replays", {cache: "no-store"})).json();
      $("#replays").innerHTML = (r.replays || []).map(x => `<tr><td>${esc(x.title)}</td><td>${x.kind === "model" ? "Flood model" : "Satellite map"}</td><td class="num">${x.frames.length}</td><td class="small">${esc(fmt(x.frames[0].t))}</td>
        <td><button class="sbtn danger" data-replay-del="${esc(x.id)}">Delete</button></td></tr>`).join("") || `<tr><td colspan="5">No replays yet.</td></tr>`;
    } catch (e) { say($("#replay-msg"), "Replays could not be loaded."); }
  }
  async function uploadReplay(file) {
    const m = $("#replay-msg");
    try {
      if (file.size > 25e6) throw new Error("That file is too large (25 MB at most).");
      const r = await api("/api/replays", JSON.parse(await file.text()));
      say(m, `Published “${r.id}” with ${r.steps} steps.`, true); await loadReplays();
    } catch (e) { say(m, e instanceof SyntaxError ? "That isn't a replay file." : e.message); }
  }
  async function deleteReplay(id) {
    try { await api("/api/replays/delete", {id}); say($("#replay-msg"), "Deleted.", true); await loadReplays(); } catch (e) { say($("#replay-msg"), e.message); }
  }
  /* ---------- data feeds (administrators) ---------- */
  const STATUS = {ok: "Working", partial: "Working, some places missing", failing: "Failing", waiting: "Waiting for its first run", off: "Off"};
  const summaryText = s => Object.entries(s || {}).map(([k, v]) => `${k}: ${v}`).join(", ");
  async function loadFeeds() {
    try {
      const r = await api("/api/sources/admin");
      $("#feeds").innerHTML = r.sources.map(s => `<tr><td><a href="${esc(s.link)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a><br><span class="small muted">${esc(s.gives)} · ${esc(s.licence)}</span></td>
        <td class="${s.status === "failing" ? "err" : ""}">${esc(STATUS[s.status] || s.status)}${s.failures ? `<br><span class="small">${s.failures} failed tries</span>` : ""}</td>
        <td class="small">${s.lastOk ? esc(fmt(s.lastOk)) : "—"}${s.nextRun ? `<br><span class="muted">next ${esc(fmt(s.nextRun))}</span>` : ""}</td>
        <td class="small">${esc(summaryText(s.summary))}${s.error ? `<br><span class="err">${esc(s.error)}</span>` : ""}${(s.warnings || []).map(w => `<br><span class="muted">${esc(w)}</span>`).join("")}</td>
        <td>${r.feeds.includes(s.id) ? `<button class="sbtn" data-feed-run="${esc(s.id)}">Run now</button>` : ""}</td></tr>`).join("");
    } catch (e) { say($("#feeds-msg"), e.message); }
  }
  async function runFeed(id) {
    try { await api("/api/sources/run", {id}); say($("#feeds-msg"), "Started. Refresh the list in a minute to see the result.", true); setTimeout(loadFeeds, 4000); }
    catch (e) { say($("#feeds-msg"), e.message); }
  }
  async function setAutoHeat(on) {
    try { await api("/api/settings", {autoHeatAlerts: on}); S.autoHeat = on; say($("#feeds-msg"), on ? "Automatic heat alerts are on." : "Automatic heat alerts are off.", true); }
    catch (e) { say($("#feeds-msg"), e.message); $("#auto-heat").checked = !on; }
  }
  async function loadCapFeeds() {
    try {
      const r = await api("/api/cap-feeds");
      $("#cap-feeds").innerHTML = r.feeds.map(f => `<tr><td>${esc(f.country)}</td><td>${esc(f.agency)}</td><td class="small">${esc(f.url)}</td>
        <td><button class="sbtn danger" data-cap-del="${esc(f.id)}">Remove</button></td></tr>`).join("") || `<tr><td colspan="4">No warning feeds yet.</td></tr>`;
    } catch (e) { say($("#feeds-msg"), e.message); }
  }
  async function addCapFeed(ev) {
    ev.preventDefault();
    const add = {country: $("#cap-c").value.trim().toUpperCase(), agency: $("#cap-agency").value.trim(), url: $("#cap-url").value.trim()};
    try { const r = await api("/api/cap-feeds", {add}); say($("#feeds-msg"), `Added ${r.feed.agency}. It is read at the next run.`, true); $("#cap-form").reset(); await loadCapFeeds(); }
    catch (e) { say($("#feeds-msg"), e.message); }
  }
  async function removeCapFeed(id) {
    try { await api("/api/cap-feeds", {remove: id}); say($("#feeds-msg"), "Removed.", true); await loadCapFeeds(); } catch (e) { say($("#feeds-msg"), e.message); }
  }
  async function downloadSnapshot() {
    try {
      const r = await fetch("/api/snapshot", {headers: {Authorization: "Bearer " + S.key}, credentials: "same-origin"});
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "The server didn't answer.");
      const url = URL.createObjectURL(await r.blob());
      const a = Object.assign(document.createElement("a"), {href: url, download: `opentracker-live-data-${new Date().toISOString().slice(0, 10)}.json`});
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      say($("#feeds-msg"), "Downloaded. Import it in the claude.ai page: Admin → Live data.", true);
    } catch (e) { say($("#feeds-msg"), e.message); }
  }
  async function stats() {
    try { const s = await api("/api/stats"); $("#stats").textContent = `${s.subscribers} phones subscribed (${s.withLocation} with location) · ${Object.entries(s.byCountry).map(([c, n]) => c + ": " + n).join(", ") || "none yet"} · ${s.noticesActive} notices showing now`; }
    catch (e) { $("#stats").textContent = e.message; }
  }

  /* ---------- wiring ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    try { S.areas = await (await fetch("/areas.json")).json(); } catch (e) { S.areas = []; }
    $("#login-form").addEventListener("submit", e => { e.preventDefault(); signIn($("#key").value); });
    $("#signout").addEventListener("click", signOut);
    $("#notice-form").addEventListener("submit", send);
    $("#n-c").addEventListener("change", drawAreas);
    $("#ap-on").addEventListener("change", e => setApproval(e.target.checked));
    $("#data-file").addEventListener("change", e => { if (e.target.files[0]) publish(e.target.files[0]); e.target.value = ""; });
    $("#stats-btn").addEventListener("click", stats);
    $("#c-filter").addEventListener("change", loadContribs);
    $("#replay-file").addEventListener("change", e => { if (e.target.files[0]) uploadReplay(e.target.files[0]); e.target.value = ""; });
    $("#auto-heat").addEventListener("change", e => setAutoHeat(e.target.checked));
    $("#cap-form").addEventListener("submit", addCapFeed);
    $("#snapshot-btn").addEventListener("click", downloadSnapshot);
    document.addEventListener("click", e => {
      const decideBtn = e.target.closest("[data-decide]"); if (decideBtn) decide(decideBtn.dataset.id, decideBtn.dataset.decide === "1");
      const withdrawBtn = e.target.closest("[data-withdraw]"); if (withdrawBtn) withdraw(withdrawBtn.dataset.withdraw);
      const contribBtn = e.target.closest("[data-contrib]"); if (contribBtn) decideContrib(contribBtn.dataset.id, contribBtn.dataset.contrib);
      const replayBtn = e.target.closest("[data-replay-del]"); if (replayBtn) deleteReplay(replayBtn.dataset.replayDel);
      const feedBtn = e.target.closest("[data-feed-run]"); if (feedBtn) runFeed(feedBtn.dataset.feedRun);
      const capBtn = e.target.closest("[data-cap-del]"); if (capBtn) removeCapFeed(capBtn.dataset.capDel);
    });
    if (S.key) await signIn(S.key); else draw();
  });
})();
