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
| 8 | Hydration mismatch (React #418) on every page of the full build | open any page on `npm start`, see the console | The cookie banner is mounted only after hydration | `rooms-and-games.spec.ts` asserts no page errors |
| 9 | Two `<main>` landmarks on game pages (nested layouts) | inspect `/typing-race` | not fixed, accessibility only | none |
| 10 | Leftover `sprtslp.com` canonical links and a "GoDaddy email" label | view source on `/login`, open `/signup` | Relative canonicals, label is "Email" | none |
| 11 | Nobody else could join a typing race | User A opens the page and presses Start Race; user B never sees a joinable lobby | Start Race only opens the lobby; everyone presses Ready up, the countdown starts when all are ready | `cross-play.spec.ts` |
| 12 | Race results showed only the local player | Two users finish a race; each results screen lists one racer | Client keeps the final standings when the server closes the race | `cross-play.spec.ts` |
| 13 | Spinner forever when the API is unreachable | Block `/api/**` and open any page | `ProtectedRoute` shows a "Can't reach the server" panel with Retry | `edge.spec.ts` |

## Known and not fixed

- React error #419 in the console on some pages: the server renders with `renderToString`, which cannot resolve the lazy route components, so the client renders them instead. Pages work; fixing it means moving to streaming SSR.
- Points, scores and gold are client-authoritative: the client sends them and the server keeps the larger value. A player can inflate their own points.
- If every member leaves a room, the next person to join with its code becomes admin.
- `SESSION_RECOVERY` reloads once per tab on a stale cookie; unverified in tests.
