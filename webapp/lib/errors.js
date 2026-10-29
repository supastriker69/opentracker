"use strict";
/* Bad input from a client: answered with 400 and the message, never logged as a server fault. */
class InputError extends Error {}
module.exports = {InputError};
