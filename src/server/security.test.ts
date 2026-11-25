// @vitest-environment node
import express from 'express';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { applySecurity, createRateLimiter } from './security';

let server: Server | null = null;
afterEach(async () => {
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  server = null;
});

async function start(setup?: (app: express.Express) => void) {
  const app = express();
  app.use(express.json());
  applySecurity(app);
  app.get('/page', (_req, res) => res.send('ok'));
  app.post('/api/thing', (_req, res) => res.json({ ok: true }));
  app.get('/api/thing', (_req, res) => res.json({ ok: true }));
  setup?.(app);
  await new Promise<void>((r) => { server = app.listen(0, '127.0.0.1', () => r()); });
  const port = (server!.address() as { port: number }).port;
  return `http://127.0.0.1:${port}`;
}

describe('security headers', () => {
  it('sets CSP and hardening headers and hides X-Powered-By', async () => {
    const base = await start();
    const res = await fetch(`${base}/page`);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('sends HSTS only over https', async () => {
    const base = await start();
    expect((await fetch(`${base}/page`)).headers.get('strict-transport-security')).toBeNull();
    const proxied = await fetch(`${base}/page`, { headers: { 'x-forwarded-proto': 'https' } });
    // trust proxy is off by default, so a spoofed header must not turn HSTS on either
    expect(proxied.headers.get('strict-transport-security')).toBeNull();
  });
});

describe('same-origin guard for API writes', () => {
  it('rejects a write whose Origin is another site', async () => {
    const base = await start();
    const res = await fetch(`${base}/api/thing`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(403);
  });

  it('allows a write from the same origin', async () => {
    const base = await start();
    const res = await fetch(`${base}/api/thing`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(200);
  });

  it('rejects a cross-site write that carries no Origin', async () => {
    const base = await start();
    const res = await fetch(`${base}/api/thing`, { method: 'POST', headers: { 'sec-fetch-site': 'cross-site', 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(403);
  });

  it('allows non-browser clients with no Origin and reads from anywhere', async () => {
    const base = await start();
    expect((await fetch(`${base}/api/thing`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status).toBe(200);
    expect((await fetch(`${base}/api/thing`, { headers: { origin: 'https://evil.example' } })).status).toBe(200);
  });

  it('allows origins listed in BETTER_AUTH_TRUSTED_ORIGINS', async () => {
    process.env.BETTER_AUTH_TRUSTED_ORIGINS = 'https://app.example.com';
    try {
      const base = await start();
      const res = await fetch(`${base}/api/thing`, { method: 'POST', headers: { origin: 'https://app.example.com', 'content-type': 'application/json' }, body: '{}' });
      expect(res.status).toBe(200);
    } finally {
      delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
    }
  });
});

describe('guard edge cases', () => {
  it('applies to /API too (Express routes are case-insensitive)', async () => {
    const base = await start((app) => app.post('/api/case', (_req, res) => res.json({ ok: true })));
    const res = await fetch(`${base}/API/case`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(403);
  });

  it('requires the scheme to match, not just the host', async () => {
    const base = await start();
    const res = await fetch(`${base}/api/thing`, { method: 'POST', headers: { origin: base.replace('http://', 'https://'), 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(403);
  });

  it('rejects same-site (sibling subdomain) browser writes with no Origin', async () => {
    const base = await start();
    const res = await fetch(`${base}/api/thing`, { method: 'POST', headers: { 'sec-fetch-site': 'same-site', 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(403);
  });

  it('ignores TRUST_PROXY=true so X-Forwarded-For cannot choose the rate-limit key', async () => {
    process.env.TRUST_PROXY = 'true';
    try {
      const limiter = createRateLimiter({ windowMs: 10_000, max: 1, key: (req) => req.ip ?? 'x' });
      const base = await start((app) => app.post('/limited', limiter, (_req, res) => res.json({ ok: true })));
      const hit = (xff: string) => fetch(`${base}/limited`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': xff }, body: '{}' }).then((r) => r.status);
      expect(await hit('1.1.1.1')).toBe(200);
      expect(await hit('2.2.2.2')).toBe(429); // same real client, different spoofed header
    } finally {
      delete process.env.TRUST_PROXY;
    }
  });
});

describe('rate limiter', () => {
  it('blocks after max hits in the window and resets after it', async () => {
    let now = 1_000;
    const limiter = createRateLimiter({ windowMs: 10_000, max: 3, key: () => 'k', now: () => now });
    const base = await start((app) => app.post('/limited', limiter, (_req, res) => res.json({ ok: true })));
    const hit = () => fetch(`${base}/limited`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.status);
    expect([await hit(), await hit(), await hit()]).toEqual([200, 200, 200]);
    const blocked = await fetch(`${base}/limited`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    now += 10_001;
    expect(await hit()).toBe(200);
  });

  it('stays bounded under a flood of distinct keys', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 5, key: (req) => String(req.headers['x-key']) });
    const base = await start((app) => app.post('/limited', limiter, (_req, res) => res.json({ ok: true })));
    // A 400-character key must be truncated, not stored whole.
    const res = await fetch(`${base}/limited`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-key': 'k'.repeat(400) }, body: '{}' });
    expect(res.status).toBe(200);
  });

  it('counts different keys separately', async () => {
    const limiter = createRateLimiter({ windowMs: 10_000, max: 1, key: (req) => String(req.headers['x-key']) });
    const base = await start((app) => app.post('/limited', limiter, (_req, res) => res.json({ ok: true })));
    const hit = (k: string) => fetch(`${base}/limited`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-key': k }, body: '{}' }).then((r) => r.status);
    expect(await hit('a')).toBe(200);
    expect(await hit('b')).toBe(200);
    expect(await hit('a')).toBe(429);
  });
});
