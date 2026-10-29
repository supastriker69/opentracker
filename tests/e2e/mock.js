(() => {
  const LS = localStorage;
  const role = JSON.parse(LS.getItem("mockrole") || '{"uid":"u-owner","owner":true,"edit":true,"level":"owner"}');
  let store = JSON.parse(LS.getItem("mockdb") || "{}");   // path -> data
  const subs = [];
  const save = () => LS.setItem("mockdb", JSON.stringify(store));
  const lvl = {view: 0, interact: 1, admin: 2, owner: 3}[role.level];
  const err = code => Object.assign(new Error(code), {code});
  /* evaluates the same rules file that is published with the page (config/db-rules.json) */
  const RULES = window.__RULES;
  const LV = {view: 0, interact: 1, admin: 2, owner: 3};
  function need(p, action) {
    let best = null, bestLen = -1;   /* the most specific rule that sets this action wins */
    for (const r of RULES) {
      const rp = r.path;
      let ok, len;
      if (rp.endsWith("/{self}")) { const pre = rp.slice(0, -7); ok = p === pre + "/" + role.uid || p.startsWith(pre + "/" + role.uid + "/"); len = rp.length; }
      else { ok = rp === "" || p === rp || p.startsWith(rp + "/"); len = rp.length; }
      if (ok && len > bestLen && r[action] !== undefined) { best = r[action]; bestLen = len; }
    }
    return LV[best || "view"];
  }
  const canRead = p => lvl >= need(p, "read");
  const canWrite = p => lvl >= need(p, "write");
  const segs = p => p.split("/").length;
  let auto = 0;
  const notify = () => setTimeout(() => subs.forEach(s => s()), 0);
  const snapDoc = (p) => ({id: p.split("/").pop(), exists: p in store, data: () => store[p] ? JSON.parse(JSON.stringify(store[p])) : undefined});
  function docRef(p) {
    return {
      id: p.split("/").pop(), path: p,
      async get() { if (!canRead(p)) throw err("not_granted"); return snapDoc(p); },
      async set(d) { if (!canWrite(p)) throw err("invalid_argument"); if (typeof d !== "object" || JSON.stringify(d).length > 256000) throw err("invalid_argument"); store[p] = JSON.parse(JSON.stringify(d)); save(); notify(); },
      async update(d) { if (!canWrite(p)) throw err("invalid_argument"); if (!(p in store)) throw err("invalid_argument"); const merge = (a, b) => { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) merge(a[k], b[k]); else a[k] = b[k]; } }; merge(store[p], JSON.parse(JSON.stringify(d))); window.__writes = (window.__writes||0)+1; save(); notify(); },
      async delete() { if (!canWrite(p)) throw err("invalid_argument"); delete store[p]; save(); notify(); },
      onSnapshot(fn, efn) { if (!canRead(p)) { setTimeout(() => efn && efn(err("not_granted")), 0); return () => {}; } const s = () => fn(snapDoc(p)); subs.push(s); setTimeout(s, 0); return () => subs.splice(subs.indexOf(s), 1); },
      collection(n) { return collRef(p + "/" + n); }
    };
  }
  function collRef(p, q = {}) {
    const run = () => {
      let docs = Object.keys(store).filter(k => k.startsWith(p + "/") && segs(k) === segs(p) + 1).map(k => ({id: k.split("/").pop(), exists: true, data: () => JSON.parse(JSON.stringify(store[k]))}));
      if (q.ob) docs.sort((a, b) => { const x = a.data()[q.ob], y = b.data()[q.ob]; return (x < y ? -1 : x > y ? 1 : 0) * (q.dir === "desc" ? -1 : 1); });
      if (q.lim) docs = docs.slice(0, q.lim);
      return {docs, size: docs.length, empty: !docs.length};
    };
    if (segs(p) % 2 === 0) throw err("invalid_argument");
    return {
      doc(id) { return docRef(p + "/" + (id || ("auto" + (++auto) + Date.now().toString(36)))); },
      async add(d) { const r = this.doc(); await r.set(d); return r; },
      orderBy(f, dir) { return collRef(p, Object.assign({}, q, {ob: f, dir})); },
      limit(n) { return collRef(p, Object.assign({}, q, {lim: n})); },
      where() { return this; },
      async get() { if (!canRead(p)) throw err("not_granted"); return run(); },
      onSnapshot(fn, efn) { if (!canRead(p)) { setTimeout(() => efn && efn(err("not_granted")), 0); return () => {}; } const s = () => fn(run()); subs.push(s); setTimeout(s, 0); return () => subs.splice(subs.indexOf(s), 1); }
    };
  }
  const db = {doc: docRef, collection: collRef};
  const PEOPLE = {"u-owner": "Kofi Owner", "u-ed": "Ama Editor", "u-agent": "Ngozi Agency", "u-x": "Yaw Stranger"};
  const user = {
    isOwner: async () => !!role.owner, canEdit: async () => !!role.edit, id: async () => role.uid,
    profiles: async ids => Object.fromEntries((Array.isArray(ids) ? ids : [ids]).map(i => [i, {id: i, name: PEOPLE[i] || ""}])),
    search: async qs => Object.entries(PEOPLE).filter(([i, n]) => qs && n.toLowerCase().includes(qs.toLowerCase())).map(([id, name]) => ({id, name}))
  };
  window.__inject = (p, d) => { store[p] = d; save(); notify(); };
  window.__saved = [];
  const downloads = {save: async ({filename, data}) => { window.__saved.push({filename, size: typeof data === "string" ? data.length : data.size}); return {status: "saved"}; }};
  let me = {};
  const room = {presence: async p => { me = Object.assign({}, me, p); window.__presence = me; },
    onPeers(fn) { setTimeout(() => { const peers = [{peer:"a", isMe:true, kind:"viewer", guest:false, presence: me}, {peer:"b", kind:"viewer", guest:true, presence:{s:"answer", p:"area:GH-AA", d:"phone"}}, {peer:"c", kind:"viewer", guest:false, presence:{s:"map", p:"area:NG-LA", d:"phone"}}, {peer:"z", kind:"agent", presence:{}}]; fn({peers, joined: peers, left: [], updated: []}); }, 50); return () => {}; }};
  window.claude = {use: async n => ({db, user, downloads, room}[n] || null)};
})();
