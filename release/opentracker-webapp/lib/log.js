"use strict";
/* Structured logs: one JSON object per line on standard output, ready for any log collector
   (Docker, journald, Loki, CloudWatch …).

     log.info("feed ran", {feed: "gdacs"})
     → {"t":"2026-11-06T03:00:00.000Z","level":"info","msg":"feed ran","feed":"gdacs","pid":12}

   Calls written for console (log.error("feed gdacs:", e.message)) keep working: plain arguments are joined into
   the message, and a last argument that is a plain object becomes fields. LOG_LEVEL hides less important lines. */
const LEVELS = {debug: 10, info: 20, warn: 30, error: 40};

function createLog({level = "info", write = line => process.stdout.write(line + "\n"), now = () => new Date(), pid = process.pid} = {}) {
  if (!(level in LEVELS)) throw new Error(`LOG_LEVEL must be one of ${Object.keys(LEVELS).join(", ")}`);
  const min = LEVELS[level];
  const isFields = x => x !== null && typeof x === "object" && !(x instanceof Error) && !Array.isArray(x);
  const line = lv => (...args) => {
    if (LEVELS[lv] < min) return;
    const fields = args.length > 1 && isFields(args[args.length - 1]) ? args.pop() : {};
    const err = args.find(a => a instanceof Error);
    const msg = args.map(a => (a instanceof Error ? a.message : typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    const rec = Object.assign({}, fields, {t: now().toISOString(), level: lv, msg, pid});
    if (err && err.stack) rec.stack = String(err.stack).split("\n").slice(0, 8).join("\n");
    try { write(JSON.stringify(rec)); } catch (e) { write(JSON.stringify({t: rec.t, level: lv, msg, pid, note: "fields could not be written"})); }
  };
  return {debug: line("debug"), info: line("info"), warn: line("warn"), error: line("error"), log: line("info")};
}

module.exports = {createLog, LEVELS};
