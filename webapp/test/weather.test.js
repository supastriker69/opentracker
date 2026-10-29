"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {summarize, startWeather} = require("../lib/weather");

const day = (d, n, pd = 40, pn = 60) => ({
  daytimeForecast: {precipitation: {probability: {percent: pd, type: "RAIN"}, qpf: {quantity: d, unit: "MILLIMETERS"}}},
  nighttimeForecast: {precipitation: {probability: {percent: pn, type: "RAIN"}, qpf: {quantity: n, unit: "MILLIMETERS"}}}
});

test("daily rain is day plus night; 3-day total; highest chance", () => {
  assert.deepEqual(summarize({forecastDays: [day(12, 8.5), day(30, 0), day(1, 1)]}), {mm24: 20.5, mm72: 52.5, pop: 60});
});
test("inches are converted and missing days are tolerated", () => {
  const inches = {daytimeForecast: {precipitation: {qpf: {quantity: 1, unit: "INCHES"}}}};
  assert.equal(summarize({forecastDays: [inches]}).mm24, 25.4);
});
test("unusable answers are refused", () => {
  assert.throws(() => summarize({}), /no forecast days/);
  assert.throws(() => summarize({forecastDays: [{daytimeForecast: {}}]}), /no rain/);
});
test("one failing zone keeps the others", async () => {
  let saved = null;
  const store = {getWeather: async () => saved, putWeather: async v => { saved = v; }, lock: async () => true};
  const fetchImpl = async url => /latitude=5\.6/.test(url) ? {ok: true, json: async () => ({forecastDays: [day(10, 5), day(1, 1), day(0, 0)]})} : {ok: false, status: 403};
  const w = startWeather({key: "", zones: {acc: {ll: [-0.2, 5.6]}, lag: {ll: [3.39, 6.53]}}, store, fetchImpl, log: {error() {}}});
  await w.run();
  const s = await w.get();
  assert.equal(s.forecasts.length, 1);
  assert.equal(s.forecasts[0].zone, "acc"); assert.equal(s.forecasts[0].mm24, 15); assert.equal(s.forecasts[0].src, "Google Weather");
  assert.ok(s.error);
});
