#!/usr/bin/env sh
# Builds everything, lints every file and runs the server tests. Browser tests: see README.
set -e
cd "$(dirname "$0")/.."
[ -d tools/lint/node_modules ] || npm ci --prefix tools/lint --silent   # the bundler, ESLint and axe-core
python3 tools/build.py
npx --prefix tools/lint eslint -c tools/lint/eslint.config.mjs --max-warnings 0 \
  src webapp/server.js webapp/lib webapp/test webapp/load webapp/client/sw.js webapp/client/console.js modelling/floodsim_run.mjs
(cd webapp && npm test)
ruff check --config config/ruff.toml modelling satellite world
echo "All checks passed."
