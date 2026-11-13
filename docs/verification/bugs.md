# Bugs found and fixed

Found while making the app run outside Airo and testing it. Each has a test.

| # | Bug | Repro | Fix | Test |
| --- | --- | --- | --- | --- |
| 1 | App crashes on start outside Airo | `node dist/server.bundle.mjs` with no `/local/config.json` | DB config reads `DATABASE_URL` or `DB_*` | `docker compose up` smoke, CI `containers` job |
| 2 | Any user could make themselves room admin | `POST /api/company {action:"sync-member", role:"admin"}` for someone else's room | Server ignores client role: first member of an empty room is admin, others employee | `tests/e2e/full/edge.spec.ts` |
| 3 | Negative redeem amount added points | `POST /api/company {action:"redeem", points:-50}` | Require a positive integer; debit is one atomic conditional `UPDATE` | `edge.spec.ts` |
| 4 | Any signed-in user could read or join another room's typing race | `GET /api/races?roomCode=<other room>` | Race API requires room membership (`403`) | `cross-play.spec.ts` |
| 5 | Claiming a pre-auth roster row by name could inherit admin | join with the display name of an unclaimed admin row | Claimed rows never keep `admin` or `coadmin` | code review, no automated test |
| 6 | Logo and game thumbnails 404 outside Airo | open `/games` on a standalone build | Use the real files in `public/games/`; logo is the monogram (the exported `ibs-logo.png` is an empty file) | `demo.spec.ts` asserts no failed responses |
| 7 | Absolute `/login`, `/rewards` links break under a sub-path | open the demo on `/Intern-break/` and sign out | Base-aware links and router `basename` | `demo.spec.ts` |
| 8 | Two `<main>` landmarks on game pages (nested layouts) | inspect `/typing-race` | not fixed, accessibility only | none |

## Known and not fixed

- Points, scores and gold are client-authoritative: the client sends them and the server keeps the larger value. A player can inflate their own points.
- If every member leaves a room, the next person to join with its code becomes admin.
- `SESSION_RECOVERY` reloads once per tab on a stale cookie; unverified in tests.
