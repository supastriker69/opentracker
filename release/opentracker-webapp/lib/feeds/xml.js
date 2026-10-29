"use strict";
/* XML from outside sources (RSS, Atom, CAP). Documents that declare a DOCTYPE are refused outright:
   alert feeds never need one, and refusing it rules out entity-expansion attacks. */
const {XMLParser} = require("fast-xml-parser");
const {FeedError} = require("./net");

const parser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: "@", removeNSPrefix: true,
  parseTagValue: false, parseAttributeValue: false, trimValues: true,
  processEntities: true, htmlEntities: false
});

function parseXml(text) {
  if (typeof text !== "string" || !text.trim()) throw new FeedError("empty XML");
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new FeedError("XML with a DOCTYPE is refused");
  try { return parser.parse(text); } catch (e) { throw new FeedError("the answer is not valid XML"); }
}

/* small helpers for the shapes the parser produces */
const list = v => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
function text(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") return "#text" in v ? String(v["#text"]).trim() : "";
  return String(v).trim();
}
const clip = (s, max) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

module.exports = {parseXml, list, text, clip};
