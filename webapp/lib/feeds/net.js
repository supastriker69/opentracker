"use strict";
/* Outbound HTTP for data feeds.
   - HTTPS only; redirects are followed by hand (at most 3) and each hop is checked again.
   - Addresses an administrator types in (CAP feeds) must resolve to public internet addresses, so a feed URL
     can't be used to reach the servers' private network.
   - Every request has a time limit and a size limit, and remembers ETag / Last-Modified so an unchanged
     feed costs one empty "304 Not Modified" answer. */
const dns = require("node:dns/promises");
const net = require("node:net");

class FeedError extends Error {
  constructor(message, status = 0) { super(message); this.name = "FeedError"; this.status = status; }
}

/* ---------- address checks ---------- */
const V4_BLOCKED = [   /* [network, prefix length]: private, loopback, link-local, shared, test, multicast and reserved ranges */
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3]
];
const v4num = ip => ip.split(".").reduce((n, part) => n * 256 + Number(part), 0);
const inV4 = (ip, [base, bits]) => bits === 0 || Math.floor(v4num(ip) / 2 ** (32 - bits)) === Math.floor(v4num(base) / 2 ** (32 - bits));

function isPublicAddress(ip) {
  if (net.isIPv4(ip)) return !V4_BLOCKED.some(r => inV4(ip, r));
  if (!net.isIPv6(ip)) return false;
  const a = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(a);
  if (mapped) return isPublicAddress(mapped[1]);
  if (a === "::" || a === "::1") return false;
  const first = parseInt(a.split(":")[0] || "0", 16);
  if ((first & 0xfe00) === 0xfc00) return false;   /* fc00::/7 unique local */
  if ((first & 0xffc0) === 0xfe80) return false;   /* fe80::/10 link local */
  if ((first & 0xff00) === 0xff00) return false;   /* ff00::/8 multicast */
  return true;
}

/* ---------- client ---------- */
const DEFAULTS = {timeoutMs: 20000, maxBytes: 5 * 1024 * 1024, publicOnly: false, conditional: false};
const MAX_REMEMBERED = 2000;

function createNet({fetchImpl = fetch, lookup = dns.lookup, userAgent = "OpenTracker/1.0 (+https://github.com/opentracker)"} = {}) {
  const remembered = new Map();   /* url -> {etag, modified, text}: answers for conditional requests */

  async function checkUrl(raw, publicOnly) {
    let u;
    try { u = new URL(raw); } catch (e) { throw new FeedError("not a valid address"); }
    if (u.protocol !== "https:") throw new FeedError("only https addresses are fetched");
    if (u.username || u.password) throw new FeedError("addresses with passwords are refused");
    if (publicOnly) {
      const host = u.hostname.replace(/^\[|\]$/g, "");
      const addrs = net.isIP(host) ? [{address: host}] : await lookup(host, {all: true}).catch(() => { throw new FeedError("the host name does not resolve"); });
      if (!addrs.length || !addrs.every(a => isPublicAddress(a.address))) throw new FeedError("the address is not on the public internet");
    }
    return u;
  }

  async function readLimited(res, maxBytes) {
    const declared = Number(res.headers.get("content-length"));
    if (declared > maxBytes) throw new FeedError(`the answer is larger than ${maxBytes} bytes`);
    if (!res.body) return "";
    const reader = res.body.getReader(), chunks = [];
    let size = 0;
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel().catch(() => {}); throw new FeedError(`the answer is larger than ${maxBytes} bytes`); }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map(c => Buffer.from(c))).toString("utf8");
  }

  /* one request: {status, text, notModified}. Non-2xx answers throw a FeedError carrying the status. */
  async function request(raw, {method = "GET", body, headers = {}, ...opts} = {}) {
    const o = Object.assign({}, DEFAULTS, opts);
    const signal = AbortSignal.timeout(o.timeoutMs);
    let url = (await checkUrl(raw, o.publicOnly)).href;
    for (let hop = 0; hop <= 3; hop++) {
      const h = Object.assign({"User-Agent": userAgent, Accept: o.accept || "*/*"}, headers);
      const memo = o.conditional && method === "GET" ? remembered.get(url) : null;
      if (memo && memo.etag) h["If-None-Match"] = memo.etag;
      if (memo && memo.modified) h["If-Modified-Since"] = memo.modified;
      let res;
      try { res = await fetchImpl(url, {method, body, headers: h, redirect: "manual", signal}); }
      catch (e) { throw new FeedError(e.name === "TimeoutError" || e.name === "AbortError" ? "no answer in time" : "could not connect"); }
      if (res.status >= 300 && res.status < 400 && res.status !== 304) {
        const next = res.headers.get("location");
        if (!next) throw new FeedError("redirect without a location", res.status);
        url = (await checkUrl(new URL(next, url).href, o.publicOnly)).href;
        continue;
      }
      if (res.status === 304 && memo) return {status: 304, text: memo.text, notModified: true};
      if (res.status < 200 || res.status >= 300) throw new FeedError(`the server answered ${res.status}`, res.status);
      const text = await readLimited(res, o.maxBytes);
      if (o.conditional && method === "GET") remember(url, res.headers.get("etag"), res.headers.get("last-modified"), text);
      return {status: res.status, text, notModified: false};
    }
    throw new FeedError("too many redirects");
  }

  function remember(url, etag, modified, text) {
    if (!etag && !modified) return;
    remembered.delete(url);
    remembered.set(url, {etag, modified, text});
    if (remembered.size > MAX_REMEMBERED) remembered.delete(remembered.keys().next().value);   /* oldest first */
  }

  function parseJson(text) {
    try { return JSON.parse(text); } catch (e) { throw new FeedError("the answer is not valid JSON"); }
  }

  return {
    getText: (url, opts) => request(url, opts),
    async getJson(url, opts) { const r = await request(url, Object.assign({accept: "application/json"}, opts)); return Object.assign(r, {json: parseJson(r.text)}); },
    async postJson(url, payload, opts) {
      const r = await request(url, Object.assign({method: "POST", body: JSON.stringify(payload), headers: {"Content-Type": "application/json"}, accept: "application/json"}, opts));
      return Object.assign(r, {json: parseJson(r.text)});
    },
    checkUrl
  };
}

module.exports = {createNet, FeedError, isPublicAddress};
