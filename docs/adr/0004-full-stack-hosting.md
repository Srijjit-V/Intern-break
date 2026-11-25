# 0004. Full-stack hosting: Railway recommended, not deployed

Status: proposed, 2026-11-24. Nothing is deployed; no hosting account was used.

## Needs
A Node 22 container, MySQL 8, one origin (better-auth uses cookies and `window.location.origin`), `TRUST_PROXY=1`, always on (live races poll every second).

## Options, from each host's own pages as read on 2026-11-24 (verify before buying)
- **Railway**: a Trial of $5 once for 30 days with no card, a Free plan of $1 of usage per month whose services sleep when idle, and Hobby at $5 a month with $5 of usage included, needed for always-on services. Managed MySQL exists; its price counts against usage. [docs.railway.com/pricing/plans](https://docs.railway.com/pricing/plans), [free plan](https://docs.railway.com/pricing/free-plan).
- **Render**: free web services spin down after 15 minutes without traffic and take up to a minute to wake; free services cannot attach a persistent disk, so MySQL needs a paid plan with a disk at $0.25 per GB per month; private services start at a paid tier. [render.com/docs/free](https://render.com/docs/free).
- **Fly.io**: sources conflict on whether a free allowance still exists for new accounts; the pricing page lists shared-cpu-1x 256 MB at about $1.94 to $2.19 a month and volumes at $0.15 per GB per month. MySQL would be self-run on a volume. [fly.io/pricing](https://fly.io/pricing).

## Decision
Railway: it has managed MySQL, builds our Dockerfile (`railway.json` exists), and runs migrations as a pre-deploy step. Expect to pay: Hobby is the realistic always-on tier. Steps and variables are in [deployment.md](../deployment.md).

## Consequences
The static demo on GitHub Pages stays free and is what the README links. A public full-stack URL needs a Railway login and a human decision to spend money, so it is not done.
