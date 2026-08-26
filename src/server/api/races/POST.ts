import type { Request, Response } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth';
import { db } from '../../db/client.js';
import { typingRaceParticipants, typingRaces } from '../../db/schema.js';

// Real racing games cap lobby size and treat it as a hard server-side rule,
// not a client-side display slice — otherwise a 6th+ joiner can sit in the
// lobby unseen while still blocking the "everyone ready" check from ever
// completing. 5 keeps every racer visible on the track at once.
const MAX_RACERS = 5;

async function getSessionUser(req: Request) {
  const auth = getAuth();
  const headers = new Headers();
  const cookie = req.headers.cookie;
  if (cookie) headers.set('cookie', cookie);
  return auth.api.getSession({ headers });
}

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getSessionUser(req);
    if (!session?.user) return res.status(401).json({ error: 'Sign in required' });
    const { action, roomCode, raceId, passage, displayName, color, progress, accuracy, wpm, finished } = req.body ?? {};
    if (!action || !roomCode) return res.status(400).json({ error: 'action and roomCode are required' });

    if (action === 'start') {
      if (!passage || !displayName || !color) return res.status(400).json({ error: 'passage, displayName, and color are required' });
      const openRaces = await db.select().from(typingRaces)
        .where(and(eq(typingRaces.roomCode, roomCode), sql`${typingRaces.status} IN ('lobby', 'countdown', 'active')`))
        .orderBy(typingRaces.createdAt)
        .limit(1);
      const existingRace = openRaces[0];

      if (existingRace?.status === 'lobby') {
        const lobbyParticipants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, existingRace.id));
        const alreadyIn = lobbyParticipants.some((participant) => participant.accountId === session.user.id);
        if (!alreadyIn && lobbyParticipants.length >= MAX_RACERS) {
          return res.status(409).json({ error: `This race is full (${MAX_RACERS}/${MAX_RACERS}).` });
        }
        await db.insert(typingRaceParticipants)
          .values({ raceId: existingRace.id, accountId: session.user.id, displayName, color, progress: 0, ready: false, accuracy: 100, wpm: 0 })
          .onDuplicateKeyUpdate({ set: { displayName, color, updatedAt: new Date() } });
        const participants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, existingRace.id));
        return res.json({ race: existingRace, participants });
      }

      if (existingRace) {
        const participants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, existingRace.id));
        const isOnlyParticipant = participants.length === 1 && participants[0].accountId === session.user.id;
        const isStale = (existingRace.status === 'countdown' && (!existingRace.startsAt || new Date(existingRace.startsAt).getTime() + 15000 < Date.now()))
          || (existingRace.status === 'active' && isOnlyParticipant && new Date(existingRace.updatedAt).getTime() + 120000 < Date.now());
        if (!isStale) return res.status(409).json({ error: 'A room race is already underway' });
        await db.update(typingRaces).set({ status: 'finished', updatedAt: new Date() }).where(eq(typingRaces.id, existingRace.id));
      }

      const id = `race_${roomCode}_${Date.now()}`;
      await db.insert(typingRaces).values({ id, roomCode, passage, status: 'lobby', startsAt: null, createdByAccountId: session.user.id });
      await db.insert(typingRaceParticipants).values({ raceId: id, accountId: session.user.id, displayName, color, progress: 0, ready: false, accuracy: 100, wpm: 0 });
      return res.status(201).json({ race: { id, roomCode, passage, status: 'lobby', startsAt: null }, participants: [{ accountId: session.user.id, displayName, color, progress: 0, ready: false, accuracy: 100, wpm: 0 }] });
    }

    if (!raceId) return res.status(400).json({ error: 'raceId is required' });
    const race = await db.select().from(typingRaces).where(and(eq(typingRaces.id, raceId), eq(typingRaces.roomCode, roomCode))).limit(1);
    if (!race[0]) return res.status(404).json({ error: 'Race not found' });

    if (action === 'join') {
      if (!displayName || !color) return res.status(400).json({ error: 'displayName and color are required' });
      if (race[0].status !== 'lobby') return res.status(409).json({ error: 'This race has already started' });
      const lobbyParticipants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, raceId));
      const alreadyIn = lobbyParticipants.some((participant) => participant.accountId === session.user.id);
      if (!alreadyIn && lobbyParticipants.length >= MAX_RACERS) {
        return res.status(409).json({ error: `This race is full (${MAX_RACERS}/${MAX_RACERS}).` });
      }
      await db.insert(typingRaceParticipants)
        .values({ raceId, accountId: session.user.id, displayName, color, progress: 0, ready: false, accuracy: 100, wpm: 0 })
        .onDuplicateKeyUpdate({ set: { displayName, color, updatedAt: new Date() } });
      const participants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, raceId));
      return res.json({ ok: true, participants });
    }

    if (action === 'ready') {
      const participant = await db.select().from(typingRaceParticipants).where(and(eq(typingRaceParticipants.raceId, raceId), eq(typingRaceParticipants.accountId, session.user.id))).limit(1);
      if (!participant[0]) return res.status(403).json({ error: 'Join the race first' });

      if (race[0].status === 'countdown' || race[0].status === 'active') {
        const participants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, raceId));
        return res.json({ ok: true, race: race[0], participants });
      }
      if (race[0].status !== 'lobby') return res.status(409).json({ error: 'This race has already finished' });

      await db.update(typingRaceParticipants).set({ ready: true, updatedAt: new Date() }).where(eq(typingRaceParticipants.id, participant[0].id));
      const participants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, raceId));
      const everyoneReady = participants.length > 0 && participants.every((item) => item.ready);
      if (everyoneReady) {
        const startsAt = new Date(Date.now() + 3000);
        await db.update(typingRaces).set({ status: 'countdown', startsAt, updatedAt: new Date() }).where(and(eq(typingRaces.id, raceId), eq(typingRaces.status, 'lobby')));
        const refreshedRace = await db.select().from(typingRaces).where(eq(typingRaces.id, raceId)).limit(1);
        return res.json({ ok: true, race: refreshedRace[0] ?? { ...race[0], status: 'countdown', startsAt }, participants });
      }
      return res.json({ ok: true, race: race[0], participants });
    }

    if (action === 'leave') {
      // Mark the leaver as DNF (finished last) rather than deleting them.
      // This preserves their row so the leaderboard can show them at the bottom
      // with a "DNF" marker, and prevents ghost-participant issues where the
      // race never closes because a deleted participant is still "unfinished".
      const leaver = await db.select().from(typingRaceParticipants)
        .where(and(eq(typingRaceParticipants.raceId, raceId), eq(typingRaceParticipants.accountId, session.user.id)))
        .limit(1);

      if (leaver[0] && !leaver[0].finishedAt) {
        // Set progress to -1 as a sentinel for DNF so the client can distinguish
        // "left mid-race" from "finished at 0%".
        await db.update(typingRaceParticipants)
          .set({ progress: -1, finishedAt: new Date(), updatedAt: new Date() })
          .where(eq(typingRaceParticipants.id, leaver[0].id));
      } else if (!leaver[0]) {
        // Not in this race — nothing to do
        const participants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, raceId));
        return res.json({ ok: true, race: race[0], participants });
      }

      const participants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, raceId));
      const remainingActive = participants.filter((p) => p.progress !== -1 && !p.finishedAt);

      // Close the race if everyone has either finished or DNF'd
      const everyoneDone = participants.length > 0 && participants.every((p) => Boolean(p.finishedAt));
      if (everyoneDone || remainingActive.length === 0) {
        await db.update(typingRaces).set({ status: 'finished', updatedAt: new Date() }).where(eq(typingRaces.id, raceId));
        const refreshed = await db.select().from(typingRaces).where(eq(typingRaces.id, raceId)).limit(1);
        return res.json({ ok: true, race: refreshed[0] ?? null, participants });
      }

      return res.json({ ok: true, race: race[0], participants });
    }

    if (action === 'progress') {
      if (race[0].status !== 'active') return res.status(409).json({ error: 'The race is not active' });
      const participant = await db.select().from(typingRaceParticipants).where(and(eq(typingRaceParticipants.raceId, raceId), eq(typingRaceParticipants.accountId, session.user.id))).limit(1);
      if (!participant[0]) return res.status(403).json({ error: 'Join the race first' });
      const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
      const safeAccuracy = Math.max(0, Math.min(100, Number(accuracy) || 0));
      const safeWpm = Math.max(0, Math.min(500, Number(wpm) || 0));
      const didFinish = Boolean(finished) && safeProgress === 100;
      await db.update(typingRaceParticipants).set({ progress: didFinish ? 100 : safeProgress, accuracy: safeAccuracy, wpm: safeWpm, finishedAt: didFinish ? (participant[0].finishedAt ?? new Date()) : participant[0].finishedAt, updatedAt: new Date() }).where(eq(typingRaceParticipants.id, participant[0].id));
      const participants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, raceId));
      const everyoneFinished = participants.length > 0 && participants.every((item) => Boolean(item.finishedAt));
      if (everyoneFinished) await db.update(typingRaces).set({ status: 'finished', updatedAt: new Date() }).where(and(eq(typingRaces.id, raceId), eq(typingRaces.status, 'active')));
      const refreshedRace = await db.select().from(typingRaces).where(eq(typingRaces.id, raceId)).limit(1);
      return res.json({ ok: true, race: refreshedRace[0] ?? race[0], participants });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to update race', message: String(error) });
  }
}
