#!/usr/bin/env sh
# Builds everything, lints every file and runs the server tests. Browser tests: see README.
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py
[ -d tools/lint/node_modules ] || npm ci --prefix tools/lint --silent
npx --prefix tools/lint eslint -c tools/lint/eslint.config.mjs --max-warnings 0 \
  dist/app.check.js webapp/server.js webapp/lib webapp/test webapp/client/sw.js webapp/client/console.js
(cd webapp && npm test)
ruff check --config config/ruff.toml modelling satellite world
echo "All checks passed."
