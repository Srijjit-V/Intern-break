# Deployment

Three ways to run it.

## 1. GitHub Pages (static demo)

`.github/workflows/pages.yml` builds `npm run build:pages` and deploys to `https://srijjit-v.github.io/Intern-break/`. It has no server: sign in is replaced by a local profile, data stays in the browser, rooms and the leaderboard show labeled sample data, and Typing Race is solo practice. Enable it once under Settings > Pages > Source: GitHub Actions.

## 2. Docker Compose (full app)

```bash
cp .env.example .env
# edit .env: set BETTER_AUTH_SECRET (openssl rand -base64 32) and the DB passwords
docker compose up --build
```

Open http://localhost:3000. Compose starts MySQL 8.4 with a named volume, runs migrations once, then starts the app, bound to 127.0.0.1. Optional demo data: `docker compose run --rm migrate npx tsx scripts/seed.ts`.

## 3. Public full-stack hosting (not deployed yet)

Recommended: **Railway**. It runs the Dockerfile and offers a managed MySQL. It is not free beyond a small trial credit, so check current pricing. `railway.json` is already in the repo (Dockerfile build, migrations as a pre-deploy command, health check on `/api/health`).

```bash
npm i -g @railway/cli
railway login
railway init                       # new project
railway add --database mysql
railway up                         # builds and deploys the Dockerfile
```

Then in the service's Variables set:

| Variable | Value |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | reference the MySQL service variables (`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | the public `https://...` URL Railway gives the service (generate a domain under Settings > Networking) |

Keep the whole app on one origin: better-auth uses `window.location.origin` and cookie sessions, so do not put the API on a different domain. After deploy, sign up, create a room, and run a two-user race from two browsers to verify.

Other hosts work if they run a Node 22 container, a MySQL 8 database, and set the same variables. Set `DB_SSL=true` for managed databases that require TLS.

## Timestamps are UTC

The database connection reads and writes all timestamps as UTC (`timezone: 'Z'`, session `time_zone = '+00:00'`). A fresh database needs nothing. If you point the app at a database that an older build wrote from a non-UTC Node host, convert its `TIMESTAMP`/`DATETIME` values first (for example `CONVERT_TZ(col, '<old zone>', '+00:00')`) or expect sessions and race ages to be off by the zone difference. Signing everyone out (`DELETE FROM session`) is the simple safe reset.
