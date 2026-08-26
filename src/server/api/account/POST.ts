import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth';
import { db } from '../../db/client.js';
import { accountRoomHistory, companyMembers, companyRooms } from '../../db/schema.js';

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

    const { action, roomCode, companyName, displayName, avatarColor, avatarEmoji, role } = req.body ?? {};
    if (!action || !roomCode) return res.status(400).json({ error: 'action and roomCode are required' });

    if (action === 'upsert-membership') {
      if (!displayName || !avatarColor) return res.status(400).json({ error: 'displayName and avatarColor are required' });
      const safeRole = ['admin', 'coadmin', 'manager', 'employee'].includes(role) ? role : 'employee';
      const existing = await db.select().from(accountRoomHistory).where(and(eq(accountRoomHistory.accountId, session.user.id), eq(accountRoomHistory.roomCode, roomCode))).limit(1);
      if (existing[0]) {
        await db.update(accountRoomHistory).set({ displayName, avatarColor, avatarEmoji: avatarEmoji || null, role: safeRole, leftAt: null, lastVisitedAt: new Date() }).where(eq(accountRoomHistory.id, existing[0].id));
      } else {
        await db.insert(accountRoomHistory).values({ accountId: session.user.id, roomCode, displayName, avatarColor, avatarEmoji: avatarEmoji || null, role: safeRole });
      }

      const room = await db.select().from(companyRooms).where(eq(companyRooms.roomCode, roomCode)).limit(1);
      if (!room[0]) await db.insert(companyRooms).values({ roomCode, companyName: companyName || 'Intern Break Space' });
      const member = await db.select().from(companyMembers).where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.accountId, session.user.id))).limit(1);
      if (member[0]) {
        await db.update(companyMembers).set({ name: displayName, color: avatarColor, role: safeRole, accountId: session.user.id, updatedAt: new Date() }).where(eq(companyMembers.id, member[0].id));
      } else {
        // Claim a matching legacy row before inserting. This migrates profiles
        // created before authentication was added instead of leaving a second
        // roster entry behind for the same person.
        const legacyMember = await db.select().from(companyMembers).where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.name, displayName))).limit(1);
        if (legacyMember[0] && !legacyMember[0].accountId) {
          await db.update(companyMembers)
            .set({ accountId: session.user.id, name: displayName, color: avatarColor, role: safeRole, updatedAt: new Date() })
            .where(eq(companyMembers.id, legacyMember[0].id));
        } else {
          await db.insert(companyMembers)
            .values({ roomCode, accountId: session.user.id, name: displayName, color: avatarColor, role: safeRole })
            .onDuplicateKeyUpdate({ set: { name: displayName, color: avatarColor, role: safeRole, updatedAt: new Date() } });
        }
      }
      return res.status(201).json({ ok: true });
    }

    if (action === 'leave-room') {
      await db.delete(companyMembers).where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.accountId, session.user.id)));
      await db.delete(accountRoomHistory).where(and(eq(accountRoomHistory.accountId, session.user.id), eq(accountRoomHistory.roomCode, roomCode)));
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to update account profile', message: String(error) });
  }
}
