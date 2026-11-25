/**
 * Typing formulas. One place, pure functions, tested. See docs/RULES-AND-MATH.md.
 *
 * WPM is the standard definition: correct characters divided by 5, per minute.
 */

export const CHARS_PER_WORD = 5;

/**
 * Highest WPM the server accepts. The fastest result found is about 305 WPM, from an unofficial
 * online test, so 350 leaves headroom without letting a forged value through. Project choice,
 * see docs/RULES-AND-MATH.md for the sources.
 */
export const MAX_PLAUSIBLE_WPM = 350;

export function wpmFromChars(correctChars: number, seconds: number): number {
  if (!Number.isFinite(correctChars) || !Number.isFinite(seconds) || seconds <= 0 || correctChars <= 0) return 0;
  return Math.round(correctChars / CHARS_PER_WORD / (seconds / 60));
}

/** Characters typed correctly: each completed word that matches the target counts its length plus the space. */
export function correctCharCount(typedWords: readonly string[], targetWords: readonly string[], completedWords: number): number {
  let chars = 0;
  const limit = Math.min(completedWords, typedWords.length, targetWords.length);
  for (let i = 0; i < limit; i++) if (typedWords[i] === targetWords[i]) chars += targetWords[i].length + 1;
  return chars;
}

/** Share of completed words that were correct. 100 when nothing is completed yet. */
export function accuracyPct(correctWords: number, completedWords: number): number {
  return completedWords > 0 ? Math.round((correctWords / completedWords) * 100) : 100;
}

export interface RaceRow {
  name: string;
  /** Seconds to finish; Infinity while unfinished. */
  time: number;
  wpm: number;
  accuracy: number;
  progress: number;
  dnf: boolean;
}

/**
 * Race order: finishers by time (ties: higher WPM, then higher accuracy, then name), then unfinished
 * racers by progress then WPM, then DNF last.
 */
export function rankRacers<T extends RaceRow>(rows: readonly T[]): T[] {
  const finished = (r: RaceRow) => !r.dnf && Number.isFinite(r.time) && r.time > 0;
  return [...rows].sort((a, b) => {
    if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
    if (a.dnf && b.dnf) return a.name.localeCompare(b.name);
    const af = finished(a);
    const bf = finished(b);
    if (af !== bf) return af ? -1 : 1;
    if (af && bf) {
      if (a.time !== b.time) return a.time - b.time;
    } else if (a.progress !== b.progress) {
      return b.progress - a.progress;
    }
    if (a.wpm !== b.wpm) return b.wpm - a.wpm;
    if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;
    return a.name.localeCompare(b.name);
  });
}
