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
