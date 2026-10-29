"use strict";
/* Names both storage back ends accept for feed documents, e.g. "hazards:NG", "feed-health:gdacs", "cap-alerts:ng-nimet". */
const DOC_KEY = /^[A-Za-z0-9._-]{1,60}(:[A-Za-z0-9._-]{1,60}){0,2}$/;
module.exports = {DOC_KEY};
