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
  {   // the browser app: ES modules, bundled by tools/build.py. The page supplies GEO, WORLD and MAPLIB_URL;
      // claude.ai supplies window.claude (the web app's layer, src/web/, provides the same on your own domain).
    files: ["src/**/*.js"],
    languageOptions: {ecmaVersion: 2022, sourceType: "module",
      globals: {...globals.browser, claude: "readonly", GEO: "readonly", WORLD: "readonly", MAPLIB_URL: "readonly"}},
    rules: {...common, eqeqeq: ["warn", "smart"], "no-fallthrough": "warn", "no-cond-assign": "warn", "no-constant-condition": "warn",
      "no-restricted-syntax": ["error", {selector: "ImportExpression[source.type='Literal']", message: "Load the app's own code through import statements, so the bundle holds all of it."},
        {selector: "ExportDefaultDeclaration", message: "Use named exports, so every import says what it takes."}]},
  },
  {   // FLOODSIM against SFINCS: runs the browser's flood model under Node
    files: ["modelling/*.mjs"],
    languageOptions: {ecmaVersion: 2022, sourceType: "module", globals: {...globals.node}},
    rules: {...common, eqeqeq: ["error", "smart"]},
  },
  {   // the server, its command line and its tests
    files: ["webapp/server.js", "webapp/lib/**/*.js", "webapp/test/**/*.js", "webapp/load/**/*.js"],
    languageOptions: {ecmaVersion: 2022, sourceType: "commonjs", globals: {...globals.node}},
    rules: {...common, eqeqeq: ["error", "smart"]},
  },
  {   // the service worker and the push console page
    files: ["webapp/client/sw.js", "webapp/client/console.js"],
    languageOptions: {ecmaVersion: 2022, sourceType: "script", globals: {...globals.serviceworker, ...globals.browser}},
    rules: {...common, eqeqeq: ["error", "smart"]},
  },
];
