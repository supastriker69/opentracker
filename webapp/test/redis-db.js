"use strict";
/* Test files run in parallel processes, so each uses its own Redis database (TEST_REDIS_URL's server, database n):
   one file emptying its database at start-up must never wipe another's.
   server.test.js 15 (and 11, 12, 13 for subscription shards) · feeds-service.test.js 10 · monitor.test.js 9 */
const redisDb = n => process.env.TEST_REDIS_URL ? process.env.TEST_REDIS_URL.replace(/\/\d*$/, "") + "/" + n : null;
module.exports = {redisDb};
