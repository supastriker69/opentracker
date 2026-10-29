/* ===== Map: MapLibre with bundled open data (world outlines, rivers, lakes) everywhere, plus — in the public web app —
   OpenStreetMap streets and 3D buildings (OpenFreeMap vector tiles) and 3D ground (Terrarium elevation tiles) ===== */
const MAPV = {map: null, el: null, ready: false, failed: false, onPick: null, onPickPlace: null, last: null, marker: null, basemap: false, glyphs: false, projBox: null};
const cssv = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
/* street map and ground-height sources: only the web app has them (claude.ai pages can't load outside data) */
const mapCfg = () => (window.WEBAPP && typeof window.WEBAPP.mapConfig === "function" ? window.WEBAPP.mapConfig() : null);
const heatColor = lv => cssv("--heat-" + Math.max(0, Math.min(4, lv | 0)));
const floodColor = lv => cssv(lv === "warning" ? "--flood-warning" : "--flood-watch");

function levelColor(lv) { return cssv({low: "--low", med: "--med", high: "--high", vhigh: "--vhigh"}[lv] || "--none"); }

function drawIcon(kind, color) {
  const s = 64, c = document.createElement("canvas"); c.width = c.height = s;
  const g = c.getContext("2d");
  g.lineWidth = 5; g.strokeStyle = "#ffffff"; g.fillStyle = color;
  const path = () => { g.fill(); g.stroke(); };
  g.beginPath();
  if (kind === "low") { g.arc(32, 32, 24, 0, Math.PI * 2); path(); }
  else if (kind === "med") { g.moveTo(32, 6); g.lineTo(58, 54); g.lineTo(6, 54); g.closePath(); path(); }
  else if (kind === "high") { g.moveTo(32, 4); g.lineTo(60, 32); g.lineTo(32, 60); g.lineTo(4, 32); g.closePath(); path(); }
  else if (kind === "vhigh") { const r = 27; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(32 + r * Math.cos(a), 32 + r * Math.sin(a)); } g.closePath(); path(); }
  else if (kind === "safe") { g.roundRect ? g.roundRect(8, 8, 48, 48, 10) : g.rect(8, 8, 48, 48); path(); g.beginPath(); g.fillStyle = "#fff"; g.fillRect(28, 16, 8, 32); g.fillRect(16, 28, 32, 8); }
  else if (kind === "road") { g.arc(32, 32, 25, 0, Math.PI * 2); path(); g.fillStyle = "#fff"; g.fillRect(16, 27, 32, 10); }
  else if (kind === "dam") { g.moveTo(10, 50); g.lineTo(20, 14); g.lineTo(44, 14); g.lineTo(54, 50); g.closePath(); path(); }
  return g.getImageData(0, 0, s, s);
}
function addIcons(force) {
  const m = MAPV.map;
  const set = {low: levelColor("low"), med: levelColor("med"), high: levelColor("high"), vhigh: levelColor("vhigh"), safe: cssv("--low"), road: cssv("--vhigh"), dam: cssv("--accent")};
  Object.entries(set).forEach(([k, col]) => {
    const img = drawIcon(k, col);
    if (m.hasImage("i-" + k)) { if (force) m.updateImage("i-" + k, img); }
    else m.addImage("i-" + k, img, {pixelRatio: 2});
  });
}
function hexPoly(ll, rkm) {
  const [lon, lat] = ll, out = [];
  const dLat = rkm / 110.574, dLon = rkm / (111.32 * Math.cos(lat * Math.PI / 180));
  for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; out.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]); }
  return [out];
}
/* depth classes 1–4 from light to deep blue; satellite water in one strong blue */
function replayColor(kind) {
  return kind === "satellite" ? cssv("--water-sat") : ["match", ["get", "k"], 1, cssv("--water-1"), 2, cssv("--water-2"), 3, cssv("--water-3"), 4, cssv("--water-4"), cssv("--water-2")];
}
function mapReplay(fc, kind) {
  const m = MAPV.map; if (!m || !MAPV.ready) return;
  MAPV.replayKind = kind;
  m.getSource("replay").setData(fc);
  m.setPaintProperty("replayFill", "fill-color", replayColor(kind));
  m.setPaintProperty("replayFill", "fill-opacity", kind === "satellite" ? .55 : .78);
}
function circlePoly(ll, rkm) {
  const [lon, lat] = ll, out = [];
  const dLat = rkm / 110.574, dLon = rkm / (111.32 * Math.cos(lat * Math.PI / 180));
  for (let i = 0; i <= 48; i++) { const a = i * Math.PI / 24; out.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]); }
  return [out];
}
const FC = features => ({type: "FeatureCollection", features});
const PT = (ll, props) => ({type: "Feature", geometry: {type: "Point", coordinates: ll}, properties: props});

function paintTheme() {
  const m = MAPV.map; if (!m || !MAPV.ready) return;
  m.setPaintProperty("bg", "background-color", cssv("--sea"));
  m.setPaintProperty("worldLand", "fill-color", cssv("--land"));
  m.setPaintProperty("worldLine", "line-color", cssv("--border-line"));
  m.setPaintProperty("land", "fill-color", cssv("--land"));
  if (MAPV.basemap) basemapPaint();
  m.setPaintProperty("borders", "line-color", cssv("--border-line"));
  m.setPaintProperty("admin", "line-color", cssv("--border-line"));
  m.setPaintProperty("lakes", "fill-color", cssv("--sea"));
  m.setPaintProperty("rivers", "line-color", cssv("--water-line"));
  m.setPaintProperty("past", "circle-color", cssv("--accent"));
  m.setPaintProperty("past", "circle-stroke-color", cssv("--surface"));
  m.setPaintProperty("sel", "circle-stroke-color", cssv("--fg"));
  m.setPaintProperty("replayFill", "fill-color", replayColor(MAPV.replayKind || "model"));
  m.setPaintProperty("replayLine", "line-color", cssv("--water-4"));
  addIcons(true);
  if (MAPV.last) mapUpdate(MAPV.last, false);
}

function mapMount(holder, opts) {
  if (!holder) return;
  if (!MAPV.el) { MAPV.el = document.createElement("div"); MAPV.el.id = "map-canvas"; MAPV.el.style.cssText = "position:absolute;inset:0"; }
  holder.replaceWith(MAPV.el);
  if (MAPV.failed) { MAPV.el.innerHTML = `<div class="mapmsg">The map cannot be shown on this device. The list below shows the same areas.</div>`; return; }
  if (!MAPV.map) {
    if (!window.maplibregl) { MAPV.failed = true; MAPV.el.innerHTML = `<div class="mapmsg">The map could not load. The list below shows the same areas.</div>`; return; }
    try {
      MAPV.map = new maplibregl.Map({
        container: MAPV.el, attributionControl: false, maxPitch: 75, center: [3, 8], zoom: 4.6, minZoom: 1, maxZoom: 17,
        style: Object.assign({version: 8, sources: {}, layers: [{id: "bg", type: "background", paint: {"background-color": cssv("--sea")}}]}, mapCfg()?.glyphs ? {glyphs: mapCfg().glyphs} : {})
      });
    } catch (e) { MAPV.failed = true; MAPV.el.innerHTML = `<div class="mapmsg">The map cannot be shown on this device. The list below shows the same areas.</div>`; return; }
    const m = MAPV.map;
    m.on("error", () => {});
    m.on("load", () => {
      MAPV.glyphs = !!mapCfg()?.glyphs;
      m.addSource("world", {type: "geojson", data: GEO.world});
      m.addLayer({id: "worldLand", type: "fill", source: "world", paint: {"fill-color": cssv("--land")}});
      m.addLayer({id: "worldHeat", type: "fill", source: "world", layout: {visibility: "none"}, paint: {"fill-color": cssv("--land"), "fill-opacity": .85}});
      m.addLayer({id: "worldLine", type: "line", source: "world", paint: {"line-color": cssv("--border-line"), "line-width": .6}});
      m.addSource("countries", {type: "geojson", data: GEO.countries});
      m.addSource("admin", {type: "geojson", data: GEO.adminlines});
      m.addSource("rivers", {type: "geojson", data: GEO.rivers});
      m.addSource("lakes", {type: "geojson", data: GEO.lakes});
      ["hot", "hexL", "hexS", "past", "safe", "roads", "dams", "sel", "reach", "replay", "heatReach", "heatTowns", "floodReach"].forEach(id => m.addSource(id, {type: "geojson", data: FC([])}));
      m.addLayer({id: "land", type: "fill", source: "countries", maxzoom: 9, paint: {"fill-color": cssv("--land")}});
      m.addLayer({id: "lakes", type: "fill", source: "lakes", paint: {"fill-color": cssv("--sea")}});
      m.addLayer({id: "rivers", type: "line", source: "rivers", paint: {"line-color": cssv("--water-line"), "line-width": ["interpolate", ["linear"], ["zoom"], 4, .8, 9, 2.2]}});
      m.addLayer({id: "admin", type: "line", source: "admin", paint: {"line-color": cssv("--border-line"), "line-width": .8, "line-dasharray": [3, 2]}});
      m.addLayer({id: "borders", type: "line", source: "countries", paint: {"line-color": cssv("--border-line"), "line-width": 1.4}});
      /* outlook: how far water can spread around each area */
      /* replays: water from the flood model (by depth) or seen by satellite */
      m.addLayer({id: "replayFill", type: "fill", source: "replay", paint: {"fill-color": replayColor("model"), "fill-opacity": .78}});
      m.addLayer({id: "replayLine", type: "line", source: "replay", paint: {"line-color": cssv("--water-4"), "line-width": .6, "line-opacity": .6}});
      /* projected reach of heat (warm discs around each town) and floods (blue discs, official warning areas) */
      m.addLayer({id: "heatReach", type: "fill", source: "heatReach", paint: {"fill-color": ["get", "color"], "fill-opacity": .32}});
      m.addLayer({id: "floodReach", type: "fill", source: "floodReach", paint: {"fill-color": ["get", "color"], "fill-opacity": .22}});
      m.addLayer({id: "floodReachLine", type: "line", source: "floodReach", paint: {"line-color": ["get", "color"], "line-width": 1.6, "line-dasharray": [2, 1]}});
      m.addLayer({id: "heatTowns", type: "circle", source: "heatTowns", paint: {"circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 6, 5, 10, 8], "circle-stroke-width": 1.2, "circle-stroke-color": cssv("--surface")}});
      m.addLayer({id: "reach", type: "fill", source: "reach", paint: {"fill-color": ["get", "color"], "fill-opacity": .16}});
      m.addLayer({id: "reachLine", type: "line", source: "reach", paint: {"line-color": ["get", "color"], "line-width": 1.2, "line-opacity": .7}});
      m.addLayer({id: "hexL", type: "fill-extrusion", source: "hexL", maxzoom: 8.5, layout: {visibility: "none"}, paint: {"fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "hL"], "fill-extrusion-opacity": .88}});
      m.addLayer({id: "hexS", type: "fill-extrusion", source: "hexS", minzoom: 8.5, layout: {visibility: "none"}, paint: {"fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "hS"], "fill-extrusion-opacity": .88}});
      m.addLayer({id: "past", type: "circle", source: "past", layout: {visibility: "none"}, paint: {"circle-color": cssv("--accent"), "circle-opacity": ["get", "op"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["+", 4, ["*", 1.5, ["get", "n"]]], 11, ["+", 10, ["*", 3, ["get", "n"]]]], "circle-stroke-width": 1.5, "circle-stroke-color": cssv("--surface")}});
      m.addLayer({id: "sel", type: "circle", source: "sel", paint: {"circle-radius": 22, "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 3, "circle-stroke-color": cssv("--fg")}});
      const iconLayer = (id, src) => m.addLayer({id, type: "symbol", source: src, layout: {"icon-image": ["get", "icon"], "icon-allow-overlap": true, "icon-ignore-placement": true, "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .5, 8, .75, 12, 1], "symbol-sort-key": ["get", "rank"]}});
      iconLayer("dams", "dams"); iconLayer("roads", "roads"); iconLayer("safe", "safe"); iconLayer("hot", "hot");
      addIcons(false);
      m.on("click", "heatTowns", e => { const id = e.features?.[0]?.properties?.id; if (id && MAPV.onPickPlace) MAPV.onPickPlace(id); });
      m.on("click", "worldHeat", e => { const c = e.features?.[0]?.properties?.c; if (c && MAPV.onPickCountry) MAPV.onPickCountry(c); });
      ["heatTowns", "worldHeat"].forEach(l => { m.on("mouseenter", l, () => m.getCanvas().style.cursor = "pointer"); m.on("mouseleave", l, () => m.getCanvas().style.cursor = ""); });
      ["hot", "hexS", "hexL"].forEach(l => {
        m.on("click", l, e => { const id = e.features?.[0]?.properties?.id; if (id && MAPV.onPick) MAPV.onPick(id); });
        m.on("mouseenter", l, () => m.getCanvas().style.cursor = "pointer");
        m.on("mouseleave", l, () => m.getCanvas().style.cursor = "");
      });
      MAPV.ready = true;
      if (MAPV.last) mapUpdate(MAPV.last, true);
    });
  } else {
    requestAnimationFrame(() => MAPV.map && MAPV.map.resize());
  }
}

/* view: {hot:[{h,r}], past:[{h,n,year}], safe:[], roads:[], dams:[], show:'risk'|..., three, sel, fit} */
function mapUpdate(view, fit) {
  MAPV.last = view;
  const m = MAPV.map; if (!m || !MAPV.ready) return;
  const hot = view.show === "risk" ? view.hot : [];
  m.getSource("hot").setData(FC(hot.map(({h, r}) => PT(h.ll, {id: h.id, icon: "i-" + r.level, rank: -LVL_RANK[r.level]}))));
  const three = !!view.three && view.show === "risk";
  const hexF = (rk, key, scale) => FC(hot.map(({h, r}) => ({type: "Feature", geometry: {type: "Polygon", coordinates: hexPoly(h.ll, rk)}, properties: {id: h.id, color: levelColor(r.level), [key]: 200 + Math.min(1.5, r.score) * scale}})));
  if (view.show !== "replay") m.getSource("replay").setData(FC([]));   /* replay screens and past years draw their own */
  m.getSource("reach").setData(FC((view.show === "risk" ? view.reach || [] : []).map(x => ({type: "Feature", geometry: {type: "Polygon", coordinates: circlePoly(x.ll, x.km)}, properties: {color: levelColor(x.level)}}))));
  m.getSource("hexL").setData(hexF(5, "hL", 90000));
  m.getSource("hexS").setData(hexF(.55, "hS", 4000));
  ["hexL", "hexS"].forEach(l => m.setLayoutProperty(l, "visibility", three ? "visible" : "none"));
  m.setLayoutProperty("hot", "visibility", view.show === "risk" && !three ? "visible" : "none");
  m.getSource("past").setData(FC((view.show === "past" ? view.past : []).map(p => PT(p.h.ll, {id: p.h.id, n: Math.min(6, p.n), op: p.recent}))));
  m.setLayoutProperty("past", "visibility", view.show === "past" ? "visible" : "none");
  m.getSource("safe").setData(FC((view.show === "safe" ? view.safe : []).map(s => PT(s.ll, {icon: "i-safe", rank: 0}))));
  m.getSource("roads").setData(FC((view.show === "roads" ? view.roads : []).map(s => PT(s.ll, {icon: "i-road", rank: 0}))));
  m.getSource("dams").setData(FC((view.dams || []).map(d => PT(d.ll, {icon: "i-dam", rank: 1}))));
  m.getSource("sel").setData(FC(view.sel ? [PT(view.sel.ll, {})] : []));
  if (MAPV.marker) { MAPV.marker.remove(); MAPV.marker = null; }
  if (view.sel && window.maplibregl) {
    const d = document.createElement("div"); d.className = "mk"; d.textContent = view.sel.n;
    MAPV.marker = new maplibregl.Marker({element: d, anchor: "bottom"}).setLngLat(view.sel.ll).addTo(m);
  }
  mapHazards(view);
  mapStreets(view);
  const pitch = view.terrain ? 60 : three ? (view.pitch ?? 55) : 0;
  if (fit && view.fit) {
    const f = view.fit;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (f.bounds && (f.bounds[1][0] - f.bounds[0][0] > .02 || f.bounds[1][1] - f.bounds[0][1] > .02)) m.fitBounds(f.bounds, {padding: 60, maxZoom: f.maxZoom || 12, pitch, bearing: three ? -12 : 0, duration: reduce ? 0 : 900});
    else m.easeTo({center: f.ll, zoom: f.z, pitch, bearing: three ? -12 : 0, duration: reduce ? 0 : 900});
  } else if (m.getPitch() !== pitch) m.easeTo({pitch, bearing: three ? -12 : 0, duration: 500});
}
function mapZoom(d) { if (MAPV.map) MAPV.map.zoomTo(MAPV.map.getZoom() + d, {duration: 300}); }
function mapFly(ll, z) { if (MAPV.map) MAPV.map.easeTo({center: ll, zoom: z, duration: 800}); }

/* ---------- projected reach of heat and floods ---------- */
/* view.world: {CC: heat level}; view.heatTowns: [{id, ll, level, pop}]; view.floodSigns: [{ll, km, bbox, level, areas}] */
function mapHazards(view) {
  const m = MAPV.map;
  const world = view.world || null;
  m.setLayoutProperty("worldHeat", "visibility", world ? "visible" : "none");
  m.setLayoutProperty("land", "visibility", world ? "none" : "visible");   /* the detailed West African layer would cover the colours */
  if (world) {
    const pairs = Object.entries(world).filter(([, lv]) => Number.isFinite(lv)).flatMap(([c, lv]) => [c, heatColor(lv)]);
    m.setPaintProperty("worldHeat", "fill-color", pairs.length ? ["match", ["get", "c"], ...pairs, cssv("--land")] : cssv("--land"));
  }
  const towns = view.heatTowns || [];
  m.getSource("heatTowns").setData(FC(towns.map(t => PT(t.ll, {id: t.id, color: heatColor(t.level)}))));
  m.getSource("heatReach").setData(FC(towns.filter(t => t.level >= 2).map(t => ({type: "Feature", geometry: {type: "Polygon", coordinates: circlePoly(t.ll, heatReachKm(t.level, t.pop))}, properties: {color: heatColor(t.level)}}))));
  const shapes = [];
  for (const s of view.floodSigns || []) {
    const props = {color: floodColor(s.level)};
    if (s.alert) {
      for (const a of s.alert.areas || []) {
        (a.polygons || []).forEach(r => shapes.push({type: "Feature", geometry: {type: "Polygon", coordinates: [r]}, properties: props}));
        (a.circles || []).forEach(c => shapes.push({type: "Feature", geometry: {type: "Polygon", coordinates: circlePoly(c.ll, Math.max(1, c.km))}, properties: props}));
      }
    } else if (s.bbox && s.kind === "disaster") {
      const [w, so, e, n] = s.bbox;
      shapes.push({type: "Feature", geometry: {type: "Polygon", coordinates: [[[w, so], [e, so], [e, n], [w, n], [w, so]]]}, properties: props});
    } else if (s.ll) shapes.push({type: "Feature", geometry: {type: "Polygon", coordinates: circlePoly(s.ll, s.km || 15)}, properties: props});
  }
  m.getSource("floodReach").setData(FC(shapes));
}

/* ---------- streets, 3D buildings and 3D ground (web app) ---------- */
function addBasemap() {
  const cfg = mapCfg(), m = MAPV.map;
  if (!cfg || !cfg.tiles || MAPV.basemap) return;
  const before = m.getLayer("replayFill") ? "replayFill" : undefined;
  m.addSource("omt", {type: "vector", url: cfg.tiles, attribution: "© OpenStreetMap contributors · OpenMapTiles · OpenFreeMap"});
  m.addLayer({id: "omtLanduse", type: "fill", source: "omt", "source-layer": "landcover", minzoom: 10, paint: {"fill-color": cssv("--land-dim"), "fill-opacity": .5}}, before);
  m.addLayer({id: "omtWater", type: "fill", source: "omt", "source-layer": "water", minzoom: 8, paint: {"fill-color": cssv("--sea")}}, before);
  m.addLayer({id: "omtWaterway", type: "line", source: "omt", "source-layer": "waterway", minzoom: 10, paint: {"line-color": cssv("--water-line"), "line-width": ["match", ["get", "class"], "river", 2.4, 1]}}, before);
  m.addLayer({id: "omtRoads", type: "line", source: "omt", "source-layer": "transportation", minzoom: 10, paint: {"line-color": cssv("--surface"), "line-width": ["interpolate", ["linear"], ["zoom"], 10, .4, 15, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 5, 2]]}}, before);
  m.addLayer({id: "omtBuildings", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 13,
    paint: {"fill-extrusion-color": cssv("--building"), "fill-extrusion-height": ["coalesce", ["get", "render_height"], 4], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": .9}}, "heatTowns");   /* above the water and reach discs, below markers */
  if (MAPV.glyphs) {
    m.addLayer({id: "omtPlaces", type: "symbol", source: "omt", "source-layer": "place", minzoom: 9,
      layout: {"text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": ["match", ["get", "class"], ["city", "town"], 14, 12]},
      paint: {"text-color": cssv("--fg"), "text-halo-color": cssv("--surface"), "text-halo-width": 1.5}});
    m.addLayer({id: "omtStreetNames", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 14,
      layout: {"symbol-placement": "line", "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11},
      paint: {"text-color": cssv("--muted"), "text-halo-color": cssv("--surface"), "text-halo-width": 1.2}});
  }
  if (cfg.terrain) {
    m.addSource("dem", {type: "raster-dem", tiles: [cfg.terrain], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Ground heights: AWS Terrain Tiles (SRTM, GMTED2010, ETOPO1, 3DEP, EU-DEM)"});
    m.addLayer({id: "hillshade", type: "hillshade", source: "dem", minzoom: 9, paint: {"hillshade-exaggeration": .35, "hillshade-shadow-color": cssv("--hill")}}, before);
  }
  MAPV.basemap = true;
}
const BASEMAP_LAYERS = ["omtLanduse", "omtWater", "omtWaterway", "omtRoads", "omtBuildings", "omtPlaces", "omtStreetNames", "hillshade"];
function basemapPaint() {
  const m = MAPV.map, set = (l, k, v) => { if (m.getLayer(l)) m.setPaintProperty(l, k, v); };
  set("omtLanduse", "fill-color", cssv("--land-dim")); set("omtWater", "fill-color", cssv("--sea")); set("omtWaterway", "line-color", cssv("--water-line"));
  set("omtRoads", "line-color", cssv("--surface")); set("omtBuildings", "fill-extrusion-color", cssv("--building"));
  set("omtPlaces", "text-color", cssv("--fg")); set("omtPlaces", "text-halo-color", cssv("--surface"));
  set("omtStreetNames", "text-color", cssv("--muted")); set("omtStreetNames", "text-halo-color", cssv("--surface"));
  set("hillshade", "hillshade-shadow-color", cssv("--hill"));
}
/* view.streets: show the street map; view.terrain: 3D ground */
function mapStreets(view) {
  const m = MAPV.map;
  if (view.streets) addBasemap();
  if (!MAPV.basemap) return;
  BASEMAP_LAYERS.forEach(l => { if (m.getLayer(l)) m.setLayoutProperty(l, "visibility", view.streets ? "visible" : "none"); });
  const want = !!(view.terrain && m.getSource("dem"));
  try { m.setTerrain(want ? {source: "dem", exaggeration: 1.4} : null); } catch (e) { /* older devices: stay flat */ }
}
/* the projected water for one hour, laid over the ground; null removes it */
function mapProjection(url, bbox) {
  const m = MAPV.map; if (!m || !MAPV.ready) return;
  if (!url) { if (m.getLayer("projImg")) m.setLayoutProperty("projImg", "visibility", "none"); return; }
  const coordinates = [[bbox[0], bbox[3]], [bbox[2], bbox[3]], [bbox[2], bbox[1]], [bbox[0], bbox[1]]];
  const src = m.getSource("proj");
  if (src) src.updateImage({url, coordinates});
  else {
    m.addSource("proj", {type: "image", url, coordinates});
    m.addLayer({id: "projImg", type: "raster", source: "proj", paint: {"raster-opacity": .82, "raster-fade-duration": 0, "raster-resampling": "nearest"}}, m.getLayer("omtBuildings") ? "omtBuildings" : "replayFill");
  }
  m.setLayoutProperty("projImg", "visibility", "visible");
}
/* features from the street map's loaded tiles inside a box */
function inBox(ll, b) { return ll[0] >= b[0] && ll[0] <= b[2] && ll[1] >= b[1] && ll[1] <= b[3]; }
function mapWaterways(bbox) {
  const m = MAPV.map; if (!m || !m.getSource("omt")) return [];
  const lines = [];
  for (const f of m.querySourceFeatures("omt", {sourceLayer: "waterway"})) {
    if (!["river", "canal"].includes(f.properties.class)) continue;
    const g = f.geometry, parts = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    parts.forEach(p => { if (p.some(ll => inBox(ll, bbox))) lines.push(p); });
  }
  return lines;
}
function mapBuildings(bbox) {
  const m = MAPV.map; if (!m || !m.getSource("omt")) return [];
  const seen = new Set(), out = [];
  for (const f of m.querySourceFeatures("omt", {sourceLayer: "building"})) {
    const g = f.geometry, ring = g.type === "Polygon" ? g.coordinates[0] : g.type === "MultiPolygon" ? g.coordinates[0][0] : null;
    if (!ring || !ring.length) continue;
    const ll = [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
    const key = f.id !== undefined ? "i" + f.id : ll[0].toFixed(6) + "," + ll[1].toFixed(6);   /* a building cut by tile edges counts once */
    if (seen.has(key) || !inBox(ll, bbox)) continue;
    seen.add(key); out.push(ll);
  }
  return out;
}

/* theme follow *//* theme follow */
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => setTimeout(paintTheme, 50));
new MutationObserver(() => setTimeout(paintTheme, 50)).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
