import { describe, expect, it } from 'vitest';
import { isLobbyOverdue } from './race-lobby';

const MIN = 60_000;
const now = Date.parse('2026-01-01T12:00:00Z');
const created = (minutesAgo: number) => new Date(now - minutesAgo * MIN);
const active = (minutesAgo: number) => now - minutesAgo * MIN;

describe('isLobbyOverdue', () => {
  it('keeps a fresh, active lobby', () => expect(isLobbyOverdue(created(1), active(0), now)).toBe(false));
  it('closes a lobby idle for over 10 minutes', () => expect(isLobbyOverdue(created(12), active(11), now)).toBe(true));
  it('keeps a busy 35 minute lobby', () => expect(isLobbyOverdue(created(35), active(1), now)).toBe(false));
  it('closes a 35 minute lobby that has gone quiet for 3 minutes', () => expect(isLobbyOverdue(created(35), active(3), now)).toBe(true));
  it('closes anything older than 45 minutes, however busy', () => expect(isLobbyOverdue(created(46), active(0), now)).toBe(true));
});
