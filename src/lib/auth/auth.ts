/**
 * BetterAuth Server Configuration
 *
 * Supports both Email/Password and OAuth authentication.
 * Enable/disable methods by uncommenting the relevant sections.
 *
 * Env: BETTER_AUTH_SECRET (required), BETTER_AUTH_URL, BETTER_AUTH_TRUSTED_ORIGINS.
 * Email/password only; no email verification is required, so local sign up
 * needs no mail provider.
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '@/server/db/client';
import { user, session, account, verification } from '@/server/db/schema';

// Lazy singleton — betterAuth() must NOT run at module init time.
//
// The auth instance is built on the first request so a missing
// BETTER_AUTH_SECRET surfaces as a clear 503 instead of a crash at import.
//
// Pattern mirrors how db/client.ts defers the actual MySQL connection — the
// pool object is safe to create at init, but anything that reads schema state
// or secrets must be deferred to request time.
let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;

  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret || typeof authSecret !== 'string') {
    throw new Error('BETTER_AUTH_SECRET is not set or invalid — set it in .env (see .env.example)');
  }

  if (!db) {
    throw new Error('Database not configured.');
  }

  const auth = betterAuth({
    // Schema passed explicitly — avoids BetterAuth's runtime schema inference.
    database: drizzleAdapter(db, {
      provider: 'mysql',
      schema: { user, session, account, verification },
    }),

    secret: authSecret,
    // Public URL of the app. Same origin as the client; see docs/deployment.md.
    baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || '3000'}`,

    // Protect admin status field from user input
    user: {
      additionalFields: {
        isAdmin: {
          type: 'boolean',
          defaultValue: false,
          input: false,  // Prevent clients from writing this field
          returned: true,
        },
      },
    },

    // Trusted origins: localhost plus BETTER_AUTH_URL and the comma-separated
    // BETTER_AUTH_TRUSTED_ORIGINS list (full origins, e.g. https://app.example.com).
    trustedOrigins: (request?: Request) => {
      const configured = [process.env.BETTER_AUTH_URL, ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',')]
        .map((o) => o?.trim().replace(/\/$/, ''))
        .filter((o): o is string => Boolean(o));
      const origin = request?.headers.get('origin');
      if (!origin) return configured;
      try {
        const { hostname } = new URL(origin);
        if (hostname === 'localhost' || hostname === '127.0.0.1') return [...configured, origin];
      } catch {
        /* ignore malformed origin */
      }
      return configured;
    },

    // Cross-site cookies are only needed when embedded in a third-party iframe.
    ...(process.env.COOKIE_CROSS_SITE === 'true' && {
      advanced: {
        defaultCookieAttributes: {
          sameSite: 'none' as const,
          secure: true,
          partitioned: true,
        },
      },
    }),

    emailAndPassword: { enabled: true },

    // socialProviders: {
    //   google: {
    //     clientId: process.env.GOOGLE_CLIENT_ID as string,
    //     clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    //   },
    //   github: {
    //     clientId: process.env.GITHUB_CLIENT_ID as string,
    //     clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    //   },
    // },
  });

  _auth = auth as unknown as ReturnType<typeof betterAuth>;
  return auth;
}

export type Session = ReturnType<typeof getAuth>['$Infer']['Session'];
export type User = ReturnType<typeof getAuth>['$Infer']['Session']['user'];
