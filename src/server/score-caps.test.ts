import { describe, expect, it } from 'vitest';
import { SCORE_CAPS, sanitizeProfile } from './score-caps';

describe('sanitizeProfile', () => {
  it('keeps scores that are possible', () => {
    const p = { triviaHighScore: 1200, snakeHighScore: 80, name: 'Ann', gold: 5 };
    expect(sanitizeProfile(p)).toEqual(p);
  });

  it('drops a score above the game maximum instead of storing it', () => {
    expect(sanitizeProfile({ triviaHighScore: 1501 })).toEqual({});
    expect(sanitizeProfile({ memoryHighScore: 1401 })).toEqual({});
    expect(sanitizeProfile({ snakeHighScore: 3971 })).toEqual({});
    expect(sanitizeProfile({ typingHighScore: 351 })).toEqual({});
    expect(sanitizeProfile({ gameHighScore: 1_000_000_000 })).toEqual({});
  });

  it('accepts exactly the cap', () => {
    expect(sanitizeProfile({ triviaHighScore: 1500 })).toEqual({ triviaHighScore: 1500 });
  });

  it('drops non-numeric, negative, NaN and Infinity scores', () => {
    expect(sanitizeProfile({ triviaHighScore: '9999', snakeHighScore: -1, memoryHighScore: Number.NaN, crossyHighScore: Infinity })).toEqual({});
  });

  it('leaves unrelated fields untouched and does not mutate its input', () => {
    const input = { triviaHighScore: 99999, color: '#fff' };
    const out = sanitizeProfile(input);
    expect(out).toEqual({ color: '#fff' });
    expect(input.triviaHighScore).toBe(99999);
  });

  it('returns null for anything that is not a plain object', () => {
    expect(sanitizeProfile(null)).toBeNull();
    expect(sanitizeProfile('x')).toBeNull();
    expect(sanitizeProfile([1, 2])).toBeNull();
  });

  it('has a cap for every score the leaderboard reads', () => {
    for (const key of ['gameHighScore', 'flappyOfficialScore', 'triviaHighScore', 'crossyHighScore', 'snakeHighScore', 'memoryHighScore', 'typingHighScore']) {
      expect(SCORE_CAPS[key]).toBeGreaterThan(0);
    }
  });
});
