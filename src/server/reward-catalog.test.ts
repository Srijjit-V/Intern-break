import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REWARD_NAMES, rewardPrice } from './reward-catalog';

describe('rewardPrice', () => {
  it('returns the catalog price for a known reward', () => {
    expect(rewardPrice('Classic T-shirt')).toBe(150);
    expect(rewardPrice('Cozy Hoodie')).toBe(300);
  });

  it('returns null for unknown, empty, inherited or non-string names', () => {
    expect(rewardPrice('Free Car')).toBeNull();
    expect(rewardPrice('')).toBeNull();
    expect(rewardPrice('constructor')).toBeNull();
    expect(rewardPrice('__proto__')).toBeNull();
    expect(rewardPrice(undefined)).toBeNull();
    expect(rewardPrice({ name: 'Cozy Hoodie' })).toBeNull();
  });

  it('matches the rewards page exactly, so the shop and the server cannot disagree', () => {
    const page = JSON.parse(readFileSync('src/content/pages/rewards.json', 'utf8')) as { rewards: { name: string; points: string }[] };
    expect(page.rewards.map((r) => r.name).sort()).toEqual([...REWARD_NAMES].sort());
    for (const r of page.rewards) expect(rewardPrice(r.name)).toBe(Number.parseInt(r.points, 10));
  });
});
