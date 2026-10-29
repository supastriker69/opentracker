# Contributing to Open Tracker

Thank you for helping. There are three ways to contribute.

## 1. Report floods, corrections and data (no coding needed)

Use **Help improve Open Tracker** in the app: report a flood, suggest a correction, share a data source, or use the suggestion box.

- **Add a source** (news report, official notice, photo or video link). Reports with sources are checked first.
- **Never include personal details** (names, phone numbers, faces of children).
- Administrators check every contribution against official sources before anything changes on the map.

## 2. Improve the code

- Work in `src/` (the app), `webapp/` (server and web-app files) or `tools/`. Never edit `dist/`; it is rebuilt by `python3 tools/build.py`.
- **One concern per module.** Modules talk through a few named functions. Don't reach into another module's internals.
- **Every write goes through `REPO`** (claude.ai page) or the validated API (server). Never write to the database directly from a view.
- **Escape everything you display** with `esc()`, and render only links that pass `safeUrl()`.
- **Plain words in the interface.** Open Tracker is for every age and reading level.
- Before opening a pull request, run the linter and all tests: `npm test` in `webapp/`, the browser scenarios in `tests/e2e/`, and the web app test.

## 3. Add a country or region

Add areas, climate zones, dams, flood areas and sourced past floods to `src/data/data.js`. Add the country's agencies, and its official outlook lists in Model settings. Then add tests that open the new areas.

## Code of conduct

Be respectful. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
