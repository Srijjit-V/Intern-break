# API reference

All routes live in `src/server/api` and are registered in `src/server/entry.ts`. Bodies and responses are JSON. "Auth" means a better-auth session cookie; without one the route returns `401 {"error":"Sign in required"}`. Errors from unexpected failures are `500 {"error": "...", "message": "..."}`.

## Health

| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/health` | none | `{status:"ok", timestamp, message}` |

## Auth (better-auth)

`/api/auth/*` is handled by better-auth (`src/server/auth-middleware.ts`). Email and password only; no email verification. Useful routes: `POST /api/auth/sign-up/email` (`{email, password, name}`), `POST /api/auth/sign-in/email` (`{email, password}`), `POST /api/auth/sign-out`, `GET /api/auth/get-session`. `GET /api/auth/*?clearCookies=1` expires a stale session cookie.

## Account

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/account` | yes | none | `{account:{id,name,email}, rooms:[membership + companyName]}` |
| POST | `/api/account` | yes | `{action:"upsert-membership", roomCode, companyName?, displayName, avatarColor, avatarEmoji?}` | `201 {ok:true}`. Role is decided by the server: first member of an empty room is `admin`, others `employee`. |
| POST | `/api/account` | yes | `{action:"leave-room", roomCode}` | `{ok:true}` |

## Company (rooms, members, rewards)

| Method | Path | Auth | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/company?roomCode=` | yes | none | `{room, members, redemptions}`. `400` without a code, `404` for an unknown room. |
| POST | `/api/company` | yes | `{action:"sync-member", roomCode, companyName?, memberName, color, points?, allTimePoints?, carryoverPoints?, profile?}` | `201 {ok:true}`. Upserts the room and the caller's member row. Points only ever go up (`GREATEST`). |
| POST | `/api/company` | member | `{action:"sync-room-data", roomCode, roomData}` | `{ok:true}`; `403` if not a member |
| POST | `/api/company` | member | `{action:"redeem", roomCode, rewardName, points}` | `201 {ok:true, redemptionId}`; `400` if `points` is not a positive integer or the balance is too low (atomic debit) |
| POST | `/api/company` | admin or coadmin | `{action:"set-role", roomCode, role, accountId?|memberName}` | `{ok:true, member}` |
| POST | `/api/company` | admin or coadmin | `{action:"fulfill-redemption", roomCode, redemptionId}` | `{ok:true}` |

Roles: `admin`, `coadmin`, `manager`, `employee`. Anything else is `400`.

## Races (Typing Race)

Every action requires membership of `roomCode`, otherwise `403 {"error":"You are not a member of this room"}`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/races?roomCode=` | none | `{race, participants}` for the newest lobby, countdown or active race, else `{race:null, participants:[]}`. Also advances state: countdown to active when `startsAt` passes, finished when all racers finish, and closes stale races (a lobby idle 10 min or open over 30 min and quiet for 2, or over 45 min; a countdown older than 15 s past start, or a lone active racer idle for 120 s). |
| POST | `/api/races` | `{action:"start", roomCode, passage, displayName, color}` | `201` new lobby, or the existing lobby with you added. `409` if full (5) or a race is underway. |
| POST | `/api/races` | `{action:"join", roomCode, raceId, displayName, color}` | `{ok, participants}`; `409` if started or full |
| POST | `/api/races` | `{action:"ready", roomCode, raceId}` | When everyone is ready the race moves to `countdown` with `startsAt` 3 s ahead |
| POST | `/api/races` | `{action:"progress", roomCode, raceId, progress, accuracy, wpm, finished?}` | `409` unless active. Values are clamped (0 to 100, wpm 0 to 500). |
| POST | `/api/races` | `{action:"leave", roomCode, raceId}` | Leaver is marked DNF (`progress:-1`); the race closes when nobody is left racing. |
