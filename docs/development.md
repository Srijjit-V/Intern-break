# Development

Needs Node 22+ and Docker (for MySQL).

```bash
cp .env.example .env              # set BETTER_AUTH_SECRET
docker compose up -d db           # MySQL; the db service is not published, see below
npm ci
npm run db:migrate
npm run db:seed                   # room DEMO01, admin@example.test, fake members
npm run dev                       # http://localhost:5173 (API in the same process)
```

`compose.yaml` does not publish MySQL's port. For `npm run dev` against it, either run everything in Docker (`docker compose up --build`) or start your own MySQL and point `DB_*` at it.

Seed accounts use the password `demo-password-123` (override with `SEED_PASSWORD`). They exist only for local use.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the API mounted |
| `npm run build` | client to `dist/client`, server to `dist/server.bundle.mjs` |
| `npm start` | run the built server |
| `npm run build:pages` | static demo to `dist/pages` |
| `npm run db:generate` / `db:migrate` / `db:seed` | Drizzle migrations and seed |
| `npm run lint`, `type-check`, `test` | quality checks |
| `npx playwright test --project=full` | e2e against `E2E_BASE_URL` (default `http://localhost:3000`) |
| `npx playwright test --project=demo` | e2e against the demo preview |

Demo preview for the e2e run:

```bash
npm run build:pages
VITE_BASE_PATH=/Intern-break/ npx vite preview --outDir dist/pages --port 4173
```
