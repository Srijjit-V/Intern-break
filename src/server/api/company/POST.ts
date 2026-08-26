import type { Request, Response } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
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
    const { action, roomCode, companyName, memberName, color, role, rewardName, points, allTimePoints, carryoverPoints, profile } = req.body ?? {};
    if (!roomCode || !action) return res.status(400).json({ error: 'roomCode and action are required' });

    if (action === 'sync-member') {
      // Upsert the room itself first. Two concurrent "create room" calls with
      // the same code would both hit the unique(roomCode) constraint here —
      // the second one is simply ignored, so we never end up with orphaned
      // room rows either.
      await db.insert(companyRooms)
        .values({ roomCode, companyName: companyName || 'Company' })
        .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

      const localPoints = Math.max(0, Number(points) || 0);
      const localAllTimePoints = Math.max(0, Number(allTimePoints) || 0);
      const localCarryoverPoints = Math.max(0, Number(carryoverPoints) || 0);
      const roleIsValid = ['admin', 'coadmin', 'manager', 'employee'].includes(role);
      const safeRole = roleIsValid ? role : 'employee';

      // Atomic upsert keyed on the (roomCode, accountId) unique constraint.
      // This is the fix for the "joining creates two profiles" bug: the old
      // code did a SELECT to check for an existing member and then a
      // separate INSERT/UPDATE. If two requests for the same person raced
      // (double-click on "Enter room", a retried request, two tabs syncing
      // at once), both SELECTs could return empty before either INSERT
      // committed, producing two rows for the same account in the same room.
      // A single INSERT ... ON DUPLICATE KEY UPDATE is atomic at the
      // database level, so a race can no longer create a duplicate row —
      // MySQL resolves the second write into an UPDATE of the first.
      const existingMember = await db.select().from(companyMembers)
        .where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.accountId, session.user.id)))
        .limit(1);
      const legacyMembers = !existingMember[0] && memberName
        ? await db.select().from(companyMembers).where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.name, memberName))).orderBy(desc(companyMembers.updatedAt))
        : [];
      const legacyMember = legacyMembers.find((member) => !member.accountId);

      if (legacyMember) {
        await db.update(companyMembers).set({
          accountId: session.user.id,
          name: memberName || legacyMember.name,
          color: color || legacyMember.color,
          role: roleIsValid ? safeRole : legacyMember.role,
          points: Math.max(legacyMember.points, localPoints),
          allTimePoints: Math.max(legacyMember.allTimePoints, localAllTimePoints),
          carryoverPoints: Math.max(legacyMember.carryoverPoints, localCarryoverPoints),
          profile: profile && typeof profile === 'object' ? profile : legacyMember.profile,
          updatedAt: new Date(),
        }).where(eq(companyMembers.id, legacyMember.id));
        const duplicateLegacyIds = legacyMembers.filter((member) => !member.accountId && member.id !== legacyMember.id).map((member) => member.id);
        if (duplicateLegacyIds.length) await db.delete(companyMembers).where(sql`${companyMembers.id} IN (${sql.join(duplicateLegacyIds.map((id) => sql`${id}`), sql`, `)})`);
      } else {
        await db.insert(companyMembers)
          .values({
            roomCode,
            accountId: session.user.id,
            name: memberName,
            color: color || '#1BDBDB',
            role: safeRole,
            points: localPoints,
            allTimePoints: localAllTimePoints,
            carryoverPoints: localCarryoverPoints,
            profile: profile && typeof profile === 'object' ? profile : null,
          })
          .onDuplicateKeyUpdate({
            set: {
              name: memberName || sql`${companyMembers.name}`,
              color: color || sql`${companyMembers.color}`,
              role: roleIsValid ? safeRole : sql`${companyMembers.role}`,
              points: sql`GREATEST(${companyMembers.points}, ${localPoints})`,
              allTimePoints: sql`GREATEST(${companyMembers.allTimePoints}, ${localAllTimePoints})`,
              carryoverPoints: sql`GREATEST(${companyMembers.carryoverPoints}, ${localCarryoverPoints})`,
              profile: profile && typeof profile === 'object'
                ? sql`JSON_MERGE_PATCH(COALESCE(${companyMembers.profile}, JSON_OBJECT()), ${JSON.stringify(profile)})`
                : sql`${companyMembers.profile}`,
              updatedAt: new Date(),
            },
          });
      }

      return res.status(201).json({ ok: true });
    }

    if (action === 'sync-room-data') {
      // Any authenticated room member can push shared quest/challenge state.
      // Verify the caller is actually a member of this room first.
      const callerMember = await db.select().from(companyMembers)
        .where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.accountId, session.user.id)))
        .limit(1);
      if (!callerMember[0]) return res.status(403).json({ error: 'You are not a member of this room' });
      const roomData = req.body.roomData;
      if (!roomData || typeof roomData !== 'object') return res.status(400).json({ error: 'roomData is required' });
      await db.update(companyRooms)
        .set({ roomData: roomData as Record<string, unknown>, updatedAt: new Date() })
        .where(eq(companyRooms.roomCode, roomCode));
      return res.json({ ok: true });
    }

    if (action === 'redeem') {
      // Use accountId as the primary lookup key — memberName is mutable and
      // not unique. Fall back to name only for legacy rows without an accountId.
      const memberByAccount = await db.select().from(companyMembers)
        .where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.accountId, session.user.id)))
        .orderBy(desc(companyMembers.updatedAt)).limit(1);
      const member = memberByAccount[0]
        ? memberByAccount
        : await db.select().from(companyMembers).where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.name, memberName))).orderBy(desc(companyMembers.updatedAt)).limit(1);
      if (!member[0]) return res.status(404).json({ error: 'Member not found' });
      const available = member[0].carryoverPoints;
      if (available < Number(points)) return res.status(400).json({ error: 'Not enough points' });
      await db.update(companyMembers).set({ carryoverPoints: available - Number(points) }).where(eq(companyMembers.id, member[0].id));
      const result = await db.insert(rewardRedemptions).values({ roomCode, memberName: member[0].name, rewardName, points: Number(points) });
      return res.status(201).json({ ok: true, redemptionId: Number(result[0].insertId) });
    }

    const actor = await db.select().from(companyMembers).where(and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.accountId, session.user.id))).orderBy(desc(companyMembers.updatedAt)).limit(1);
    if (!actor[0] || !['admin', 'coadmin'].includes(actor[0].role)) return res.status(403).json({ error: 'Admin access required' });

    if (action === 'set-role') {
      const targetAccountId = typeof req.body.accountId === 'string' ? req.body.accountId.trim() : '';
      if (!role || !['admin', 'coadmin', 'manager', 'employee'].includes(role)) return res.status(400).json({ error: 'A valid role is required' });
      if (!targetAccountId && !memberName) return res.status(400).json({ error: 'A member identity is required' });

      const target = await db.select().from(companyMembers)
        .where(targetAccountId
          ? and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.accountId, targetAccountId))
          : and(eq(companyMembers.roomCode, roomCode), eq(companyMembers.name, memberName)))
        .orderBy(desc(companyMembers.updatedAt))
        .limit(1);
      if (!target[0]) return res.status(404).json({ error: 'Member not found' });

      await db.update(companyMembers).set({ role, updatedAt: new Date() }).where(eq(companyMembers.id, target[0].id));
      return res.json({ ok: true, member: { ...target[0], role } });
    }

    if (action === 'fulfill-redemption') {
      const redemptionId = Number(req.body.redemptionId);
      if (!redemptionId) return res.status(400).json({ error: 'redemptionId is required' });
      await db.update(rewardRedemptions).set({ fulfilled: true, status: 'fulfilled', fulfilledAt: new Date() }).where(and(eq(rewardRedemptions.id, redemptionId), eq(rewardRedemptions.roomCode, roomCode)));
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to update company data', message: String(error) });
  }
}
