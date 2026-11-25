const MIN = 60_000;

/**
 * When may an open race lobby be closed as abandoned? One rule, used by both
 * GET /api/races and POST /api/races so they cannot drift apart.
 *
 * - idle for 10 minutes (no join or ready-up), or
 * - older than 30 minutes and quiet for 2, or
 * - older than 45 minutes, whatever the activity (hard ceiling).
 */
export function isLobbyOverdue(createdAt: Date | string, lastActivity: number, now: number): boolean {
  const age = now - new Date(createdAt).getTime();
  const quiet = now - lastActivity;
  return quiet > 10 * MIN || (age > 30 * MIN && quiet > 2 * MIN) || age > 45 * MIN;
}

export type RaceStatus = 'lobby' | 'countdown' | 'active' | 'finished';

export interface RaceSnapshot {
  /** The database column is a plain string; unknown values are treated as finished. */
  status: RaceStatus | (string & {});
  startsAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ParticipantSnapshot {
  progress: number;
  finishedAt: Date | string | null;
  updatedAt: Date | string;
}

const COUNTDOWN_GRACE_MS = 15_000;
/** An active race with no activity from anyone for this long is abandoned, whoever is still "in" it. */
export const ACTIVE_IDLE_MS = 2 * MIN;

/** Latest sign of life: the race row or any participant row. */
export function lastActivityMs(race: RaceSnapshot, participants: readonly ParticipantSnapshot[]): number {
  return Math.max(new Date(race.updatedAt).getTime(), ...participants.map((p) => new Date(p.updatedAt).getTime()));
}

/**
 * Time- and data-driven transitions, applied whenever a race is read. Event transitions
 * (start, join, ready, progress, leave) are in the POST handler; docs/ARCHITECTURE.md has the table.
 *
 *   lobby      -> finished   abandoned (see isLobbyOverdue)
 *   countdown  -> finished   startsAt missing, or more than 15 s past it (nobody started typing)
 *   countdown  -> active     startsAt has passed
 *   active     -> finished   every participant finished or left (DNF counts as finished)
 *   active     -> finished   no activity from anyone for 2 minutes
 */
export function advanceRace(race: RaceSnapshot, participants: readonly ParticipantSnapshot[], now: number): RaceStatus {
  const last = lastActivityMs(race, participants);
  switch (race.status) {
    case 'lobby':
      return isLobbyOverdue(race.createdAt, last, now) ? 'finished' : 'lobby';
    case 'countdown': {
      const starts = race.startsAt ? new Date(race.startsAt).getTime() : null;
      if (starts === null || starts + COUNTDOWN_GRACE_MS < now) return 'finished';
      return starts <= now ? 'active' : 'countdown';
    }
    case 'active': {
      if (participants.length > 0 && participants.every((p) => Boolean(p.finishedAt))) return 'finished';
      return now - last > ACTIVE_IDLE_MS ? 'finished' : 'active';
    }
    default:
      return 'finished';
  }
}
