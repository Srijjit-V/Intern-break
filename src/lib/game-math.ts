/** Scoring and currency formulas, pure and tested. See docs/RULES-AND-MATH.md. */

export type MemoryDifficulty = 'Easy' | 'Medium' | 'Hard';

/** Trivia Blitz: 100 per correct answer, plus up to 50 each for speed (5 points lost per second of average answer time). */
export function triviaScore(correct: number, avgTimeMs: number): number {
  const base = correct * 100;
  const speedBonus = correct > 0 ? Math.round(correct * Math.max(0, 50 - (avgTimeMs / 1000) * 5)) : 0;
  return base + speedBonus;
}

/** Memory Match: pairs x 100, minus 5 per move beyond the pair count, minus 2 per whole second, plus a difficulty bonus. */
export function memoryScore(pairs: number, moves: number, timeMs: number, difficulty: MemoryDifficulty): number {
  const base = pairs * 100;
  const movePenalty = Math.max(0, (moves - pairs) * 5);
  const timePenalty = Math.floor(timeMs / 1000) * 2;
  const diffBonus = difficulty === 'Hard' ? 200 : difficulty === 'Medium' ? 100 : 0;
  return Math.max(0, base - movePenalty - timePenalty + diffBonus);
}

/** Points to gold and diamonds for placement and challenge awards. */
export function pointsToCurrency(points: number): { gold: number; diamonds: number } {
  return { gold: Math.max(1, Math.round(points * 0.5)), diamonds: Math.max(1, Math.round(points * 0.25)) };
}
