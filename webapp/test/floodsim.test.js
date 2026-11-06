"use strict";
/* The flood projection model (src/features/floodsim.js): water is conserved, flows downhill, pools in low ground,
   drains to the sea and the grid's edge, rises from rivers, and is written out within the replay size limits. */
const test = require("node:test");
const assert = require("node:assert/strict");

const {FLOODSIM} = require("../../src/features/floodsim.js");   /* the browser's own module (Node 22.12+ loads ES modules with require) */

/* a bowl: ground rises 0.05 m per cell away from the centre */
function bowl(w, h, slope = 0.05) {
  const z = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) z[y * w + x] = 10 + slope * Math.hypot(x - (w - 1) / 2, y - (h - 1) / 2);
  return z;
}
const close = (a, b, rel = 1e-6) => assert.ok(Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test("every cubic metre is accounted for: in = stored + out", () => {
  const r = FLOODSIM.runAll({dem: bowl(41, 41), w: 41, h: 41, cell: 30, rainMm: 100, stormHours: 3, hours: 8, runoff: 0.7});
  const b = r.balance();
  close(b.rain, 41 * 41 * 900 * 0.1 * 0.7, 1e-6);   /* 100 mm × 70 % on every cell */
  close(b.rain + b.river, b.stored + b.edge + b.sea, 1e-9);
  assert.equal(r.frames.length, 9);                  /* the start and every hour */
  assert.ok(r.frames.every(f => f.depth.every(v => v >= 0)));
});

test("water gathers in the low middle, deepest at the bottom", () => {
  const w = 41, r = FLOODSIM.runAll({dem: bowl(w, w), w, h: w, cell: 30, rainMm: 150, stormHours: 3, hours: 6});
  const last = r.frames[r.frames.length - 1];
  const centre = last.depth[20 * w + 20], rim = last.depth[2 * w + 2];
  assert.ok(centre > 0.3 && centre > 5 * rim, `centre ${centre} rim ${rim}`);
  assert.ok(last.km2 > 0 && Math.abs(last.maxDepth - Math.max(...last.depth)) < 1e-6);
  const {depth, hour} = FLOODSIM.peak(r.frames);
  assert.ok(depth[20 * w + 20] >= centre);
  assert.ok(hour[20 * w + 20] >= 3);                  /* the bowl keeps filling after the rain peak */
});

test("flat ground with no rain stays dry; a tilted plane drains off the edge", () => {
  const flat = FLOODSIM.runAll({dem: new Float64Array(100).fill(5), w: 10, h: 10, cell: 50, rainMm: 0, hours: 2});
  assert.equal(flat.frames.at(-1).volume, 0);
  const tilt = new Float64Array(30 * 30);
  for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) tilt[y * 30 + x] = 20 - 0.3 * x;   /* steep: everything runs east */
  const r = FLOODSIM.runAll({dem: tilt, w: 30, h: 30, cell: 30, rainMm: 50, stormHours: 1, hours: 6});
  const b = r.balance();
  assert.ok(b.edge > 0.95 * b.rain, `edge ${b.edge} of rain ${b.rain}`);
  assert.ok(r.frames.at(-1).maxDepth < 0.05);
});

test("the sea takes water and never counts as flooding; a rising river floods its low banks", () => {
  const w = 30, z = new Float64Array(w * w);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) z[y * w + x] = x < 5 ? -3 : 0.5 + 0.02 * (x - 5);   /* sea to the west */
  const sea = FLOODSIM.seaMask(z, w, w, 0);
  assert.equal(sea.reduce((a, b) => a + b, 0), 5 * w);
  const coast = FLOODSIM.runAll({dem: z, w, h: w, cell: 30, rainMm: 80, stormHours: 2, hours: 6, seaLevel: 0});
  const cb = coast.balance();
  assert.ok(cb.sea > 0);
  close(cb.rain, cb.stored + cb.edge + cb.sea, 1e-9);
  const surge = FLOODSIM.runAll({dem: z, w, h: w, cell: 30, rainMm: 0, hours: 4, stormHours: 2, seaLevel: 0, surge: 1});   /* sea 1 m up */
  assert.ok(surge.frames.at(-1).km2 > 0.05, "low coastal land floods");
  assert.ok(surge.frames.at(-1).depth[10 * w + 29] < 0.01, "land above the surge stays dry");
  const sb = surge.balance();
  close(-sb.sea, sb.stored + sb.edge, 1e-9);   /* everything on land came from the sea */

  const valley = new Float64Array(w * w), riverCells = [];
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { valley[y * w + x] = 2 + 0.1 * Math.abs(x - 15); if (x === 15) riverCells.push(y * w + x); }
  const r = FLOODSIM.runAll({dem: valley, w, h: w, cell: 30, rainMm: 0, hours: 6, stormHours: 3, river: riverCells, riverRise: 1});
  const last = r.frames.at(-1);
  assert.ok(last.depth[10 * w + 16] > 0.5, "the bank beside the river floods");
  assert.ok(last.depth[10 * w + 29] < 0.05, "high ground stays dry");
  const rb = r.balance();
  close(rb.river, rb.stored + rb.edge + rb.sea, 1e-9);
});

test("depth classes and replay steps within the size limits", () => {
  assert.deepEqual([...FLOODSIM.classify(Float32Array.from([0, 0.1, 0.2, 0.4, 0.9, 2]))], [0, 0, 1, 2, 3, 4]);
  const w = 6, h = 4, cls = new Uint8Array(w * h);
  [0, 1, 6, 7].forEach(i => { cls[i] = 2; });          /* a 2 × 2 block in the top-left */
  cls[23] = 4;
  const polys = FLOODSIM.classPolygons(cls, w, h, [0, 0, 6, 4], 2);
  assert.deepEqual(polys, [[[[0, 4], [0, 2], [2, 2], [2, 4], [0, 4]]]]);   /* merged into one rectangle */
  const fc = FLOODSIM.frameCollection(cls, w, h, [0, 0, 6, 4]);
  assert.deepEqual(fc.features.map(f => f.properties.k), [2, 4]);
  const noisy = Uint8Array.from({length: 300 * 300}, (_, i) => ((i * 7919) % 5 === 0 ? 1 : 0));
  const big = FLOODSIM.frameCollection(noisy, 300, 300, [3, 6, 3.1, 6.1]);
  assert.ok(JSON.stringify(big).length <= 180000);
});

test("rain falls as a triangle that adds up to the storm total", () => {
  let sum = 0;
  for (let t = 0; t < 6 * 3600; t += 10) sum += FLOODSIM.rainRate(120, 6, t + 5) * 10;
  close(sum * 1000, 120, 1e-3);
  assert.equal(FLOODSIM.rainRate(120, 6, 7 * 3600), 0);
  /* the per-step amounts are exact, even for uneven steps that straddle the peak */
  const cuts = [0, 1234.5, 10799, 10801, 15000, 21599.9, 21600, 30000];
  let total = 0;
  for (let k = 1; k < cuts.length; k++) total += FLOODSIM.rainDepth(120, 6, cuts[k - 1], cuts[k]);
  close(total * 1000, 120, 1e-12);
  close(FLOODSIM.rainDepth(120, 6, 0, 3 * 3600) * 1000, 60, 1e-12);   /* half before the peak */
  close(FLOODSIM.rainDepth(120, 6, 10799, 10801), FLOODSIM.rainRate(120, 6, 10800) * 2, 1e-6);
  assert.equal(FLOODSIM.rainDepth(120, 6, 6 * 3600, 9 * 3600), 0);
});
