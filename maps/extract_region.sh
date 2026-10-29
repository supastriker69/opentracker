#!/usr/bin/env sh
# Self-hosted 3D map data for one region: the street map and the buildings with heights, as PMTiles files that
# MapLibre reads straight from object storage or a CDN (no tile server).
#
#   PLANET_URL=<a daily Protomaps planet build, see maps.protomaps.com/builds> \
#     sh maps/extract_region.sh lagos 3.10,6.35,3.70,6.75
#
# Needs: pmtiles (github.com/protomaps/go-pmtiles), overturemaps (pip install overturemaps), ogr2ogr (GDAL),
#        tippecanoe (github.com/felt/tippecanoe). Output goes to maps/out/<name>/.
set -eu
NAME="${1:?region name, e.g. lagos}"
BBOX="${2:?west,south,east,north}"
: "${PLANET_URL:?set PLANET_URL to a Protomaps planet build}"
echo "$NAME" | grep -Eq '^[a-z0-9-]{2,40}$' || { echo "name: lowercase letters, numbers and dashes" >&2; exit 1; }
echo "$BBOX" | grep -Eq '^-?[0-9.]+,-?[0-9.]+,-?[0-9.]+,-?[0-9.]+$' || { echo "bbox: west,south,east,north" >&2; exit 1; }
for tool in pmtiles overturemaps ogr2ogr tippecanoe; do command -v "$tool" >/dev/null || { echo "missing tool: $tool" >&2; exit 1; }; done

OUT="$(dirname "$0")/out/$NAME"
mkdir -p "$OUT"

# 1. Street map (OpenStreetMap, ODbL): a regional cut of the planet file, read over HTTP range requests
pmtiles extract "$PLANET_URL" "$OUT/basemap.pmtiles" --bbox="$BBOX" --maxzoom=15

# 2. Buildings (Overture Maps: OpenStreetMap + Microsoft + Google footprints, ODbL) with height and floors
overturemaps download --bbox="$BBOX" -f geoparquet --type=building -o "$OUT/buildings.parquet"
ogr2ogr -f GeoJSONSeq "$OUT/buildings.geojsonl" "$OUT/buildings.parquet" -sql \
  "SELECT geometry, height, num_floors FROM buildings" -dialect SQLite 2>/dev/null \
  || ogr2ogr -f GeoJSONSeq "$OUT/buildings.geojsonl" "$OUT/buildings.parquet" -select height,num_floors
tippecanoe -o "$OUT/buildings.pmtiles" -l building -Z13 -z15 --drop-densest-as-needed --force "$OUT/buildings.geojsonl"
rm -f "$OUT/buildings.geojsonl"

echo "Done: $OUT/basemap.pmtiles and $OUT/buildings.pmtiles"
echo "Credit on the map: © OpenStreetMap contributors, Overture Maps Foundation"
