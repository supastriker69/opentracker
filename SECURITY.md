# Security policy

Please report security problems privately to the maintainers (do not open a public issue). Include steps to reproduce and the version or commit. We aim to acknowledge reports within 3 working days.

## In scope
- The Open Tracker web app server (`webapp/`) and its API
- The app code in `src/` (for example cross-site scripting or permission bypasses)
- The build tools

## Design notes for reviewers
- API keys are random 256-bit tokens, stored only as SHA-256 hashes and compared in constant time.
- All inputs are validated server-side, with size limits and rate limits. Cross-site `POST`s are refused.
- A strict Content Security Policy allows scripts only from the site itself.
- Agency and public content is escaped before display, and only `http(s)` links are rendered.
- In the claude.ai page, database rules enforce that agency accounts, contributors and analytics write only their own documents. People with Editor access are trusted by the platform, so grant it carefully.
