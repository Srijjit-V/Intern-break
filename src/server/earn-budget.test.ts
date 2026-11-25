import { describe, expect, it } from 'vitest';
import { clampEarn, DEFAULT_CAPS } from './earn-budget';

const caps = { perHour: 100, perDay: 250 };
const base = { current: 500, hourUsed: 0, dayUsed: 0, caps };

describe('clampEarn', () => {
  it('passes a legitimate small gain through unchanged', () => {
    expect(clampEarn({ ...base, requested: 520 })).toEqual({ value: 520, gained: 20, clamped: false });
  });

  it('clamps a forged huge value to the hourly cap', () => {
    expect(clampEarn({ ...base, requested: 999_999_999 })).toEqual({ value: 600, gained: 100, clamped: true });
  });

  it('never lets repeated syncs add up past the hourly budget', () => {
    let current = 500;
    let hourUsed = 0;
    for (let i = 0; i < 10; i++) {
      const r = clampEarn({ current, requested: current + 60, hourUsed, dayUsed: hourUsed, caps });
      current = r.value;
      hourUsed += r.gained;
    }
    expect(current).toBe(600); // 500 + 100, not 500 + 600
  });

  it('respects the daily cap even when the hour is fresh', () => {
    expect(clampEarn({ ...base, requested: 10_000, hourUsed: 0, dayUsed: 200 })).toEqual({ value: 550, gained: 50, clamped: true });
  });

  it('gives nothing once the budget is spent', () => {
    expect(clampEarn({ ...base, requested: 700, hourUsed: 100 })).toEqual({ value: 500, gained: 0, clamped: true });
  });

  it('never lowers a value, whatever the client sends', () => {
    expect(clampEarn({ ...base, requested: 0 })).toEqual({ value: 500, gained: 0, clamped: false });
    expect(clampEarn({ ...base, requested: -5 })).toEqual({ value: 500, gained: 0, clamped: false });
  });

  it('rejects NaN, Infinity and fractions as no gain or a floored gain', () => {
    expect(clampEarn({ ...base, requested: Number.NaN }).gained).toBe(0);
    expect(clampEarn({ ...base, requested: Number.POSITIVE_INFINITY }).value).toBe(600);
    expect(clampEarn({ ...base, requested: 510.9 }).value).toBe(510);
  });

  it('starts a brand new member at zero, so a forged starting balance is capped too', () => {
    expect(clampEarn({ current: 0, requested: 1_000_000, hourUsed: 0, dayUsed: 0, caps })).toEqual({ value: 100, gained: 100, clamped: true });
  });

  it('ships sane default caps (hour no larger than day)', () => {
    for (const key of ['points', 'carryover'] as const) {
      expect(DEFAULT_CAPS[key].perHour).toBeLessThanOrEqual(DEFAULT_CAPS[key].perDay);
      expect(DEFAULT_CAPS[key].perHour).toBeGreaterThan(0);
    }
  });
});
