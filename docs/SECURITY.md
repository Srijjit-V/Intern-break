# Security and threat model

Reporting a vulnerability: see the root [SECURITY.md](../SECURITY.md). This page says what is protected, what is not, and how it was checked.

## What it protects against (and the test)

| Threat | Control | Evidence |
| --- | --- | --- |
| Making yourself room admin | roles decided by the server; creator is admin and cannot be demoted | `edge.spec.ts` (takeover, role, demotion) |
| Taking over an emptied room | admin only goes to the stored creator | `edge.spec.ts` |
| Reading or joining another room's race | membership required on every race call | `race-lifecycle.spec.ts` |
| Forged points, diamonds, high scores | earn budget, per-game caps | `earn-budget.test.ts`, `score-caps.test.ts`, `edge.spec.ts` |
| Free or cheap rewards | server price table, own account row, limits, admin fulfils | `edge.spec.ts`, `reward-catalog.test.ts` |
| Spending another member's balance by name | redeem uses the caller's account row only | `edge.spec.ts` |
| Brute-forcing sign-in | limits per IP, per IP+email, per account (`429`) | `security.test.ts`, `edge.spec.ts` |
| Cross-origin writes | same-origin guard on `/api` writes (scheme, host, port); `Sec-Fetch-Site` check | `security.test.ts` |
| XSS, clickjacking, sniffing | CSP (`script-src 'self'`, no inline scripts, `frame-ancestors 'none'`), `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS over https | `security.test.ts`, e2e asserts no CSP violations |
| Hidden trackers | the GoDaddy tracker was removed; e2e fails if any third-party host other than Google Fonts is contacted | `edge.spec.ts` |
| Spoofed client IP | `TRUST_PROXY` is a hop count, never `true` | `security.test.ts` |

Session cookie: `HttpOnly`, `SameSite=Lax`; `Secure` is added by better-auth when `BETTER_AUTH_URL` is https. Measured on http://localhost; the `Secure` flag over https was not observed.

## What it does not protect against

- **Inflation within the budget.** The client reports its own totals; a determined player can still gain up to 150 points and 400 diamonds an hour. Rewards need admin fulfilment, which is the real backstop. Server-computed awards and play-session tokens are not built (ADR 0002).
- **Rate limits are in memory, per process.** Several instances need a shared limiter in front. At 50,000 tracked keys, unknown keys are refused until entries expire (fail closed).
- **Display names are not identities.** Two members can share one. Account ids are used for money-like actions.
- **No email verification or password reset**: there is no mail provider. Anyone can sign up with any address.
- **No MFA, no account lockout notices, no audit log.**
- **Dependencies**: `npm audit` was not run clean. Several Dependabot major bumps are open and not merged.
- **Google Fonts** is loaded from Google (a CSP-allowed third party); self-hosting would remove it.
- The `style-src 'unsafe-inline'` is needed for React inline styles.

## Privacy

Collected: email, name, display name and avatar colour, room membership, scores, points, race results, and a session cookie. No analytics or advertising. The demo build stores everything in the browser's localStorage and sends nothing.

## Checks run

CSP, header, cookie and rate-limit behaviour were measured with `curl` and Playwright against a production-mode build. `npx ecc-agentshield@1.6.0 scan` on `.claude/`: 0 critical, 0 high, 5 medium (agent files over 5000 characters). A full dependency audit and an external penetration test were not done.
