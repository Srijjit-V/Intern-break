/**
 * Measures the Typing Race 1 s polling with 5 clients against a running app (E2E_BASE_URL, default :3000).
 * Reports request latency percentiles, server request rate, and how stale a progress update looks to
 * the other racers. Output is JSON on the last line. Usage: node scripts/measure-polling.mjs [seconds]
 */
import { request as pw } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const SECONDS = Number(process.argv[2] ?? 20);
const N = 5;

const mk = async (i) => {
  const api = await pw.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: new URL(BASE).origin } });
  const r = await api.post('api/auth/sign-up/email', { data: { email: `poll-${Date.now()}-${i}@example.test`, password: 'Password-12345!', name: `Poll ${i}` } });
  if (!r.ok()) throw new Error('sign-up failed ' + r.status());
  return { api, name: `Poll ${i}` };
};
const users = [];
for (let i = 0; i < N; i++) users.push(await mk(i));
const code = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
for (const u of users) await u.api.post('api/company', { data: { action: 'sync-member', roomCode: code, companyName: 'Poll Co', memberName: u.name, color: '#fff' } });
const started = await (await users[0].api.post('api/races', { data: { action: 'start', roomCode: code, passage: 'a b c', displayName: users[0].name, color: '#fff' } })).json();
const raceId = started.race.id;
for (const u of users.slice(1)) await u.api.post('api/races', { data: { action: 'join', roomCode: code, raceId, displayName: u.name, color: '#fff' } });
for (const u of users) await u.api.post('api/races', { data: { action: 'ready', roomCode: code, raceId } });
await new Promise((r) => setTimeout(r, 3500));

const latencies = [];
const stale = [];
let requests = 0;
let progressSentAt = 0;
let progressValue = 0;
const end = Date.now() + SECONDS * 1000;

// Racer 0 posts a progress update every 1.3 s; the others poll every 1 s like the real client.
const pollers = users.slice(1).map((u, idx) => (async () => {
  await new Promise((r) => setTimeout(r, idx * 200)); // clients are not phase-aligned
  while (Date.now() < end) {
    const t0 = performance.now();
    const res = await u.api.get(`api/races?roomCode=${code}`);
    const body = await res.json();
    latencies.push(performance.now() - t0);
    requests++;
    const seen = body.participants?.find((p) => p.displayName === users[0].name)?.progress ?? 0;
    if (seen === progressValue && progressValue > 0 && progressSentAt) { stale.push(Date.now() - progressSentAt); progressSentAt = 0; }
    await new Promise((r) => setTimeout(r, 1000));
  }
})());
const sender = (async () => {
  while (Date.now() < end - 1500) {
    progressValue = Math.min(98, progressValue + 5);
    progressSentAt = Date.now();
    await users[0].api.post('api/races', { data: { action: 'progress', roomCode: code, raceId, progress: progressValue, accuracy: 100, wpm: 60, finished: false } });
    await new Promise((r) => setTimeout(r, 1300));
  }
})();
await Promise.all([...pollers, sender]);

const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null; };
const out = {
  clients: N, seconds: SECONDS, pollRequests: requests, requestsPerSecond: +(requests / SECONDS).toFixed(2),
  latencyMs: { p50: pct(latencies, 0.5), p95: pct(latencies, 0.95), max: pct(latencies, 1) },
  progressStalenessMs: { samples: stale.length, p50: pct(stale, 0.5), p95: pct(stale, 0.95), max: pct(stale, 1) },
};
console.log(JSON.stringify(out));
for (const u of users) await u.api.dispose();
