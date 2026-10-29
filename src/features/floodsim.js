/* ===== Flood projection: how far water reaches, how deep it gets and how much water there is =====
   A small two-dimensional flood model run on the real ground heights around a place. Rain falls on every cell
   (minus what soaks in), rivers rise at river cells, the sea holds coastal cells at sea level, and water flows
   downhill between neighbouring cells with Manning friction: the diffusive-wave scheme of LISFLOOD-FP
   (Bates and De Roo 2000), with each transfer capped so depths never go negative.
   Pure functions: no page, no network. The projection screen drives it in short slices so the page stays smooth;
   tests check that every cubic metre of water is accounted for. */
const FLOODSIM = (() => {
  const G = 9.81;
  const MIN_FLOW_DEPTH = 1e-4;          /* m: thinner films do not flow */
  const EDGE_SLOPE = 0.002;             /* water leaving the grid's edge flows out on a gentle slope */
  const CLASSES = [                     /* the same words as the city flood models (modelling/frames.py) */
    {k: 1, min: 0.15, max: 0.3, n: "Ankle to knee deep"},
    {k: 2, min: 0.3, max: 0.6, n: "Knee to waist deep"},
    {k: 3, min: 0.6, max: 1.2, n: "Waist to chest deep"},
    {k: 4, min: 1.2, max: null, n: "Deeper than chest height"}
  ];
  const WET = CLASSES[0].min;           /* a cell counts as flooded from ankle depth */

  /* cells below sea level that touch the grid's edge through other low cells: the open sea */
  function seaMask(z, w, h, seaLevel) {
    const sea = new Uint8Array(w * h);
    if (seaLevel === null || seaLevel === undefined) return sea;
    const stack = [];
    const push = i => { if (!sea[i] && z[i] < seaLevel) { sea[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop(), x = i % w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w);
      if (i < (h - 1) * w) push(i + w);
    }
    return sea;
  }

  /* rain rate (m/s) at time t (s) for a storm of totalMm over stormHours, peaking in the middle (triangle) */
  function rainRate(totalMm, stormHours, t) {
    const T = stormHours * 3600;
    if (!(totalMm > 0) || !(T > 0) || t < 0 || t > T) return 0;
    const peak = 2 * totalMm / 1000 / T;
    return peak * (1 - Math.abs(t - T / 2) / (T / 2));
  }

  function classify(depth) {
    const out = new Uint8Array(depth.length);
    for (let i = 0; i < depth.length; i++) {
      const d = depth[i];
      out[i] = d >= 1.2 ? 4 : d >= 0.6 ? 3 : d >= 0.3 ? 2 : d >= WET ? 1 : 0;
    }
    return out;
  }

  /* totals for one moment, over the land cells (sea and river cells are boundaries, not flooding) */
  function stats(d, fixed, area) {
    let volume = 0, wet = 0, maxDepth = 0;
    const byClass = [0, 0, 0, 0, 0];
    for (let i = 0; i < d.length; i++) {
      if (fixed[i]) continue;
      const v = d[i];
      if (v <= 0) continue;
      volume += v * area;
      if (v > maxDepth) maxDepth = v;
      if (v >= WET) { wet++; byClass[v >= 1.2 ? 4 : v >= 0.6 ? 3 : v >= 0.3 ? 2 : 1]++; }
    }
    return {volume, km2: wet * area / 1e6, maxDepth, byClass: byClass.map(n => n * area / 1e6)};
  }

  /* A run that advances in slices: step(seconds of model time) → true when finished.
     opts: {dem, w, h, cell (m), rainMm, stormHours, hours, runoff (0–1), manning,
            seaLevel (m, or null inland: ground below it and joined to the edge is the sea), surge (m above seaLevel),
            river: [cell indices], riverRise (m), frameEvery (s), maxDt (s)}.
     The sea and rivers rise to their full height over the storm hours and push water onto the land. */
  function create(opts) {
    const w = opts.w, h = opts.h, n = w * h, cell = opts.cell, A = cell * cell;
    if (!(w >= 3 && h >= 3) || opts.dem.length !== n || !(cell > 0)) throw new Error("bad grid");
    const z = Float64Array.from(opts.dem);
    const manning = opts.manning || 0.05, runoff = Math.min(1, Math.max(0, opts.runoff ?? 0.6));
    const end = Math.max(1, opts.hours || 12) * 3600, frameEvery = opts.frameEvery || 3600, maxDt = opts.maxDt || 30;
    const stormHours = opts.stormHours || 6, rainMm = opts.rainMm || 0, riverRise = Math.max(0, opts.riverRise || 0), surge = Math.max(0, opts.surge || 0);
    const fixed = seaMask(z, w, h, opts.seaLevel);                 /* 1 = sea */
    const river = (opts.river || []).filter(i => i >= 0 && i < n && !fixed[i]);
    river.forEach(i => { fixed[i] = 2; });                          /* 2 = river held at its stage */
    const d = new Float64Array(n), delta = new Float64Array(n);
    const sea = opts.seaLevel ?? 0;
    for (let i = 0; i < n; i++) if (fixed[i] === 1) d[i] = Math.max(0, sea - z[i]);
    const ledger = {rain: 0, river: 0, edge: 0, sea: 0};
    const frames = [];
    let t = 0, nextFrame = frameEvery;

    const rise = time => Math.min(1, time / (stormHours * 3600));   /* rivers and sea come up over the storm */
    const snap = () => { const s = stats(d, fixed, A); frames.push(Object.assign({t, depth: Float32Array.from(d)}, s)); };
    const bounds = [], edges = [];
    for (let i = 0; i < n; i++) if (fixed[i]) bounds.push(i);
    for (let x = 0; x < w; x++) edges.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) edges.push(y * w, y * w + w - 1);   /* corners appear twice: two open sides */
    const edgeQ = Math.sqrt(EDGE_SLOPE) / manning;
    let hmax = 0.01;
    snap();

    /* Sea and river cells go back to their (rising) level after each step. What flowed between them and the
       land during the step is counted; their own rise is the sea's or river's water, not flooding. */
    const held = new Float64Array(bounds.length);
    bounds.forEach((i, k) => { held[k] = d[i]; });
    function holdBoundaries() {
      bounds.forEach((i, k) => {
        const flowedIn = (d[i] - held[k]) * A;
        if (fixed[i] === 1) ledger.sea += flowedIn; else ledger.river -= flowedIn;
        held[k] = d[i] = fixed[i] === 1 ? Math.max(0, sea + surge * rise(t) - z[i]) : riverRise * rise(t);
      });
    }

    /* volume moved across the face between cells a and b in dt seconds (positive: a → b) */
    function faceFlow(a, b, dt) {
      const da = d[a], db = d[b];
      if (da <= MIN_FLOW_DEPTH && db <= MIN_FLOW_DEPTH) return 0;
      const za = z[a], zb = z[b], dEta = za + da - zb - db;
      if (dEta === 0) return 0;
      const hf = (dEta > 0 ? za + da : zb + db) - (za > zb ? za : zb);
      if (hf <= MIN_FLOW_DEPTH) return 0;
      const s = dEta > 0 ? dEta : -dEta, donor = dEta > 0 ? da : db;
      let q = hf * Math.cbrt(hf * hf) / manning * Math.sqrt(s / cell);
      const qc = hf * Math.sqrt(G * hf);
      if (q > qc) q = qc;
      let vol = q * cell * dt;
      if (vol > s * A / 4) vol = s * A / 4;
      if (vol > donor * A / 4) vol = donor * A / 4;
      return dEta > 0 ? vol : -vol;
    }

    function stepOnce(limit) {
      const dt = Math.min(maxDt, 0.7 * cell / Math.sqrt(G * hmax), limit);
      const rain = rainRate(rainMm, stormHours, t + dt / 2) * runoff * dt;
      delta.fill(0);
      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let i = row; i < row + w - 1; i++) { const v = faceFlow(i, i + 1, dt); if (v !== 0) { delta[i] -= v; delta[i + 1] += v; } }
        if (y < h - 1) for (let i = row; i < row + w; i++) { const v = faceFlow(i, i + w, dt); if (v !== 0) { delta[i] -= v; delta[i + w] += v; } }
      }
      /* free outfall at the grid's edge (one open side per edge, two at corners) */
      for (const i of edges) {
        if (fixed[i] || d[i] <= MIN_FLOW_DEPTH) continue;
        let vol = d[i] * Math.cbrt(d[i] * d[i]) * edgeQ * cell * dt;
        if (vol > d[i] * A / 4) vol = d[i] * A / 4;
        delta[i] -= vol; ledger.edge += vol;
      }
      hmax = 0.01;
      let rained = 0;
      for (let i = 0; i < n; i++) {
        let v = d[i] + delta[i] / A;
        if (!fixed[i] && rain > 0) { v += rain; rained++; }
        d[i] = v > 0 ? v : 0;
        if (d[i] > hmax) hmax = d[i];
      }
      ledger.rain += rained * rain * A;
      t += dt;
      holdBoundaries();
    }

    return {
      w, h, cell, fixed, frames, ledger,
      get time() { return t; },
      get done() { return t >= end - 1e-6; },
      /* advance up to `seconds` of model time; returns true when the run is finished */
      step(seconds) {
        const stop = Math.min(end, t + seconds);
        while (t < stop - 1e-6) {
          stepOnce(Math.min(nextFrame, stop) - t);
          if (t >= nextFrame - 1e-6) { snap(); nextFrame += frameEvery; }
        }
        return t >= end - 1e-6;
      },
      /* water on the land now, and what came in and went out: rain + river = stored + edge + sea
         (sea is negative when a storm surge pushes the sea onto the land) */
      balance() {
        let stored = 0;
        for (let i = 0; i < n; i++) if (!fixed[i]) stored += d[i] * A;
        return {stored, rain: ledger.rain, river: ledger.river, edge: ledger.edge, sea: ledger.sea};
      }
    };
  }

  function runAll(opts) { const r = create(opts); while (!r.step(3600)); return r; }

  /* the highest water of the run at each cell, and when it came */
  function peak(frames) {
    const n = frames[0].depth.length, depth = new Float32Array(n), hour = new Uint8Array(n);
    frames.forEach((f, k) => { for (let i = 0; i < n; i++) if (f.depth[i] > depth[i]) { depth[i] = f.depth[i]; hour[i] = k; } });
    return {depth, hour};
  }

  /* cells of one depth class → rectangles (lon/lat) merged along rows and down columns: a MultiPolygon */
  function classPolygons(classes, w, h, bbox, k, stride = 1) {
    const [W, S, E, N] = bbox, gw = Math.ceil(w / stride), gh = Math.ceil(h / stride);
    const at = (gx, gy) => classes[Math.min(h - 1, gy * stride) * w + Math.min(w - 1, gx * stride)] === k;
    const lon = gx => W + (E - W) * Math.min(gw, gx) / gw, lat = gy => N - (N - S) * Math.min(gh, gy) / gh;
    const open = new Map(), rects = [];
    for (let gy = 0; gy < gh; gy++) {
      const runs = [];
      for (let gx = 0; gx < gw;) {
        if (!at(gx, gy)) { gx++; continue; }
        const x0 = gx;
        while (gx < gw && at(gx, gy)) gx++;
        runs.push(x0 + ":" + gx);
      }
      const next = new Map();
      for (const key of runs) next.set(key, open.has(key) ? open.get(key) : {key, y0: gy});
      for (const [key, r] of open) if (!next.has(key)) rects.push(Object.assign(r, {y1: gy}));
      open.clear(); next.forEach((v, key) => open.set(key, v));
    }
    for (const r of open.values()) rects.push(Object.assign(r, {y1: gh}));
    return rects.map(r => {
      const [x0, x1] = r.key.split(":").map(Number);
      const a = [lon(x0), lat(r.y0)], b = [lon(x1), lat(r.y0)], c = [lon(x1), lat(r.y1)], d = [lon(x0), lat(r.y1)];
      return [[a, d, c, b, a].map(p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5])];
    });
  }

  /* one step of a replay file: a FeatureCollection with one MultiPolygon per depth class, kept under the
     size limits phones and the database use (coarser cells when the water is very patchy) */
  function frameCollection(classes, w, h, bbox, {maxBytes = 180000, maxPoints = 40000} = {}) {
    for (let stride = 1; stride <= 8; stride++) {
      const features = [];
      let points = 0;
      for (const c of CLASSES) {
        const polys = classPolygons(classes, w, h, bbox, c.k, stride);
        if (!polys.length) continue;
        points += polys.length * 5;
        features.push({type: "Feature", properties: {k: c.k}, geometry: {type: "MultiPolygon", coordinates: polys}});
      }
      const fc = {type: "FeatureCollection", features};
      if (points <= maxPoints && JSON.stringify(fc).length <= maxBytes) return fc;
    }
    throw new Error("The flooded area is too patchy to save; try a smaller area.");
  }

  return {CLASSES, WET, seaMask, rainRate, classify, stats, create, runAll, peak, classPolygons, frameCollection};
})();
