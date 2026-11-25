import { MAX_PLAUSIBLE_WPM } from '../lib/typing-math';

/**
 * Highest score each game can produce. High scores travel in the member's profile JSON and feed the
 * leaderboard, so a value above these is dropped (the stored value stays). Derivations:
 * docs/RULES-AND-MATH.md. Flappy and Crossy have no natural ceiling; their caps are project choices.
 */
export const SCORE_CAPS: Record<string, number> = {
  // Trivia: 10 questions x (100 base + 50 max speed bonus)
  triviaHighScore: 1500,
  // Memory: 12 pairs x 100 + 200 Hard bonus, before penalties
  memoryHighScore: 1400,
  // Snake: 20 x 20 board, 3 cells at the start, 10 points per apple: (400 - 3) x 10
  snakeHighScore: 3970,
  // Typing: standard WPM, see MAX_PLAUSIBLE_WPM
  typingHighScore: MAX_PLAUSIBLE_WPM,
  // Flappy: one point per pipe (a pipe about every 1.9 s), so 1000 is a 30+ minute perfect run
  gameHighScore: 1000,
  flappyOfficialScore: 1000,
  // Crossy Road: project choice
  crossyHighScore: 2000,
};

/** Copy of the profile without any score that is impossible, non-numeric or negative. Null if not an object. */
export function sanitizeProfile(profile: unknown): Record<string, unknown> | null {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return null;
  const out: Record<string, unknown> = { ...(profile as Record<string, unknown>) };
  for (const [key, cap] of Object.entries(SCORE_CAPS)) {
    if (!(key in out)) continue;
    const v = out[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > cap) delete out[key];
  }
  return out;
}
