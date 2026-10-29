#!/usr/bin/env sh
# Builds everything, lints every file and runs the server tests. Browser tests: see README.
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py
L="npx --yes eslint@8.57.0 --no-eslintrc"
$L -c config/eslint-app.json dist/app.check.js
$L -c config/eslint-node.json webapp/server.js webapp/lib webapp/test
$L -c config/eslint-worker.json webapp/client/sw.js webapp/client/console.js
(cd webapp && npm test)
if command -v ruff >/dev/null 2>&1; then ruff check --config config/ruff.toml modelling satellite world; fi
echo "All checks passed."
