import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Security middleware: response headers with a Content Security Policy, a same-origin
 * guard for API writes, and a small in-memory rate limiter.
 *
 * Rate limiting is per process. Behind several instances, put a shared limiter in front.
 */

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Inline style attributes come from React and motion; Google Fonts supplies the stylesheet.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Avatars are data: and blob: URLs.
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  // req.secure honours X-Forwarded-Proto only when TRUST_PROXY is set.
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function allowedOrigins(): Set<string> {
  const list = [process.env.BETTER_AUTH_URL, ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',')];
  const origins = new Set<string>();
  for (const raw of list) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      /* ignore malformed entries */
    }
  }
  return origins;
}

/**
 * Writes to /api must come from this app's own origin (defense in depth next to SameSite=Lax cookies).
 * Mounted with app.use('/api', ...) so it uses the router's own matcher (Express matches paths
 * case-insensitively, so a hand-written startsWith('/api') check could be bypassed with /API).
 */
function sameOriginGuard(req: Request, res: Response, next: NextFunction) {
  if (!UNSAFE_METHODS.has(req.method)) return next();
  const blocked = () => res.status(403).json({ error: 'Cross-origin request blocked' });
  const origin = req.get('origin');
  if (origin) {
    try {
      const url = new URL(origin);
      // Exact origin match (scheme, host and port), or an explicitly configured origin.
      if (url.origin === `${req.protocol}://${req.get('host')}` || allowedOrigins().has(url.origin)) return next();
    } catch {
      /* fall through to rejection */
    }
    return blocked();
  }
  // No Origin: a script or curl is fine, but a browser says where the request came from.
  const site = req.get('sec-fetch-site');
  if (site === 'cross-site' || site === 'same-site') return blocked();
  next();
}

/**
 * TRUST_PROXY is the number of reverse-proxy hops in front of the app (1 for a single load balancer).
 * Unset or 0 trusts nothing. "true" is deliberately not accepted: trusting every X-Forwarded-For hop
 * lets a client pick its own IP and walk around the rate limits.
 */
function trustProxySetting(): number | false {
  const hops = Number(process.env.TRUST_PROXY?.trim());
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}

export function applySecurity(app: Express): void {
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxySetting());
  app.use(securityHeaders);
  app.use('/api', sameOriginGuard);
}

interface LimiterOptions {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
  /** Skip this limiter for requests where it does not apply (for example no email in the body). */
  skip?: (req: Request) => boolean;
  /** Hard cap on tracked keys. At the cap, unknown keys are refused instead of evicting live ones. */
  maxKeys?: number;
  now?: () => number;
}

const DEFAULT_MAX_KEYS = 10_000;

export function createRateLimiter({ windowMs, max, key, skip, maxKeys = DEFAULT_MAX_KEYS, now = Date.now }: LimiterOptions): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = 0;
  const tooMany = (res: Response, resetAt: number, t: number) => {
    res.set('Retry-After', String(Math.max(1, Math.ceil((resetAt - t) / 1000))));
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  };
  return (req, res, next) => {
    if (skip?.(req)) return next();
    const t = now();
    const k = key(req).slice(0, 300);
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= t) {
      if (!entry && hits.size >= maxKeys) {
        // Full: drop expired entries (at most once a second), but never evict a live one. A flood of
        // distinct keys must not be able to wash an attacker's own counter out of the table.
        if (t - lastSweep >= 1000) {
          lastSweep = t;
          for (const [id, e] of hits) if (e.resetAt <= t) hits.delete(id);
        }
        if (hits.size >= maxKeys) return tooMany(res, t + windowMs, t);
      }
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;
    if (entry.count > max) return tooMany(res, entry.resetAt, t);
    next();
  };
}

/** Positive integer from an env var, else the default. */
function limitFromEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

const clientIp = (req: Request) => req.ip ?? 'unknown';
const bodyEmail = (req: Request) => (typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '');

/**
 * Per-IP first, so one address cannot allocate many per-email counters; then per IP+email, then per
 * account alone (skipped when the body has no email, so empty requests never share one bucket).
 */
export function authRateLimiters(): RequestHandler[] {
  return [
    createRateLimiter({ windowMs: 10 * 60_000, max: limitFromEnv('RATE_LIMIT_SIGNIN_IP_MAX', 40), key: (req) => `signin-ip:${clientIp(req)}` }),
    createRateLimiter({ windowMs: 10 * 60_000, max: limitFromEnv('RATE_LIMIT_SIGNIN_MAX', 8), key: (req) => `signin:${clientIp(req)}:${bodyEmail(req)}`, skip: (req) => !bodyEmail(req) }),
    // Per account regardless of IP, so spreading guesses across addresses is still capped.
    createRateLimiter({ windowMs: 10 * 60_000, max: limitFromEnv('RATE_LIMIT_SIGNIN_ACCOUNT_MAX', 60), key: (req) => `signin-acct:${bodyEmail(req)}`, skip: (req) => !bodyEmail(req) }),
  ];
}

export function signupRateLimiter(): RequestHandler {
  return createRateLimiter({ windowMs: 60 * 60_000, max: limitFromEnv('RATE_LIMIT_SIGNUP_MAX', 10), key: (req) => `signup:${clientIp(req)}` });
}

export function apiRateLimiter(): RequestHandler {
  return createRateLimiter({ windowMs: 60_000, max: limitFromEnv('RATE_LIMIT_API_MAX', 600), key: (req) => `api:${clientIp(req)}` });
}
