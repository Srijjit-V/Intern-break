# AGENTS.md

Guidance for AI coding tools. The canonical rules are in [CLAUDE.md](CLAUDE.md); read it first. Short version:

- Stack: React 19, Vite, Express 5, better-auth, Drizzle, MySQL 8.
- Verify before claiming: `npm run lint && npm run type-check && npx vitest run`, then Playwright for behavior changes.
- Never trust the client for roles or points. Never commit secrets. Schema changes need a Drizzle migration.
- Demo mode must make no `/api` requests.
- Decisions: `docs/adr/`. Status: `docs/STATUS.md`. Map: `docs/ARCHITECTURE.md`.
