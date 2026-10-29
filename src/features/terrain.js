/* ===== Ground heights for flood projections =====
   Terrarium elevation tiles (AWS Terrain Tiles: SRTM, Copernicus/EU-DEM, 3DEP and others; heights in metres coded
   in the red, green and blue of each pixel). Read in the public web app only: claude.ai pages cannot load data
   from other sites. Zoom 13 gives about 19 m pixels at the equator, resampled to the model's grid. */
const TERRAIN = (() => {
  const Z = 13, SIZE = 256, KEEP = 64;
  const cache = new Map();   /* "x/y" -> Promise<Float32Array> */

  /* fractional tile coordinates of a point at zoom z (Web Mercator) */
  function tileXY(lon, lat, z) {
    const n = 2 ** z, r = lat * Math.PI / 180;
    return [(lon + 180) / 360 * n, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n];
  }
  const decode = (r, g, b) => r * 256 + g + b / 256 - 32768;

  async function pixels(blob) {
    const img = await createImageBitmap(blob);
    const canvas = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(SIZE, SIZE) : Object.assign(document.createElement("canvas"), {width: SIZE, height: SIZE});
    const g = canvas.getContext("2d", {willReadFrequently: true});
    g.drawImage(img, 0, 0, SIZE, SIZE);
    return g.getImageData(0, 0, SIZE, SIZE).data;
  }
  function tile(tmpl, x, y) {
    const n = 2 ** Z, key = `${((x % n) + n) % n}/${y}`;
    if (!cache.has(key)) {
      const url = tmpl.replace("{z}", Z).replace("{x}", ((x % n) + n) % n).replace("{y}", y);
      const p = fetch(url, {mode: "cors", credentials: "omit"}).then(async r => {
        if (!r.ok) throw new Error(`ground-height tile answered ${r.status}`);
        const px = await pixels(await r.blob()), out = new Float32Array(SIZE * SIZE);
        for (let i = 0; i < out.length; i++) out[i] = decode(px[4 * i], px[4 * i + 1], px[4 * i + 2]);
        return out;
      });
      p.catch(() => cache.delete(key));
      cache.set(key, p);
      if (cache.size > KEEP) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }

  /* A square grid of ground heights around a point: halfKm each way, cells of about cellM metres.
     Returns {dem, w, h, cell, bbox: [west, south, east, north], index(ll)}. */
  async function grid(tmpl, center, halfKm, cellM) {
    const [lon, lat] = center;
    const dLat = halfKm / 110.574, dLon = halfKm / (111.32 * Math.cos(lat * Math.PI / 180));
    const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
    const n = Math.max(20, Math.round(2 * halfKm * 1000 / cellM));
    const [fx0, fy0] = tileXY(bbox[0], bbox[3], Z), [fx1, fy1] = tileXY(bbox[2], bbox[1], Z);
    const tiles = new Map();
    const jobs = [];
    for (let ty = Math.floor(fy0); ty <= Math.floor(fy1); ty++) for (let tx = Math.floor(fx0); tx <= Math.floor(fx1); tx++) {
      jobs.push(tile(tmpl, tx, ty).then(t => tiles.set(`${tx}/${ty}`, t)));
    }
    if (jobs.length > 25) throw new Error("That area is too large.");
    await Promise.all(jobs);
    const at = (px, py) => {   /* one pixel by global pixel coordinates */
      const tx = Math.floor(px / SIZE), ty = Math.floor(py / SIZE);
      const t = tiles.get(`${tx}/${ty}`);
      return t ? t[(py - ty * SIZE) * SIZE + (px - tx * SIZE)] : 0;
    };
    const dem = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      const la = bbox[3] - (j + 0.5) * (bbox[3] - bbox[1]) / n;
      for (let i = 0; i < n; i++) {
        const lo = bbox[0] + (i + 0.5) * (bbox[2] - bbox[0]) / n;
        const [tx, ty] = tileXY(lo, la, Z);
        const px = tx * SIZE - 0.5, py = ty * SIZE - 0.5, x0 = Math.floor(px), y0 = Math.floor(py), ax = px - x0, ay = py - y0;
        dem[j * n + i] = (at(x0, y0) * (1 - ax) + at(x0 + 1, y0) * ax) * (1 - ay) + (at(x0, y0 + 1) * (1 - ax) + at(x0 + 1, y0 + 1) * ax) * ay;
      }
    }
    const index = ll => {
      const i = Math.floor((ll[0] - bbox[0]) / (bbox[2] - bbox[0]) * n), j = Math.floor((bbox[3] - ll[1]) / (bbox[3] - bbox[1]) * n);
      return i >= 0 && i < n && j >= 0 && j < n ? j * n + i : -1;
    };
    return {dem, w: n, h: n, cell: 2 * halfKm * 1000 / n, bbox, index};
  }

  /* river cells from map lines ([[lon, lat], …] lists): every grid cell each line passes through */
  function lineCells(g, lines) {
    const out = new Set(), [W, S, E, N] = g.bbox;
    const toGrid = ([lo, la]) => [(lo - W) / (E - W) * g.w, (N - la) / (N - S) * g.h];
    for (const line of lines) {
      for (let k = 1; k < line.length; k++) {
        const [x0, y0] = toGrid(line[k - 1]), [x1, y1] = toGrid(line[k]);
        const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
        for (let s = 0; s <= steps; s++) {
          const x = Math.floor(x0 + (x1 - x0) * s / steps), y = Math.floor(y0 + (y1 - y0) * s / steps);
          if (x >= 0 && x < g.w && y >= 0 && y < g.h) out.add(y * g.w + x);
        }
      }
    }
    return [...out];
  }

  return {grid, lineCells, tileXY, decode};
})();
