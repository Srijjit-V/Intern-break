import type { Request, Response } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth';
import { db } from '../../db/client.js';
import { advanceRace } from '../../race-rules';
import { companyMembers, typingRaceParticipants, typingRaces } from '../../db/schema.js';

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
    const roomCode = String(req.query.roomCode ?? '').trim();
    if (!roomCode) return res.status(400).json({ error: 'roomCode is required' });
    const membership = await db.select({ id: companyMembers.id }).from(companyMembers)
      .where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.accountId, session.user.id))).limit(1);
    if (!membership[0]) return res.status(403).json({ error: 'You are not a member of this room' });

    const races = await db.select().from(typingRaces).where(and(eq(typingRaces.roomCode, roomCode), sql`${typingRaces.status} IN ('lobby', 'countdown', 'active')`)).orderBy(desc(typingRaces.updatedAt)).limit(1);
    let race = races[0];
    if (!race) return res.json({ race: null, participants: [] });

    const participants = await db.select().from(typingRaceParticipants).where(eq(typingRaceParticipants.raceId, race.id));
    // One pure function decides every time- and data-driven transition (src/server/race-rules.ts).
    const next = advanceRace(race, participants, Date.now());
    if (next === 'finished') {
      // Only close the status we observed, so a concurrent ready-up is not clobbered.
      await db.update(typingRaces).set({ status: 'finished', updatedAt: new Date() }).where(and(eq(typingRaces.id, race.id), eq(typingRaces.status, race.status)));
      return res.json({ race: null, participants: [] });
    }
    if (next === 'active' && race.status === 'countdown') {
      await db.update(typingRaces).set({ status: 'active', updatedAt: new Date() }).where(and(eq(typingRaces.id, race.id), eq(typingRaces.status, 'countdown')));
      race = { ...race, status: 'active' };
    }
    res.json({ race, participants });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load race', message: String(error) });
  }
}
