#!/usr/bin/env sh
# Downloads the open world datasets that build_world.py needs into world/raw/ (about 1.4 GB).
# Every source is a public mirror on GitHub; see world/README.md for licences.
set -eu
cd "$(dirname "$0")"
RAW=raw
NE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
GB=https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/CGAZ
LIBPHONE=https://raw.githubusercontent.com/google/libphonenumber/master/resources/ShortNumberMetadata.xml
CLDR_VERSION=49.0.0

get() {   # get <destination> <url>: download once, refuse Git LFS pointer files
  [ -s "$1" ] && return 0
  mkdir -p "$(dirname "$1")"
  curl -fsSL --retry 3 -o "$1.part" "$2"
  if head -c 100 "$1.part" | grep -q "git-lfs"; then echo "LFS pointer instead of data: $2" >&2; rm -f "$1.part"; exit 1; fi
  mv "$1.part" "$1"
  echo "ok $1"
}

for n in ne_10m_admin_0_countries ne_10m_populated_places_simple ne_10m_rivers_lake_centerlines ne_110m_admin_0_countries; do
  get "$RAW/naturalearth/$n.geojson" "$NE/$n.geojson"
done
for l in ADM1 ADM2; do
  get "$RAW/boundaries/geoBoundariesCGAZ_$l.geojson" "$GB/geoBoundariesCGAZ_$l.geojson"
done
get "$RAW/phone/ShortNumberMetadata.xml" "$LIBPHONE"
if [ ! -s "$RAW/npm/cldr-core-$CLDR_VERSION.tgz" ]; then
  mkdir -p "$RAW/npm" && (cd "$RAW/npm" && npm pack "cldr-core@$CLDR_VERSION" --silent)
fi
echo "World sources are in world/$RAW"
