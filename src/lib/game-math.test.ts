import { describe, expect, it } from 'vitest';
import { memoryScore, pointsToCurrency, triviaScore } from './game-math';

describe('triviaScore: 100 per correct answer + speed bonus up to 50 each', () => {
  it('is 0 with no correct answers', () => expect(triviaScore(0, 1000)).toBe(0));
  it('10 instant answers is the maximum, 1500', () => expect(triviaScore(10, 0)).toBe(1500));
  it('the bonus shrinks 5 points per second of average answer time', () => {
    expect(triviaScore(10, 2000)).toBe(1000 + 10 * 40);
    expect(triviaScore(1, 4000)).toBe(100 + 30);
  });
  it('the bonus never goes negative, so slow answers still earn the base', () => {
    expect(triviaScore(10, 12_000)).toBe(1000);
    expect(triviaScore(10, 60_000)).toBe(1000);
  });
});

describe('memoryScore: pairs x 100 - move penalty - time penalty + difficulty bonus', () => {
  it('a perfect easy game (no extra moves, 0 s) scores pairs x 100', () => expect(memoryScore(6, 6, 0, 'Easy')).toBe(600));
  it('each move beyond the pair count costs 5', () => expect(memoryScore(6, 10, 0, 'Easy')).toBe(600 - 20));
  it('each whole second costs 2', () => expect(memoryScore(6, 6, 30_999, 'Easy')).toBe(600 - 60));
  it('difficulty adds a flat bonus: Medium 100, Hard 200', () => {
    expect(memoryScore(10, 10, 0, 'Medium')).toBe(1100);
    expect(memoryScore(12, 12, 0, 'Hard')).toBe(1400);
  });
  it('never goes below 0', () => expect(memoryScore(6, 100, 600_000, 'Easy')).toBe(0));
  it('the Hard maximum, 1400, matches the server cap', async () => {
    const { SCORE_CAPS } = await import('../server/score-caps');
    expect(memoryScore(12, 12, 0, 'Hard')).toBe(SCORE_CAPS.memoryHighScore);
  });
  it('the Trivia maximum matches the server cap', async () => {
    const { SCORE_CAPS } = await import('../server/score-caps');
    expect(triviaScore(10, 0)).toBe(SCORE_CAPS.triviaHighScore);
  });
});

describe('pointsToCurrency: gold = half the points, diamonds = a quarter, at least 1 of each', () => {
  it('converts 20 points to 10 gold and 5 diamonds', () => expect(pointsToCurrency(20)).toEqual({ gold: 10, diamonds: 5 }));
  it('rounds to the nearest whole unit', () => expect(pointsToCurrency(15)).toEqual({ gold: 8, diamonds: 4 }));
  it('always gives at least 1 gold and 1 diamond', () => expect(pointsToCurrency(1)).toEqual({ gold: 1, diamonds: 1 }));
});
