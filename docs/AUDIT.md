# Audit

Brownfield retrospective of the repository as of 2026-11-24, done with the `brownfield-retrospective` method (measure first, then fix test first). Each "suspect" from the README was checked against the running app before being trusted. Fixed items point at their test.

## Must fix

| # | What | Problem | Fix | If skipped | Status |
| --- | --- | --- | --- | --- | --- |
| M1 | Points, diamonds and high scores are client-authoritative | A forged request set any total; physical rewards could be redeemed free | Earn budget, per-game score caps, server price table, own-account redeem, redemption limits ([ADR 0002](adr/0002-points-trust-model.md)) | Anyone can top the board and claim merch | **Mitigated**, not eliminated. Tests: `edge.spec.ts`, `earn-budget.test.ts`, `score-caps.test.ts` |
| M2 | Redeem could spend another member's balance | Name-based fallback matched someone else's row | Redeem uses the caller's account row only | Theft of balances | **Fixed**. `edge.spec.ts` |
| M3 | Next joiner of an empty room became admin | Admin was derived from "no members" | Stored creator (`created_by_account_id`); creator cannot be demoted | Room takeover | **Fixed**. `edge.spec.ts` |
| M4 | A hidden GoDaddy tracker loaded for every visitor | Cookie banner loaded `wsimg.com` script regardless of consent | Removed the banner and loader; e2e fails on any other third-party host | Privacy breach, CSP conflict | **Fixed**. `edge.spec.ts` |
| M5 | No security headers, no CSP | Measured: only `X-Powered-By` | Headers and CSP, inline hydration script removed | XSS and framing exposure | **Fixed**. `security.test.ts` |
| M6 | No auth rate limiting | Measured: 12 wrong passwords all got 401 | Per-IP, per-IP+email and per-account limits | Credential stuffing | **Fixed**. `security.test.ts`, `edge.spec.ts` |
| M7 | Race API ignored room membership | Any user could read or join any room's race | Membership required | Privacy and griefing | **Fixed** (earlier). `race-lifecycle.spec.ts` |
| M8 | A silent disconnect blocked the room for ever | An active race with 3+ racers never expired | `advanceRace` closes an idle race after 2 minutes | Room stuck | **Fixed**. `race-rules.test.ts`, `race-lifecycle.spec.ts` |

## Should fix

| # | What | Problem | Fix | If skipped | Status |
| --- | --- | --- | --- | --- | --- |
| S1 | Cross-origin POST with a session cookie returned 201 | No server-side origin check | Same-origin guard on `/api` writes (mounted on the router so `/API` cannot bypass it) | CSRF if SameSite is ever relaxed | **Fixed**. `security.test.ts` |
| S2 | `trust proxy` was always on | Spoofable IP, so rate limits could be walked around | `TRUST_PROXY` hop count, never `true` | Rate-limit bypass | **Fixed** |
| S3 | React error #418 and #419 on every page | Cookie banner outside the SSR tree; `renderToString` cannot wait for lazy routes | `prerender`; banner removed. Hydration errors now fail e2e | Console errors, wasted client re-render | **Fixed** |
| S4 | WPM counted words, not characters/5 | Non-standard and inconsistent with the spec | `wpmFromChars`, tested; server cap 350 | Misleading speeds | **Fixed**. `typing-math.test.ts` |
| S5 | Large client chunks | Entry 348 kB (112 kB gzip) | Named vendor chunks: entry 45 kB (15 kB gzip). Total unchanged at about 325 kB gzip | Slower first load, poor caching | **Fixed** for chunking; total size not reduced |
| S6 | 26 lint warnings | Unused disables, `any`, hook dependencies | Fixed at the cause | Noise hides real warnings | **Fixed** (0) |
| S7 | Impossible high scores accepted | Profile JSON merged unchecked | `sanitizeProfile` | Leaderboard vandalism | **Fixed**. `score-caps.test.ts` |
| S8 | Compose was not re-run | Docker Desktop failed (disk full) | CI `containers` job runs compose on every push | Unverified deploy path | **Open**: see Not checked |

## Nice to have

- **Snake placement points look inverted**: `awardGamePoints(user, placement)` gives rank 1 one point and rank 5 five. Not changed: it is a game-rules decision.
- `motion` is 128 kB raw (42 kB gzip); `LazyMotion` would cut it. Not done.
- `_virtual_content` is a 79 kB chunk of all page text. Not split.
- Two `<main>` landmarks on game pages. Not fixed.
- Dependabot major bumps (zod 4, tailwind 4, jsdom 31, eslint 10) are open and not merged.
- Self-host the fonts to drop the Google Fonts dependency.
- Polling is fine at 5 racers (4 requests per second, p95 19 ms); see [ADR 0003](adr/0003-polling-vs-sse.md).

## Verdict

The app was functional but trusted its clients and exposed no defenses. The money-like paths (rewards, roles, race access) are now enforced on the server and tested. It is safe for a friendly internal team with an admin who fulfils rewards. It is **not** safe to attach real prizes to: points can still rise up to the hourly budget, and play-session tokens with server-computed awards are not built.

## What was not checked

- `docker compose up --build` on the final code (Docker Desktop failed on this machine).
- Anything on a real hosted deployment (none exists).
- Secure cookie flag over https; HSTS over https.
- `npm audit` results and the Dependabot major upgrades.
- Touch controls, reduced motion and phone layout of each game; the eight games other than Trivia and Typing Race were not played to a saved score by the tests (see [VERIFICATION.md](VERIFICATION.md)).
- Accessibility beyond what was noticed.
- Load beyond five clients; multiple server instances.
