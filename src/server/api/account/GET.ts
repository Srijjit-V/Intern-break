import type { Request, Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth';
import { db } from '../../db/client.js';
import { accountRoomHistory, companyRooms } from '../../db/schema.js';

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

    const history = await db
      .select()
      .from(accountRoomHistory)
      .where(eq(accountRoomHistory.accountId, session.user.id))
      .orderBy(desc(accountRoomHistory.lastVisitedAt));

    const rooms = await Promise.all(history.map(async (membership) => {
      const room = await db.select().from(companyRooms).where(eq(companyRooms.roomCode, membership.roomCode)).limit(1);
      return { ...membership, companyName: room[0]?.companyName ?? membership.roomCode };
    }));

    res.json({ account: { id: session.user.id, name: session.user.name, email: session.user.email }, rooms });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load account profile', message: String(error) });
  }
}
