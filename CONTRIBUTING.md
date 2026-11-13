# Contributing

Small, focused pull requests against `main`. One concern per PR, and say `Closes #n` when it fixes an issue.

```bash
cp .env.example .env     # set BETTER_AUTH_SECRET
docker compose up -d db  # MySQL on localhost:3306 (see docs/development.md)
npm ci
npm run db:migrate && npm run db:seed
npm run dev
```

Before you push:

```bash
npm run lint && npm run type-check && npx vitest run
npx playwright test --project=demo   # needs the demo preview, see docs/development.md
```

Rules of thumb:

- Changing `src/server/db/schema.ts` means running `npm run db:generate` and committing the new file in `drizzle/`.
- New logic gets a small test. Bug fixes get a test that fails without the fix.
- No secrets, no real people's data in seeds, tests or screenshots.
- The project is MIT licensed (see LICENSE); contributions are accepted under the same license.
