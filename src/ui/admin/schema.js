/* ===== Admin: what every kind of record holds (fields, labels, who may see it) and the admin tabs ===== */
import {FT} from "../../data/data.js";
import {agencies, AUTH} from "../../core/auth.js";
import {settings} from "../../core/core.js";
import {NOTICE_LEVELS} from "../../features/notify.js";

const C_OPTS = [["GH", "Ghana"], ["NG", "Nigeria"]];
const C_OPTS_ALL = [["ALL", "Both countries"], ...C_OPTS];
export const SCHEMA = {
  alerts: {title: "Official warnings", one: "warning", help: "Post warnings from NADMO, NEMA, LASEMA, GMet or NiMet. They appear at the top of every matching public page until they expire.",
    cols: [["level", "Type"], ["agency", "Agency"], ["msg", "Message"], ["expires", "Until"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "level", l: "Type", t: "select", opts: [["warning", "Flood warning (red)"], ["watch", "Flood watch (amber)"], ["info", "Notice (blue)"]]},
      {k: "c", l: "Country", t: "select", opts: C_OPTS_ALL}, {k: "areas", l: "Regions or states (IDs, comma separated; blank = whole country)", t: "list", hint: "areas"},
      {k: "agency", l: "Agency", t: "text"}, {k: "msg", l: "Message (plain words)", t: "textarea", wide: true},
      {k: "issued", l: "Issued", t: "datetime"}, {k: "expires", l: "Expires", t: "datetime"}]},
  forecasts: {title: "Rain forecasts", one: "forecast", help: "Type rain forecasts from GMet or NiMet bulletins until the live feed is connected. A forecast is used for 36 hours after its issue time.",
    cols: [["zone", "Weather zone"], ["mm24", "Next 24 h (mm)"], ["mm72", "Next 3 days (mm)"], ["src", "Source"], ["at", "Issued"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "zone", l: "Weather zone", t: "select", opts: () => Object.entries(settings().climate).map(([k, v]) => [k, v.n])},
      {k: "mm24", l: "Rain next 24 hours (mm)", t: "number"}, {k: "mm72", l: "Rain next 3 days (mm)", t: "number"},
      {k: "src", l: "Source (e.g. GMet bulletin 06:00)", t: "text"}, {k: "at", l: "Issued", t: "datetime"}]},
  dams: {title: "Dams", one: "dam", help: "Set each dam's official status from the operator's notice. 'Typical for the season' uses the usual monthly pattern below.",
    cols: [["n", "Dam"], ["river", "River"], ["status", "Status"], ["lastNotice", "Latest notice"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text"}, {k: "river", l: "River", t: "text"}, {k: "c", l: "Country", t: "select", opts: C_OPTS},
      {k: "status", l: "Official status", t: "select", opts: () => Object.entries(FT.damStatus).map(([k, v]) => [k, v.n])},
      {k: "lastNotice", l: "Latest notice shown to the public", t: "text", wide: true}, {k: "op", l: "Operator", t: "text"},
      {k: "ll", l: "Location", t: "ll"}, {k: "note", l: "Background note", t: "textarea", wide: true},
      {k: "season", l: "Usual chance of releases by month (0 to 1)", t: "monthly", wide: true}]},
  hotspots: {title: "Flood areas", one: "flood area", help: "Every area people can search and see on the map.",
    cols: [["n", "Name"], ["r", "Region / state"], ["d", "Causes"], ["t", "Rain to flood (mm)"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text"}, {k: "c", l: "Country", t: "select", opts: C_OPTS},
      {k: "r", l: "Region or state", t: "select", opts: () => FT.areas.map(a => [a.id, `${a.n} (${a.c})`])}, {k: "ll", l: "Location", t: "ll"},
      {k: "d", l: "Causes", t: "drivers", wide: true}, {k: "z", l: "Weather zone", t: "select", opts: () => Object.entries(settings().climate).map(([k, v]) => [k, v.n])},
      {k: "t", l: "Rain over 3 days that usually starts flooding (mm)", t: "number"}, {k: "sev", l: "How bad floods get (1 to 3)", t: "number"},
      {k: "exp", l: "People exposed (1 to 3)", t: "number"}, {k: "vul", l: "Vulnerability (0 to 1)", t: "number"},
      {k: "aka", l: "Other names people search for (comma separated)", t: "list", wide: true}, {k: "why", l: "Plain-language reason shown to the public", t: "textarea", wide: true}]},
  events: {title: "Past floods", one: "past flood", help: "Floods linked to named areas. Add the source link so people can check it.",
    cols: [["date", "Date"], ["t", "Title"], ["ids", "Areas"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "t", l: "Title", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS},
      {k: "date", l: "Date (YYYY-MM-DD, YYYY-MM or YYYY)", t: "text"}, {k: "year", l: "Year (blank if not confirmed)", t: "number"},
      {k: "ids", l: "Flood area IDs (comma separated)", t: "list", wide: true, hint: "hot"}, {k: "impact", l: "What happened", t: "textarea", wide: true},
      {k: "src", l: "Source link", t: "text", wide: true}]},
  regionEvents: {title: "Region reports", one: "region report", help: "Floods reported for a whole region or state without named places.",
    cols: [["date", "Date"], ["r", "Region / state"], ["t", "Title"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "r", l: "Region or state", t: "select", opts: () => FT.areas.map(a => [a.id, `${a.n} (${a.c})`])},
      {k: "t", l: "Title", t: "text"}, {k: "date", l: "Date", t: "text"}, {k: "year", l: "Year", t: "number"},
      {k: "impact", l: "What happened", t: "textarea", wide: true}, {k: "src", l: "Source link", t: "text", wide: true}]},
  safe: {title: "Safe places", one: "safe place", help: "Shelters and safe havens named by NADMO, AMA, NEMA or LASEMA.",
    cols: [["n", "Name"], ["c", "Country"], ["src", "Named by"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS}, {k: "ll", l: "Location", t: "ll"}, {k: "src", l: "Named by", t: "text"}]},
  roads: {title: "Roads to avoid", one: "road", help: "Roads reported impassable in floods.",
    cols: [["n", "Road"], ["c", "Country"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Road", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS}, {k: "ll", l: "Location", t: "ll"}]},
  feeds: {title: "Data feeds", one: "feed", help: "Mark a feed 'Entered by staff' while you type its data in, and 'Connected' once it flows automatically.",
    cols: [["n", "Feed"], ["c", "Country"], ["status", "Status"], ["last", "Last update"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS_ALL}, {k: "what", l: "What it provides", t: "text", wide: true},
      {k: "status", l: "Status", t: "select", opts: [["off", "Not connected yet"], ["manual", "Entered by staff"], ["on", "Connected"]]}, {k: "last", l: "Last update", t: "datetime"}, {k: "note", l: "Note shown to the public", t: "text", wide: true}]},
  agencies: {title: "Agencies", one: "agency", help: "Agencies in Ghana, Nigeria and future countries. Link their staff under People or approve their requests; their posts then appear publicly.",
    cols: [["n", "Agency"], ["c", "Country"], ["kind", "Type"], ["status", "Status"], ["publishers", "Linked staff"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text", wide: true}, {k: "c", l: "Country code (GH, NG, or another ISO code such as CI, TG, BJ, SN)", t: "text"},
      {k: "kind", l: "Type", t: "select", opts: [["met", "Weather service"], ["hydro", "River and hydrology"], ["disaster", "Disaster and emergency"], ["dam", "Dam operator"], ["gov", "Ministry or assembly"], ["other", "Other"]]},
      {k: "status", l: "Status", t: "select", opts: [["active", "Active"], ["suspended", "Suspended (posts hidden)"]]},
      {k: "push", l: "May send public notifications", t: "select", opts: [["true", "Yes"], ["false", "No"]]},
      {k: "supplies", l: "What they supply", t: "text", wide: true}, {k: "web", l: "Website", t: "text", wide: true}]},
  notifications: {title: "Public notifications", one: "notification",
    help: "Send credible, official information to the public. It appears at once in everyone's Alerts and, on the Open Tracker web app, as a phone notification for people who follow the places it covers.",
    cols: [["title", "Title"], ["agency", "From"], ["level", "Type"], ["areas", "Where"], ["at", "Sent"], ["expires", "Until"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "level", l: "Type", t: "select", opts: NOTICE_LEVELS}, {k: "agency", l: "Sent on behalf of", t: "select", opts: () => noticeSenders()},
      {k: "title", l: "Title (short, up to 80 characters)", t: "text", wide: true}, {k: "msg", l: "Message in plain words (up to 500 characters)", t: "textarea", wide: true},
      {k: "c", l: "Country", t: "select", opts: C_OPTS_ALL}, {k: "areas", l: "Regions or states (IDs, comma separated; blank = whole country)", t: "list", hint: "areas", wide: true},
      {k: "lat", l: "Or near a spot: latitude", t: "number"}, {k: "lon", l: "Longitude", t: "number"}, {k: "km", l: "Radius (km, 1 to 300)", t: "number"},
      {k: "at", l: "Sent", t: "datetime"}, {k: "expires", l: "Show until", t: "datetime"}]},
  contacts: {title: "Emergency numbers", one: "number", help: "Numbers shown on every answer page for that country.",
    cols: [["c", "Country"], ["n", "Name"], ["num", "Number"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "c", l: "Country", t: "select", opts: C_OPTS}, {k: "n", l: "Name", t: "text"}, {k: "num", l: "Number", t: "text"}]}
};
/* tabs, with the permission each needs */
export const TABS = [
  ["overview", "Overview", () => AUTH.anyAdmin()],
  ["analytics", "Analytics", () => AUTH.can("analytics.view")],
  ["approvals", "Approvals", () => AUTH.can("approvals.manage")],
  ["contributions", "Contributions", () => AUTH.can("contributions.review")],
  ["replays", "Flood replays", () => AUTH.can("data.edit")],
  ["live", "Live data", () => AUTH.can("data.edit")],
  ["notifications", "Send notification", () => AUTH.can("notify.send")],
  ["alerts", "Warnings", () => AUTH.can("warnings.manage")],
  ["forecasts", "Rain forecasts", () => AUTH.can("forecasts.manage")],
  ["dams", "Dams", () => AUTH.can("forecasts.manage")],
  ["hotspots", "Flood areas", () => AUTH.can("data.edit")],
  ["events", "Past floods", () => AUTH.can("data.edit")],
  ["regionEvents", "Region reports", () => AUTH.can("data.edit")],
  ["safe", "Safe places", () => AUTH.can("data.edit")],
  ["roads", "Roads", () => AUTH.can("data.edit")],
  ["feeds", "Data feeds", () => AUTH.can("data.edit")],
  ["contacts", "Emergency numbers", () => AUTH.can("data.edit")],
  ["agencies", "Agencies", () => AUTH.can("agencies.manage")],
  ["requests", "Access requests", () => AUTH.can("agencies.manage")],
  ["posts", "Agency posts", () => AUTH.can("agencies.manage") || AUTH.can("warnings.manage")],
  ["people", "People", () => AUTH.can("users.manage")],
  ["roles", "Roles", () => AUTH.can("users.manage")],
  ["model", "Model settings", () => AUTH.can("model.manage")],
  ["audit", "Audit log", () => AUTH.can("audit.view")]
];
export function noticeSenders() {
  const own = AUTH.agency();
  if (own && !AUTH.can("users.manage")) return [[own.id, own.n]];
  return [["opentracker", "Open Tracker team"]].concat(agencies().filter(a => a.status !== "suspended" && a.push !== false).map(a => [a.id, a.n]));
}
export const tabLabel = k => (TABS.find(t => t[0] === k) || [k, k])[1];
