// ESLint flat config for the three kinds of JavaScript in Open Tracker. Run from the repository root:
//   npx --prefix tools/lint eslint -c tools/lint/eslint.config.mjs <files>
import globals from "globals";

const common = {
  "no-undef": "error",
  "no-unused-vars": ["error", {args: "none", caughtErrors: "none"}],
  "no-redeclare": "error",
  "no-dupe-keys": "error",
  "no-unreachable": "error",
  "no-self-assign": "error",
  "no-dupe-else-if": "error",
  "prefer-const": "warn",
  "no-var": "error",
};

export default [
  {   // the browser app: every module is plain script sharing one scope, checked as one bundle (dist/app.check.js)
    files: ["dist/app.check.js"],
    languageOptions: {ecmaVersion: 2022, sourceType: "script", globals: {...globals.browser, claude: "readonly"}},
    rules: {...common, "no-unused-vars": ["error", {vars: "local", args: "none", caughtErrors: "none"}],
      "no-fallthrough": "warn", eqeqeq: ["warn", "smart"], "no-cond-assign": "warn", "no-constant-condition": "warn"},
  },
  {   // the server, its command line and its tests
    files: ["webapp/server.js", "webapp/lib/**/*.js", "webapp/test/**/*.js"],
    languageOptions: {ecmaVersion: 2022, sourceType: "commonjs", globals: {...globals.node}},
    rules: {...common, eqeqeq: ["error", "smart"]},
  },
  {   // the service worker and the push console page
    files: ["webapp/client/sw.js", "webapp/client/console.js"],
    languageOptions: {ecmaVersion: 2022, sourceType: "script", globals: {...globals.serviceworker, ...globals.browser}},
    rules: {...common, eqeqeq: ["error", "smart"]},
  },
];
