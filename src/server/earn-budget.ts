/**
 * Earn budget: how fast a member's points and reward currency may rise.
 *
 * The client reports its own totals. The server never lowers them, but it caps how much they can
 * rise per hour and per day, so a forged value (devtools, a hand-made request) cannot jump to
 * millions. This is a rate limit on inflation, not proof that each point was earned; see
 * docs/RULES-AND-MATH.md and docs/SECURITY.md.
 */

export interface Caps {
  perHour: number;
  perDay: number;
}

const fromEnv = (name: string, fallback: number): number => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

/** Defaults sit above what the game rules can legitimately pay out; override with EARN_CAP_* env vars. */
export const DEFAULT_CAPS = {
  points: { perHour: 150, perDay: 400 },
  carryover: { perHour: 400, perDay: 1000 },
};

export function capsFor(kind: 'points' | 'carryover'): Caps {
  const upper = kind.toUpperCase();
  return {
    perHour: fromEnv(`EARN_CAP_${upper}_PER_HOUR`, DEFAULT_CAPS[kind].perHour),
    perDay: fromEnv(`EARN_CAP_${upper}_PER_DAY`, DEFAULT_CAPS[kind].perDay),
  };
}

export interface ClampInput {
  current: number;
  requested: number;
  hourUsed: number;
  dayUsed: number;
  caps: Caps;
}

export interface ClampResult {
  value: number;
  gained: number;
  clamped: boolean;
}

export function clampEarn({ current, requested, hourUsed, dayUsed, caps }: ClampInput): ClampResult {
  const want = Number.isFinite(requested) ? Math.floor(requested) : requested === Number.POSITIVE_INFINITY ? Number.MAX_SAFE_INTEGER : current;
  const wanted = Math.max(0, want - current);
  const room = Math.max(0, Math.min(caps.perHour - hourUsed, caps.perDay - dayUsed));
  const gained = Math.min(wanted, room);
  return { value: current + gained, gained, clamped: gained < wanted };
}
