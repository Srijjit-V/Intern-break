# Baseline (before any changes)

Fresh checkout of `main` at `ccb1ec4`, Node v24.15.0, macOS arm64.

| Step | Result |
| --- | --- |
| `npm ci` | FAILS. Lockfile out of sync (yjs, lib0, isomorphic.js missing). |
| `npm install` | OK, 866 packages. |
| `npm run type-check` | passes |
| `npm run lint` | FAILS. 263 problems (237 errors, 26 warnings). |
| `npm test` | 91 pass, 5 fail in 3 files (`entry.test.ts` alias, `llms-txt.test.ts`, `format-overrides-plugin.test.ts` x4). |
| `npm run build` | passes, writes `dist/client` and `dist/server.bundle.mjs` |
| `node dist/server.bundle.mjs` | CRASHES: `Database configuration file not found at /local/config.json` |

Secret scan (gitleaks, full history, 2 commits): 2 hits, both the dummy hex
string used as a fixture in `src/server/indexnow-key.test.ts`. Not secrets.
