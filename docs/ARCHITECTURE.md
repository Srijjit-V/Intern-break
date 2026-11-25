# Architecture

One Express process serves the API, the server-rendered shell and the built client. MySQL holds accounts, rooms, members, races and the earn log. Points, scores and avatar state are also kept in the browser (`src/lib/ibs-store.ts`) and synced to the server, which caps them (see [SECURITY.md](SECURITY.md)).

## System

```mermaid
flowchart LR
  B[Browser<br/>React 19 SPA]:::client
  D[Demo build<br/>VITE_DEMO_MODE]:::demo
  F[In-browser demo API<br/>localStorage]:::demo
  S[Express 5<br/>headers, CSP, rate limits<br/>API, SSR shell, static files]:::server
  A[better-auth<br/>email and password]:::server
  O[Drizzle ORM]:::server
  M[(MySQL 8)]:::db
  B -- "/api/*" --> S
  S --> A --> O
  S --> O --> M
  D -- "fetch shim answers /api" --> F
  classDef client fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
  classDef server fill:#dcfce7,stroke:#15803d,color:#0f172a
  classDef db fill:#fef3c7,stroke:#b45309,color:#0f172a
  classDef demo fill:#fce7f3,stroke:#be185d,color:#0f172a
```

## Typing Race state machine

Event transitions are in `src/server/api/races/POST.ts`; time- and data-driven ones are one pure function, `advanceRace()` in `src/server/race-rules.ts`, applied on every read. Clients poll `GET /api/races` every second.

```mermaid
stateDiagram-v2
  [*] --> lobby: start
  lobby --> lobby: join (max 5) or ready (not everyone)
  lobby --> countdown: ready, and everyone is ready
  lobby --> finished: idle 10 min, or 30 min and quiet 2, or 45 min
  countdown --> active: startsAt passed
  countdown --> finished: startsAt missing or 15 s past
  active --> active: progress
  active --> active: leave (DNF), others still racing
  active --> finished: everyone finished or left
  active --> finished: no activity from anyone for 2 min
  finished --> [*]
```

| From | Event or condition | To | Test |
| --- | --- | --- | --- |
| (none) | `start` by a room member | lobby | `race-lifecycle.spec.ts` "start -> lobby" |
| lobby | `join` (not full, not started) | lobby | same, plus "a sixth racer is rejected" |
| lobby | `ready`, not everyone ready | lobby | "start -> lobby, join ..." |
| lobby | `ready`, everyone ready | countdown (starts in 3 s) | same |
| lobby | abandoned | finished | `race-rules.test.ts`, "an abandoned lobby closes" |
| countdown | `startsAt` passed | active | `race-rules.test.ts`, lifecycle spec |
| countdown | missing or 15 s past `startsAt` | finished | "a stale countdown closes" |
| active | `progress` | active | lifecycle spec |
| active | `leave` | active (leaver DNF, progress -1) or finished if nobody is left | "a player leaving mid-race" |
| active | all finished or left | finished | lifecycle spec |
| active | idle 2 min | finished | "a silent disconnect cannot block the room" |
| any open | `join` or `start` after countdown began | rejected 409 | "a late join is rejected" |
| any | a non-member of the room | rejected 403 | "wrong room code" |

Not a state change but covered: two races in two rooms are independent, a host leaving does not end the race, a refresh loses nothing (state lives on the server).

## Points and rewards flow

```mermaid
flowchart LR
  G[Game score]:::a --> P[Points, gold, diamonds<br/>ibs-store, localStorage]:::a
  C[Daily challenge]:::a --> P
  P -- "sync-member: totals are requests" --> K{Earn budget<br/>150 pts and 400 diamonds per hour}:::s
  K --> L[(company_members)]:::db
  P -- "profile high scores" --> X{Score caps per game}:::s --> L
  L --> LB[Leaderboard]:::b
  L -- "redeem: server price, 3 open, 5 per day" --> R[(reward_redemptions)]:::db
  R --> AD[Admin marks fulfilled]:::b
  classDef a fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
  classDef b fill:#dcfce7,stroke:#15803d,color:#0f172a
  classDef s fill:#fee2e2,stroke:#b91c1c,color:#0f172a
  classDef db fill:#fef3c7,stroke:#b45309,color:#0f172a
```

## Auth and session flow

```mermaid
sequenceDiagram
  participant B as Browser
  participant S as Express
  participant A as better-auth
  participant D as MySQL
  B->>S: POST /api/auth/sign-in/email (Origin: same origin)
  S->>S: security headers, origin guard, rate limiters (IP, IP+email, email)
  S->>A: handler
  A->>D: check password hash, create session
  A-->>B: Set-Cookie better-auth.session_token (HttpOnly, SameSite=Lax, Secure over https)
  B->>S: GET /api/company (cookie)
  S->>A: getSession(cookie)
  A->>D: load session
  S-->>B: 200 data, or 401 if no session
```

## Demo mode

```mermaid
flowchart LR
  M[main.tsx] -->|"VITE_DEMO_MODE=true"| I[installDemoApi<br/>replaces window.fetch]
  I --> R{path starts with /api?}
  R -- yes --> L[handlers in demo-api.ts<br/>state in localStorage]
  R -- no --> X[rejected: demo never makes a network call]
  AC[auth-client.tsx] -->|demo| LS[local session, no server]
```

## Decisions

See [adr/](adr/): [0001](adr/0001-selective-ecc-install.md) tooling, [0002](adr/0002-points-trust-model.md) points trust, [0003](adr/0003-polling-vs-sse.md) polling, [0004](adr/0004-full-stack-hosting.md) hosting.
