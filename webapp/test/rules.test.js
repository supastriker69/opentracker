"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {parseSubscription, parseNotice, parseData, parseContribution, matches, km, InputError} = require("../lib/rules");

const sub = (o = {}) => Object.assign({countries: ["GH"], whole: [], areas: ["GH-AA"], points: [[-0.25, 5.57]]}, o);
const notice = (o = {}) => Object.assign({c: "GH", areas: [], ll: null, km: 0}, o);

test("distance between Accra and Kumasi is about 200 km", () => {
  const d = km([-0.19, 5.6], [-1.62, 6.69]);
  assert.ok(d > 190 && d < 210, String(d));
});

test("targeting", () => {
  assert.equal(matches(notice(), sub()), true, "country-wide notice reaches everyone in the country");
  assert.equal(matches(notice({c: "NG"}), sub()), false, "other country");
  assert.equal(matches(notice({areas: ["GH-AA"]}), sub()), true, "followed region");
  assert.equal(matches(notice({areas: ["GH-CP"]}), sub()), false, "other region");
  assert.equal(matches(notice({areas: ["GH-CP"], ll: [-0.24, 5.58], km: 5}), sub()), true, "near a followed point");
  assert.equal(matches(notice({areas: ["GH-CP"], ll: [-1.24, 5.1], km: 5}), sub()), false, "far from every point");
  assert.equal(matches(notice({areas: ["GH-CP"]}), sub({whole: ["GH"]})), true, "follows the whole country");
  assert.equal(matches(notice({c: "ALL", areas: ["NG-LA"]}), sub()), false, "both countries, other state");
  assert.equal(matches(notice({c: "ALL", areas: ["GH-AA"]}), sub()), true, "both countries, followed region");
  assert.equal(matches(notice({c: "ALL"}), sub({whole: ["NG"], countries: ["NG"]})), true, "both countries, whole-country follower");
});

test("subscription validation", () => {
  const good = {subscription: {endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: {p256dh: "BNc_x-1", auth: "aB_c"}}, areas: ["GH-AA"], points: [[-0.2, 5.6]]};
  const s = parseSubscription(good);
  assert.deepEqual(s.areas, ["GH-AA"]);
  assert.throws(() => parseSubscription({subscription: Object.assign({}, good.subscription, {endpoint: "http://x.org"})}), InputError);
  assert.throws(() => parseSubscription({subscription: Object.assign({}, good.subscription, {endpoint: "javascript:alert(1)"})}), InputError);
  assert.throws(() => parseSubscription(Object.assign({}, good, {areas: ["<script>"]})), InputError);
  assert.throws(() => parseSubscription(Object.assign({}, good, {points: [[500, 5]]})), InputError);
  assert.throws(() => parseSubscription(Object.assign({}, good, {points: Array(21).fill([0, 0])})), InputError);
});

test("notice validation", () => {
  const n = parseNotice({level: "warning", title: " Evacuate ", msg: "Move now", c: "gh", areas: ["GH-AA"]});
  assert.equal(n.title, "Evacuate"); assert.equal(n.c, "GH");
  assert.throws(() => parseNotice({title: "x", msg: "y", c: "GH", areas: ["NG-LA"]}), /country/);
  assert.throws(() => parseNotice({title: "", msg: "y", c: "GH"}), /title/);
  assert.throws(() => parseNotice({title: "x".repeat(81), msg: "y", c: "GH"}), /longer/);
  assert.throws(() => parseNotice({title: "x", msg: "y", c: "GH", level: "panic"}), /level/);
  assert.throws(() => parseNotice({title: "x", msg: "y", c: "GH", ll: [0, 5], km: 1000}), /km/);
  assert.throws(() => parseNotice({title: "x", msg: "y", c: "GH", expires: "2000-01-01"}), /future/);
  assert.equal(parseNotice({title: "x", msg: "y", c: "ALL"}).c, "ALL");
});

test("published data drops private sections and account ids", () => {
  const d = parseData({app: "OpenTracker", settings: {}, members: [{id: "u1", role: "administrator"}], roles: [{id: "r"}],
    agencies: [{id: "nadmo", n: "NADMO", publishers: ["u1"]}], hotspots: [{id: "h1"}, {nope: 1}]});
  assert.equal(d.members, undefined); assert.equal(d.roles, undefined);
  assert.deepEqual(d.agencies[0].publishers, []);
  assert.equal(d.hotspots.length, 1);
  assert.throws(() => parseData({app: "Other"}), InputError);
});

test("map addresses: https only, \"off\" turns them off, and the policy allows only their origins", () => {
  const {loadConfig} = require("../lib/config");
  const {buildCsp} = require("../lib/http");
  assert.throws(() => loadConfig({MAP_TILES_URL: "http://tiles.example.org/planet"}), /https/);
  const off = loadConfig({MAP_TILES_URL: "off", MAP_GLYPHS_URL: "off", TERRAIN_TILES_URL: "off"});
  assert.deepEqual([off.mapTiles, off.mapGlyphs, off.mapTerrain], ["", "", ""]);
  const own = loadConfig({TERRAIN_TILES_URL: "https://dem.example.org/terrarium/{z}/{x}/{y}.png"});
  assert.equal(own.mapTerrain, "https://dem.example.org/terrarium/{z}/{x}/{y}.png");
  assert.match(buildCsp(["https://a.example.org", "javascript:alert(1)", "https://b.example.org:8443"]), /connect-src 'self' data: https:\/\/a\.example\.org https:\/\/b\.example\.org:8443;/);
  assert.doesNotMatch(buildCsp(["javascript:alert(1)"]), /javascript/);
});

test("contributions can name any town or country", () => {
  assert.deepEqual(parseContribution({type: "report", text: "Street flooded", place: {type: "wp", id: "p1159151297"}}).place, {type: "wp", id: "p1159151297"});
  assert.deepEqual(parseContribution({type: "suggestion", text: "Add Spanish", place: {type: "wc", id: "MX"}}).place, {type: "wc", id: "MX"});
  assert.throws(() => parseContribution({type: "report", text: "x", place: {type: "planet", id: "earth"}}), /place is not valid/);
});
