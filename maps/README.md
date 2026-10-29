# 3D maps

Open Tracker draws every place in 3D with open data: the ground shape, every building as a block at its real
height, and flood water or heat on top. The map files are [PMTiles](https://docs.protomaps.com/), single files that
MapLibre reads in small pieces straight from object storage or a CDN, so the map scales without tile servers.

| Layer | Source | Licence |
|---|---|---|
| Streets, places, water, land use | OpenStreetMap through the daily [Protomaps](https://docs.protomaps.com/basemaps/downloads) planet build (about 120 GB, zoom 0–15) | ODbL: credit "© OpenStreetMap contributors" |
| Buildings and heights | [Overture Maps](https://docs.overturemaps.org/) buildings (2.5 billion, merging OpenStreetMap, Microsoft and Google footprints) | ODbL |
| Ground shape | AWS Terrain Tiles (Terrarium PNG) or Copernicus DEM GLO-30 | Free with credit (SRTM, GMTED2010, ETOPO1, 3DEP, EU-DEM) |
| Free hosted fallback | [OpenFreeMap](https://openfreemap.org) (no keys, no limits, commercial use allowed) | Credit OpenStreetMap and OpenMapTiles |

## One region

```bash
PLANET_URL=<planet build URL from maps.protomaps.com/builds> sh maps/extract_region.sh lagos 3.10,6.35,3.70,6.75
```

This writes `maps/out/lagos/basemap.pmtiles` and `buildings.pmtiles`. Upload them next to the web app (or to a
bucket behind your CDN). For the whole world, serve the planet file itself and build buildings per continent.

CARTO's styles (Positron, Voyager, Dark Matter) are open source (BSD) and can restyle these tiles, but CARTO's
hosted tiles need a CARTO plan or non-profit grant for public use.
