// Open Tracker: flood outlines from Sentinel-1 radar (sees through cloud), by change detection.
// Method after the UN-SPIDER Recommended Practice "Flood mapping and damage assessment using Sentinel-1 SAR data
// in Google Earth Engine": compare radar after the flood with radar before it; water darkens the image.
//
// How to use: open https://code.earthengine.google.com, paste this script, set AREA, BEFORE and AFTER_DATES
// (see satellite/events.yml), Run, then Tasks → Run each export. Download the GeoJSON files from Google Drive and
// make the replay:  python satellite/prepare_extent.py --id ... 2026-06-30=opentracker_flood_2026-06-30.geojson ...

var AREA = ee.Geometry.Rectangle([-0.36, 5.50, -0.05, 5.75]);          // Accra; west, south, east, north
var BEFORE = ['2026-06-01', '2026-06-25'];                            // dry reference period
var AFTER_DATES = ['2026-06-30', '2026-07-06', '2026-07-12'];          // one outline per date (each takes 6 days of images)
var POLARIZATION = 'VH';             // VH is most sensitive to open water
var PASS = 'DESCENDING';             // keep one viewing direction so images compare fairly
var RATIO_THRESHOLD = 1.25;          // after/before ratio above this = newly flooded (UN-SPIDER default)
var SMOOTHING_M = 50;                // speckle filter radius, metres

var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', POLARIZATION))
  .filter(ee.Filter.eq('orbitProperties_pass', PASS))
  .filter(ee.Filter.eq('resolution_meters', 10))
  .filterBounds(AREA)
  .select(POLARIZATION);

var before = s1.filterDate(BEFORE[0], BEFORE[1]).mosaic().clip(AREA).focal_mean(SMOOTHING_M, 'circle', 'meters');

// water that is always there (sea, lagoons, rivers) is not a flood
var permanentWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('seasonality').gte(10).unmask(0).clip(AREA);
// floods don't sit on steep slopes
var slope = ee.Terrain.slope(ee.Image('WWF/HydroSHEDS/03VFDEM')).clip(AREA);

function floodOn(dateText) {
  var start = ee.Date(dateText), end = start.advance(6, 'day');
  var after = s1.filterDate(start, end).mosaic().clip(AREA).focal_mean(SMOOTHING_M, 'circle', 'meters');
  var flooded = after.divide(before).gt(RATIO_THRESHOLD)
    .updateMask(permanentWater.not())
    .updateMask(slope.lt(5));
  flooded = flooded.updateMask(flooded.connectedPixelCount(25, true).gte(8)).selfMask().rename('water');
  return flooded;
}

AFTER_DATES.forEach(function (d) {
  var flooded = floodOn(d);
  Map.addLayer(flooded, {palette: ['1a73e8']}, 'Flooded ' + d);
  var outlines = flooded.reduceToVectors({geometry: AREA, scale: 20, geometryType: 'polygon', eightConnected: true, maxPixels: 1e10, bestEffort: true});
  Export.table.toDrive({collection: outlines, description: 'opentracker_flood_' + d, fileFormat: 'GeoJSON'});
});
Map.centerObject(AREA, 11);
