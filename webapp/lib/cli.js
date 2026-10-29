"use strict";
/* Command-line administration. Works against whichever store is configured (files or Redis). */
const crypto = require("node:crypto");
const {hashKey} = require("./api");

const USAGE = `Commands:
  keys:add <agency-id> "<Agency name>" [--admin]   create a key (shown once)
  keys:list                                         list keys
  keys:revoke <key-id>                              revoke a key at once
  keys:trust <key-id> | keys:untrust <key-id>       trusted agencies skip approval
  approval:on | approval:off                        must agency notices be approved?`;

async function runCli(args, store, out = console) {
  const [cmd, a1, a2] = args;
  const need = cond => { if (!cond) throw new Error(USAGE); };
  if (cmd === "keys:add") {
    need(a1 && /^[a-z0-9-]{2,40}$/.test(a1) && a2);
    const raw = "otk_" + crypto.randomBytes(32).toString("base64url");
    const rec = {id: crypto.randomBytes(4).toString("hex"), agency: a1, name: a2.slice(0, 120), admin: args.includes("--admin"), trusted: false, hash: hashKey(raw), created: new Date().toISOString(), revoked: null};
    await store.addKey(rec);
    out.log(`Key ${rec.id} for ${rec.name}${rec.admin ? " (administrator)" : ""}:\n\n  ${raw}\n\nGive it to the agency privately. It is shown only once.`);
  } else if (cmd === "keys:list") {
    const keys = await store.listKeys();
    keys.forEach(k => out.log(`${k.id}  ${k.revoked ? "REVOKED" : "active "}  ${k.admin ? "admin  " : k.trusted ? "trusted" : "agency "}  ${k.agency}  ${k.name}  (created ${k.created})`));
    if (!keys.length) out.log("No keys yet.");
  } else if (cmd === "keys:revoke" || cmd === "keys:trust" || cmd === "keys:untrust") {
    need(a1);
    const patch = cmd === "keys:revoke" ? {revoked: new Date().toISOString()} : {trusted: cmd === "keys:trust"};
    if (!await store.updateKey(a1, patch)) throw new Error("No key with that id.");
    out.log(cmd === "keys:revoke" ? `Key ${a1} revoked.` : `Key ${a1}: notices ${patch.trusted ? "go out without approval" : "need approval"}.`);
  } else if (cmd === "approval:on" || cmd === "approval:off") {
    await store.putSettings(Object.assign(await store.getSettings(), {approval: cmd === "approval:on"}));
    out.log(`Approval of agency notices is ${cmd === "approval:on" ? "ON" : "OFF"}.`);
  } else throw new Error(USAGE);
}
module.exports = {runCli};
