# 0002. Points: cap and validate, not full server authority (yet)

Status: accepted, 2026-11-24. Revisit when real prizes are at stake.

## Context
Scores, gold, diamonds and points are computed in the browser (`ibs-store.ts`) and synced; the server used to keep the larger value. Anyone could raise their own totals, high scores and reward balance with devtools or a hand-made request, then redeem physical rewards.

## Options
1. **Full server authority**: a play-session token at game start, server-side duration and score checks, the server computes every award. Right answer, but it means reworking all nine games and the challenge flow, whose award code is spread over the client.
2. **Cap and validate at the server** (chosen): the client's numbers stay requests, but the server bounds them.

## Decision
- Earn budget (`earn-budget.ts`): points and all-time points rise at most 150 per hour and 400 per day; reward currency 400 and 1000. Debited through `earn_log`. Env-tunable.
- Per-game score caps on profile high scores (`score-caps.ts`); impossible ones are dropped. Typing is capped at 350 WPM.
- Redemptions: price from a server table (a test keeps it equal to `rewards.json`), only the caller's own account row, at most 3 open and 5 per day, and an admin still fulfils each one.
- Roles and room creation are server-decided (creator is admin, cannot be demoted).

## Consequences
- A cheater can still raise totals up to the budget, so inflation is slowed, not prevented. See [SECURITY.md](../SECURITY.md).
- Not done: play-session tokens and server-computed awards. That is the follow-up if the economy ever matters.
- The cap defaults sit above what the rules can pay (personal challenge at most 15, move challenge at most 25 per day); company challenges are set by admins, so a large company challenge near the cap is clamped.
