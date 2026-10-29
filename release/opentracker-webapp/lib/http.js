"use strict";
/* HTTP plumbing: security headers, JSON responses that a CDN can cache, request bodies, static files. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const {InputError} = require("./errors");

/* Content Security Policy. mapOrigins: the street-map and ground-height servers the browser may fetch from
   (https origins only, from the server settings), so the 3D map can load and nothing else can.
   data: lets the map engine read the projected-water picture the page draws itself. */
function buildCsp(mapOrigins = []) {
  const extra = mapOrigins.filter(o => /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o)).join(" ");
  return ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src https://fonts.gstatic.com",
    `img-src 'self' data: blob:${extra ? " " + extra : ""}`, "worker-src 'self' blob:", "child-src blob:", `connect-src 'self' data:${extra ? " " + extra : ""}`, "manifest-src 'self'",
    "frame-ancestors 'none'", "base-uri 'none'", "form-action 'self'", "object-src 'none'"].join("; ");
}
const CSP = buildCsp();

function secure(res, trustProxy, csp = CSP) {
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  if (trustProxy) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

/* JSON answer. Public reads pass `cache` so CDNs and browsers absorb repeat traffic; ETags make refreshes cheap. */
function send(req, res, code, body, cache) {
  const s = body === undefined ? "" : JSON.stringify(body);
  const headers = {"Content-Type": "application/json; charset=utf-8", "Cache-Control": cache || "no-store"};
  if (cache && code === 200) {
    const etag = '"' + crypto.createHash("sha1").update(s).digest("base64url") + '"';
    headers.ETag = etag;
    headers.Vary = "Accept-Encoding";
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); return res.end(); }
  }
  headers["Content-Length"] = Buffer.byteLength(s);
  res.writeHead(code, headers);
  res.end(req.method === "HEAD" ? undefined : s);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) return reject(new InputError("send JSON with Content-Type: application/json"));
    let size = 0; const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size <= limit) chunks.push(c);
      else if (size > limit * 4) req.destroy();   /* far too large: stop reading at once */
    });
    req.on("end", () => {
      if (size > limit) return reject(new InputError("request is too large"));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "null")); } catch (e) { reject(new InputError("body is not valid JSON")); }
    });
    req.on("error", reject);
  });
}

const clientIp = (req, trustProxy) => (trustProxy && String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress || "?";
function sameOrigin(origin, host) { try { return new URL(origin).host === host; } catch (e) { return false; } }
function bearer(req) { const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || ""); return m ? m[1] : null; }

/* ---------- static files ---------- */
const TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8"};
function serveStatic(req, res, publicDir, url) {
  let rel = url.pathname === "/" ? "/index.html" : url.pathname;
  try { rel = decodeURIComponent(rel); } catch (e) { return send(req, res, 400, {error: "bad path"}); }
  const file = path.normalize(path.join(publicDir, rel));
  if (!file.startsWith(publicDir + path.sep)) return send(req, res, 404, {error: "not found"});
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      if (!path.extname(rel)) return serveStatic(req, res, publicDir, new URL("/", url));   /* app routes fall back to the app */
      return send(req, res, 404, {error: "not found"});
    }
    const ext = path.extname(file).toLowerCase();
    const etag = `W/"${st.size.toString(36)}-${st.mtimeMs.toString(36)}"`;
    /* pages and the service worker are always revalidated; versioned files (?v=) are cached for a year */
    const cache = ext === ".html" || rel === "/sw.js" || ext === ".webmanifest" ? "no-cache"
      : url.searchParams.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=3600, stale-while-revalidate=86400";
    const headers = {"Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": cache, ETag: etag};
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); return res.end(); }
    headers["Content-Length"] = st.size;
    res.writeHead(200, headers);
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).on("error", () => res.destroy()).pipe(res);
  });
}

module.exports = {InputError, secure, buildCsp, send, readBody, clientIp, sameOrigin, bearer, serveStatic};
