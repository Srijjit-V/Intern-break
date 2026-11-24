# Intern Break Space

Social arcade for internship teams: sign in, join a room by code, play nine mini-games, earn points, spend them in a shop and rewards catalog. React 19 + Vite SPA, Express 5 (API + SSR shell), better-auth, Drizzle + MySQL 8. A static demo build runs on GitHub Pages with no server.

## Constitution (rules)

- Never commit `.env`, secrets or the tarball. Never print secret values.
- Never weaken, skip or delete a test to make it pass. Fix the cause. A removed test needs a written reason in the commit.
- Schema changes go through `npm run db:generate` plus a committed file in `drizzle/`. CI fails on drift.
- Demo mode (`VITE_DEMO_MODE=true`) must make zero `/api` requests. All nine games stay playable.
- Roles and points are decided by the server, never trusted from the client.
- No force push to `main`. Small commits, clear messages. Fake data only in seeds, tests and screenshots.
- No em dashes in docs. Say what is not verified as plainly as what is.

## Where things are (map)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/index.md](docs/index.md).

- `src/server/entry.ts` Express app; `src/server/api/<route>/<METHOD>.ts` one file per route
- `src/server/db/` config (env), client, `schema.ts`; migrations in `drizzle/`
- `src/lib/auth/` better-auth server and client; `src/lib/ibs-store.ts` client points and scores
- `src/lib/demo/` demo mode (fetch shim and local session)
- `src/pages/` one file per page and game; `src/routes.tsx` routes
- `tests/e2e/full` and `tests/e2e/demo` Playwright; unit tests next to code (`*.test.ts`)

## Commands

```bash
npm ci && npm run lint && npm run type-check && npx vitest run
npm run build && npm start            # needs DB_* or DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
npm run db:generate | db:migrate | db:seed
npm run build:pages                   # static demo in dist/pages
npx playwright test --project=full    # against a running app (E2E_BASE_URL)
npx playwright test --project=demo    # against the Pages build preview
```

No Docker? `mysql-memory-server` (npm) gives a local MySQL for testing; see docs/development.md.

## Conventions

- TypeScript strict. Tests first for fixes (a test that fails without the fix).
- Status lives in [docs/STATUS.md](docs/STATUS.md); decisions in [docs/adr/](docs/adr/). Update `.project-memory/STATE.md` after meaningful work.
- `.claude/` holds a pinned, trimmed ECC subset (ADR 0001). Hooks are off on purpose.

## Do not

- Do not enable ECC hooks (dev-server and pre-commit blockers fight local servers and git flow).
- Do not add third-party analytics to the demo build.
- Do not move to Server-Sent Events without the measurement in ADR 0003.
