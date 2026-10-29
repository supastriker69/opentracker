"use strict";
/* Every outside data source Open Tracker reads: what it gives, its licence, and the credit shown with its data. */
const SOURCES = Object.freeze([
  {id: "open-meteo-forecast", name: "Open-Meteo forecast", gives: "Heat, humidity and rain for the next 7 days, for places in every country",
    licence: "CC BY 4.0", credit: "Weather data by Open-Meteo.com", link: "https://open-meteo.com/"},
  {id: "open-meteo-baselines", name: "Open-Meteo historical weather (ERA5)", gives: "Each place's usual heat, from decades of past weather, so a heatwave is judged by local standards",
    licence: "CC BY 4.0", credit: "Weather data by Open-Meteo.com; ERA5 by Copernicus Climate Change Service / ECMWF", link: "https://open-meteo.com/en/docs/historical-weather-api"},
  {id: "open-meteo-rivers", name: "Open-Meteo flood API (GloFAS)", gives: "River flow for the next 30 days at towns on large rivers",
    licence: "CC BY 4.0", credit: "River data by Open-Meteo.com; GloFAS by the Copernicus Emergency Management Service", link: "https://open-meteo.com/en/docs/flood-api"},
  {id: "gdacs", name: "GDACS", gives: "Current floods, tropical cyclones and droughts worldwide, with alert levels",
    licence: "Free to use with credit", credit: "GDACS, a United Nations and European Commission partnership", link: "https://www.gdacs.org/"},
  {id: "cap", name: "Official warnings (CAP)", gives: "Warnings from national weather services and disaster agencies, in the Common Alerting Protocol",
    licence: "The issuing agency's terms", credit: "The issuing agency, named on each warning", link: "https://alertingauthority.wmo.int/"},
  {id: "satellite-scenes", name: "Sentinel-1 and Sentinel-2 (Earth Search)", gives: "The newest radar and optical satellite pictures of current floods",
    licence: "Copernicus free and open data", credit: "Contains modified Copernicus Sentinel data", link: "https://github.com/Element84/earth-search"},
  {id: "weatherex", name: "WeatherEx model comparison", gives: "The GFS, ECMWF and ICON forecasts side by side",
    licence: "Use only with WeatherEx's permission", credit: "WeatherEx-meteo", link: "https://meteo.weatherex.ai/"}
]);

const byId = id => SOURCES.find(s => s.id === id) || null;
module.exports = {SOURCES, byId};
