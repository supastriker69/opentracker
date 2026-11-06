"use strict";
/* Writes Brotli (.br) and gzip (.gz) copies of the text files in a folder, at the highest settings, so the server
   sends the smallest form a browser accepts without compressing anything per request (lib/http.js serveStatic).
   Run by tools/build.py and when the Docker image is built:   node lib/precompress.js public */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const TEXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".webmanifest", ".svg", ".txt"]);
const MIN_BYTES = 1024;   /* smaller files gain nothing worth a second request path */

function precompress(dir) {
  let files = 0, before = 0, after = 0;
  const walk = d => fs.readdirSync(d, {withFileTypes: true}).forEach(e => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) return walk(f);
    if (!TEXT.has(path.extname(f).toLowerCase())) return;
    const data = fs.readFileSync(f);
    if (data.length < MIN_BYTES) return;
    const br = zlib.brotliCompressSync(data, {params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length,
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT}});
    fs.writeFileSync(f + ".br", br);
    fs.writeFileSync(f + ".gz", zlib.gzipSync(data, {level: 9}));
    files++; before += data.length; after += br.length;
  });
  walk(dir);
  return {files, before, after};
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir || !fs.statSync(dir, {throwIfNoEntry: false})?.isDirectory()) { console.error("usage: node lib/precompress.js <folder>"); process.exit(1); }
  const r = precompress(path.resolve(dir));
  console.log(`compressed ${r.files} files: ${(r.before / 1024).toFixed(0)} KB → ${(r.after / 1024).toFixed(0)} KB with Brotli`);
}
module.exports = {precompress};
