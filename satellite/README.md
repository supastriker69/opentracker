# Satellite flood maps

Replays of real floods, date by date, from water outlines mapped from satellite images. Radar satellites (Sentinel-1) see through the cloud that covers most floods.

## 1. Get outlines

Use official outlines where they exist (listed in `events.yml`):

| Flood | Official outlines |
|---|---|
| Accra, June 2026 | Copernicus Global Flood Monitoring (GFM): Sentinel-1 observed flood extent for each date after 29 June 2026 |
| Borno (Maiduguri), September 2024, after the Alau Dam collapse | Copernicus Emergency Management Service, activation **EMSR753** |
| Nigeria, October 2022 (Niger and Benue) | UNOSAT **FL20221019NGA**: satellite-detected water extents for 8–12, 13–17 and 19–23 October 2022 |

If there are no official outlines, make your own with `sentinel1_flood.js` in Google Earth Engine. It applies the UN-SPIDER Sentinel-1 change-detection method, removes permanent water and steep slopes, and exports one GeoJSON per date.

## 2. Make the replay file

```bash
python satellite/prepare_extent.py --id borno-2024-09 --title "Borno floods after the Alau Dam collapse, September 2024" \
  --country NG --areas NG-BO --source "Copernicus EMS EMSR753" \
  --link https://mapping.emergency.copernicus.eu/news/flood-in-borno-nigeria/ \
  --filter "obj_type=Flooded area" \
  2024-09-11=observed_event_a.shp 2024-09-17=monitoring_1.shp --out replays/borno-2024-09.json
```

The tool reprojects to longitude/latitude, keeps only the flooded-area features, measures the area in km², and simplifies each date to fit phones.

## 3. Publish

Import the file in Open Tracker Admin → Flood replays, or upload it in the web app's push console. Administrators can also add a single GeoJSON outline from the Admin screen.

Always keep the link to the original product: it lets people check the map.
