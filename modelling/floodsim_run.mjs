/* Runs FLOODSIM, the in-browser flood model (src/features/floodsim.js), on a grid given as JSON, for the comparison
   with SFINCS (opentracker_model/benchmark.py). It imports the very module the browser runs, not a copy.
   Usage: node modelling/floodsim_run.mjs input.json output.json
   input:  {dem: [w*h heights, row by row], w, h, cell, rainMm, stormHours, hours, runoff, manning, seaLevel}
   output: {fixed: [w*h: 0 land, 1 sea, 2 river], frames: [{t, depth: [w*h, metres, 1 mm steps]}], balance} */
import fs from "node:fs";
import {FLOODSIM} from "../src/features/floodsim.js";

const [input, output, ...extra] = process.argv.slice(2);
if (!input || !output || extra.length) throw new Error("usage: node modelling/floodsim_run.mjs input.json output.json");
const spec = JSON.parse(fs.readFileSync(input, "utf8"));
const run = FLOODSIM.runAll({...spec, dem: Float64Array.from(spec.dem)});
const mm = a => Array.from(a, v => Math.round(v * 1000) / 1000);
fs.writeFileSync(output, JSON.stringify({fixed: Array.from(run.fixed), frames: run.frames.map(f => ({t: f.t, depth: mm(f.depth)})), balance: run.balance()}));
