import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { companyMembers, companyRooms, rewardRedemptions } from '../../db/schema.js';
import { getAuth } from '@/lib/auth/auth';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const headers = new Headers();
    if (req.headers.cookie) headers.set('cookie', req.headers.cookie);
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in required' });
    const roomCode = String(req.query.roomCode ?? '').trim();
    if (!roomCode) return res.status(400).json({ error: 'roomCode is required' });

    const rooms = await db.select().from(companyRooms).where(eq(companyRooms.roomCode, roomCode)).limit(1);
    if (!rooms[0]) return res.status(404).json({ error: 'Company room not found' });

    const rawMembers = await db.select().from(companyMembers).where(eq(companyMembers.roomCode, roomCode));
    const redemptions = await db.select().from(rewardRedemptions).where(eq(rewardRedemptions.roomCode, roomCode));

    // Account ID is the only durable room-member identity. Legacy rows without
    // one are retained only when no authenticated row already represents the
    // same display name, so an old local profile cannot appear beside the
    // authenticated member who replaced it.
    const authenticatedNames = new Set(
      rawMembers
        .filter((member) => Boolean(member.accountId))
        .map((member) => member.name.trim().toLowerCase()),
    );
    const eligibleMembers = rawMembers.filter((member) => member.accountId || !authenticatedNames.has(member.name.trim().toLowerCase()));
    const groups = new Map<string, typeof eligibleMembers>();
    for (const member of eligibleMembers) {
      // Authenticated account identity is authoritative. For legacy records,
      // display names are the only available identity, so collapse them too.
      const key = member.accountId ? `id:${member.accountId}` : `legacy:${member.name.trim().toLowerCase()}`;
      const group = groups.get(key);
      if (group) group.push(member);
      else groups.set(key, [member]);
    }
    const members = Array.from(groups.values()).map((group) => {
      const newest = group.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
      return {
        ...newest,
        points: Math.max(...group.map((m) => m.points)),
        allTimePoints: Math.max(...group.map((m) => m.allTimePoints)),
        carryoverPoints: Math.max(...group.map((m) => m.carryoverPoints)),
      };
    });

    res.json({ room: rooms[0], members, redemptions });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load company data', message: String(error) });
  }
}
