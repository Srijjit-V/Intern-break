import { describe, expect, it } from 'vitest';
import { ACTIVE_IDLE_MS, advanceRace, isLobbyOverdue, type ParticipantSnapshot, type RaceSnapshot } from './race-rules';

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

describe('advanceRace (every time-driven transition)', () => {
  const t0 = Date.parse('2026-01-01T12:00:00Z');
  const at = (ms: number) => new Date(t0 + ms);
  const race = (over: Partial<RaceSnapshot>): RaceSnapshot => ({ status: 'lobby', startsAt: null, createdAt: at(0), updatedAt: at(0), ...over });
  const p = (over: Partial<ParticipantSnapshot> = {}): ParticipantSnapshot => ({ progress: 0, finishedAt: null, updatedAt: at(0), ...over });

  it('lobby stays lobby while fresh', () => expect(advanceRace(race({}), [p()], t0 + 60_000)).toBe('lobby'));
  it('lobby -> finished when abandoned', () => expect(advanceRace(race({}), [p()], t0 + 11 * 60_000)).toBe('finished'));
  it('lobby kept alive by a recent join', () => expect(advanceRace(race({}), [p({ updatedAt: at(9 * 60_000) })], t0 + 15 * 60_000)).toBe('lobby'));

  it('countdown stays countdown before startsAt', () => expect(advanceRace(race({ status: 'countdown', startsAt: at(3000) }), [p()], t0 + 1000)).toBe('countdown'));
  it('countdown -> active once startsAt passes', () => expect(advanceRace(race({ status: 'countdown', startsAt: at(3000) }), [p()], t0 + 3500)).toBe('active'));
  it('countdown -> finished when startsAt is missing', () => expect(advanceRace(race({ status: 'countdown', startsAt: null }), [p()], t0 + 1000)).toBe('finished'));
  it('countdown -> finished when 15 s past startsAt', () => expect(advanceRace(race({ status: 'countdown', startsAt: at(3000) }), [p()], t0 + 19_000)).toBe('finished'));

  it('active stays active while someone is still racing', () => {
    expect(advanceRace(race({ status: 'active', startsAt: at(0) }), [p({ finishedAt: at(5000) }), p()], t0 + 30_000)).toBe('active');
  });
  it('active -> finished when everyone has finished or left (DNF sets finishedAt)', () => {
    expect(advanceRace(race({ status: 'active', startsAt: at(0) }), [p({ finishedAt: at(5000) }), p({ progress: -1, finishedAt: at(8000) })], t0 + 9000)).toBe('finished');
  });
  it('active -> finished when a silent participant leaves the race idle for 2 minutes (3 racers, 1 disconnected)', () => {
    const parts = [p({ finishedAt: at(1000), updatedAt: at(1000) }), p({ finishedAt: at(2000), updatedAt: at(2000) }), p({ updatedAt: at(500) })];
    expect(advanceRace(race({ status: 'active', startsAt: at(0), updatedAt: at(0) }), parts, t0 + 2000 + ACTIVE_IDLE_MS + 1)).toBe('finished');
  });
  it('active survives a long race while anyone keeps sending progress', () => {
    const parts = [p({ updatedAt: at(10 * 60_000) }), p({ updatedAt: at(9 * 60_000) })];
    expect(advanceRace(race({ status: 'active', startsAt: at(0) }), parts, t0 + 10 * 60_000 + 5000)).toBe('active');
  });
  it('finished stays finished', () => expect(advanceRace(race({ status: 'finished' }), [p()], t0 + 1000)).toBe('finished'));
});
