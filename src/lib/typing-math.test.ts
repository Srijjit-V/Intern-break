import { describe, expect, it } from 'vitest';
import { accuracyPct, correctCharCount, MAX_PLAUSIBLE_WPM, rankRacers, wpmFromChars } from './typing-math';

describe('wpmFromChars (correct characters / 5 per minute)', () => {
  it('300 correct characters in 60 s is 60 WPM', () => expect(wpmFromChars(300, 60)).toBe(60));
  it('300 correct characters in 30 s is 120 WPM', () => expect(wpmFromChars(300, 30)).toBe(120));
  it('rounds to the nearest whole WPM', () => expect(wpmFromChars(251, 60)).toBe(50));
  it('is 0 for no time, negative time, or no characters', () => {
    expect(wpmFromChars(300, 0)).toBe(0);
    expect(wpmFromChars(300, -3)).toBe(0);
    expect(wpmFromChars(0, 60)).toBe(0);
    expect(wpmFromChars(300, Number.NaN)).toBe(0);
  });
});

describe('correctCharCount', () => {
  const target = ['the', 'quick', 'brown', 'fox'];
  it('counts each correct word plus its trailing space', () => expect(correctCharCount(['the', 'quick'], target, 2)).toBe(4 + 6));
  it('skips wrong words', () => expect(correctCharCount(['the', 'quik', 'brown'], target, 3)).toBe(4 + 6));
  it('ignores words that are not completed yet', () => expect(correctCharCount(['the', 'quick', 'bro'], target, 2)).toBe(4 + 6));
  it('never counts past the target length', () => expect(correctCharCount(['the', 'quick', 'brown', 'fox', 'extra'], target, 5)).toBe(4 + 6 + 6 + 4));
});

describe('accuracyPct', () => {
  it('is 100 before anything is completed', () => expect(accuracyPct(0, 0)).toBe(100));
  it('is correct over completed words, rounded', () => {
    expect(accuracyPct(9, 10)).toBe(90);
    expect(accuracyPct(2, 3)).toBe(67);
  });
});

describe('rankRacers', () => {
  const r = (name: string, p: Partial<{ time: number; wpm: number; accuracy: number; progress: number; dnf: boolean }>) =>
    ({ name, time: Infinity, wpm: 0, accuracy: 100, progress: 0, dnf: false, ...p });

  it('orders finishers by finish time', () => {
    const out = rankRacers([r('b', { time: 20 }), r('a', { time: 10 }), r('c', { time: 30 })]);
    expect(out.map((x) => x.name)).toEqual(['a', 'b', 'c']);
  });
  it('puts finishers ahead of unfinished racers, who go by progress then WPM', () => {
    const out = rankRacers([r('slow', { progress: 40, wpm: 30 }), r('fast', { progress: 40, wpm: 60 }), r('done', { time: 50 }), r('far', { progress: 80 })]);
    expect(out.map((x) => x.name)).toEqual(['done', 'far', 'fast', 'slow']);
  });
  it('puts DNF racers last', () => {
    const out = rankRacers([r('quit', { dnf: true, time: 5 }), r('done', { time: 50 }), r('mid', { progress: 10 })]);
    expect(out.map((x) => x.name)).toEqual(['done', 'mid', 'quit']);
  });
  it('breaks an exact time tie by WPM, then accuracy, then name', () => {
    const out = rankRacers([r('z', { time: 10, wpm: 50, accuracy: 90 }), r('a', { time: 10, wpm: 50, accuracy: 90 }), r('m', { time: 10, wpm: 60, accuracy: 80 }), r('k', { time: 10, wpm: 50, accuracy: 99 })]);
    expect(out.map((x) => x.name)).toEqual(['m', 'k', 'a', 'z']);
  });
  it('does not mutate its input', () => {
    const rows = [r('b', { time: 2 }), r('a', { time: 1 })];
    rankRacers(rows);
    expect(rows.map((x) => x.name)).toEqual(['b', 'a']);
  });
});

describe('plausibility bound', () => {
  it('sits above the fastest unofficial online result (about 305 WPM) and below the old 500 cap', () => {
    expect(MAX_PLAUSIBLE_WPM).toBeGreaterThan(305);
    expect(MAX_PLAUSIBLE_WPM).toBeLessThan(500);
  });
});
