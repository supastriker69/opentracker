# World tables

Open Tracker covers every country. These tables come from open sources and are rebuilt monthly by the
**World data** workflow (or by hand):

```bash
sh world/fetch_sources.sh        # about 1.4 GB into world/raw/ (not kept in the repository)
python3 world/build_world.py     # writes world/out/countries.json and world/out/places.json
python -m pytest world/tests
```

`tools/build.py` copies both files into the web app, where the data feeds use them.

| Output | Contents |
|---|---|
| `countries.json` | 238 countries and territories: ISO codes, names, region, population, map box, number of states/regions and districts, emergency numbers, official languages |
| `places.json` | about 7,300 populated places: position, population, capital flag, and the nearest large-river point within 5 km. Capitals come first, then by population, so the first few hundred already cover every country |

| Source | Used for | Licence |
|---|---|---|
| [Natural Earth](https://www.naturalearthdata.com/) 1:10m countries, populated places, rivers | names, codes, regions, population, places, rivers | Public domain |
| [geoBoundaries](https://www.geoboundaries.org/) 6.0.0 CGAZ ADM1/ADM2 | number of states/regions and districts (and the boundaries for the map) | CC BY 4.0 / ODbL: credit geoBoundaries |
| [Google libphonenumber](https://github.com/google/libphonenumber) `ShortNumberMetadata.xml` | emergency numbers | Apache 2.0 |
| [Unicode CLDR](https://cldr.unicode.org/) `territoryInfo` | official languages | Unicode licence |

Emergency numbers are a starting point: check them with each country's agencies (for example, add Nigeria's 112).
