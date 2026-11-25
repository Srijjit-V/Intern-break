# 0003. Keep one-second polling for Typing Race

Status: accepted, 2026-11-24

## Context
Race clients poll `GET /api/races` every second. The question was whether Server-Sent Events (SSE) would be a real improvement.

## Measurement
`scripts/measure-polling.mjs`, 5 racers on a local build (Node 24, local MySQL 8.4), 25 s, result in `docs/verification/polling-5-clients.json`:

- 100 poll requests, 4 requests per second in total (four pollers; one racer only sends progress).
- Request latency: p50 11.2 ms, p95 19.4 ms, max 25.5 ms.
- A progress update is visible to a polling client within one poll interval: at most about 1 s plus the latency above, 0.5 s on average by construction. The first of four clients saw it after a median of 123 ms (p95 427 ms).

## Decision
Keep polling. SSE would save at most half a second of lag on average and remove about 4 idle requests per second for a five-person race, at the cost of long-lived connections, proxy buffering and timeout handling on every host, and a way to fan events out across instances. The measurement shows no problem for SSE to solve at this size.

## Consequences
- Revisit if races grow past about 20 racers per room or the host charges per request.
- Not measured: a hosted deployment, mobile networks, or many rooms at once.
