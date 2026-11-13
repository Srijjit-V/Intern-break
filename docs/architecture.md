# Architecture

One Express process serves the API, the server-rendered shell and the built client. MySQL holds accounts, rooms, members and races. Points, scores and avatar state also live in the browser (`src/lib/ibs-store.ts`) and are synced to the server.

```mermaid
flowchart LR
  B[Browser<br/>React 19 SPA]:::client
  D[Demo build<br/>VITE_DEMO_MODE]:::demo
  F[In-browser demo API<br/>localStorage]:::demo
  S[Express 5<br/>API + SSR shell + static files]:::server
  A[better-auth<br/>email and password]:::server
  O[Drizzle ORM]:::server
  M[(MySQL 8)]:::db

  B -- "/api/*" --> S
  S --> A --> O
  S --> O --> M
  D -- "fetch shim answers /api" --> F
  D -.->|"no server, no requests"| S

  classDef client fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
  classDef server fill:#dcfce7,stroke:#15803d,color:#0f172a
  classDef db fill:#fef3c7,stroke:#b45309,color:#0f172a
  classDef demo fill:#fce7f3,stroke:#be185d,color:#0f172a
```

## Typing Race lifecycle

The client polls `GET /api/races` every second and posts progress; the server advances the state on each read.

```mermaid
stateDiagram-v2
  [*] --> lobby: POST start
  lobby --> lobby: join (max 5)
  lobby --> countdown: everyone ready (startsAt = now + 3s)
  countdown --> active: GET after startsAt
  countdown --> finished: stale (15s past start)
  active --> active: POST progress (poll 1s)
  active --> finished: all racers finished or left
  active --> finished: lone racer idle 120s
  finished --> [*]
```

## Points flow

```mermaid
flowchart LR
  G[Game score]:::a --> P[Points and gold<br/>ibs-store, localStorage]:::a
  C[Daily challenge]:::a --> P
  P -- "sync-member (only goes up)" --> L[(company_members)]:::db
  L --> LB[Leaderboard]:::b
  P --> SH[Avatar shop<br/>spends gold]:::b
  L -- "redeem (atomic debit)" --> R[Rewards catalog<br/>reward_redemptions]:::b
  R --> AD[Admin marks fulfilled]:::b

  classDef a fill:#dbeafe,stroke:#1d4ed8,color:#0f172a
  classDef b fill:#dcfce7,stroke:#15803d,color:#0f172a
  classDef db fill:#fef3c7,stroke:#b45309,color:#0f172a
```

## Key decisions

- **Roles are server-decided.** The first member of an empty room is admin; the client cannot choose a role.
- **Same origin.** better-auth uses `window.location.origin` and cookie sessions, so the API and client must share an origin.
- **Demo mode gates at the edges.** `src/lib/demo/demo-api.ts` replaces `fetch` for `/api`, and `src/lib/auth/auth-client.tsx` supplies a local session. Pages are unchanged.
