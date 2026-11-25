import type { Request, Response } from 'express';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { companyMembers, companyRooms, earnLog, rewardRedemptions } from '../../db/schema.js';
import { capsFor, clampEarn } from '../../earn-budget';
import { rewardPrice } from '../../reward-catalog';
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
      // Roles are never taken from the client. The room's creator is its admin; everyone else joins as
      // employee, and keeps whatever role an admin later gave them (set-role). An empty room does not
      // hand admin to the next person to show up.
      // Insert-or-touch first so two concurrent creators resolve to one stored creator.
      await db.insert(companyRooms)
        .values({ roomCode, companyName: companyName || 'Company', createdByAccountId: session.user.id })
        .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
      const [roomRow] = await db.select().from(companyRooms).where(eq(companyRooms.roomCode, roomCode)).limit(1);
      const newMemberRole = roomRow?.createdByAccountId === session.user.id ? 'admin' : 'employee';

      const requestedPoints = Math.max(0, Number(points) || 0);
      const requestedAllTime = Math.max(0, Number(allTimePoints) || 0);
      const requestedCarryover = Math.max(0, Number(carryoverPoints) || 0);

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

      // Earn budget: totals may rise only so fast. The client's numbers are requests, not facts.
      const current = existingMember[0] ?? legacyMember ?? { points: 0, allTimePoints: 0, carryoverPoints: 0 };
      const now = Date.now();
      const sumSince = async (kind: 'points' | 'carryover', ms: number) => {
        const [row] = await db.select({ total: sql<number>`COALESCE(SUM(${earnLog.amount}), 0)` }).from(earnLog)
          .where(and(eq(earnLog.accountId, session.user.id), eq(earnLog.kind, kind), gte(earnLog.createdAt, new Date(now - ms))));
        return Number(row?.total ?? 0);
      };
      const [pointsHour, pointsDay, carryHour, carryDay] = await Promise.all([
        sumSince('points', 3_600_000), sumSince('points', 86_400_000), sumSince('carryover', 3_600_000), sumSince('carryover', 86_400_000),
      ]);
      const pointsCaps = capsFor('points');
      const earnedPoints = clampEarn({ current: current.points, requested: requestedPoints, hourUsed: pointsHour, dayUsed: pointsDay, caps: pointsCaps });
      const earnedAllTime = clampEarn({ current: current.allTimePoints, requested: requestedAllTime, hourUsed: pointsHour, dayUsed: pointsDay, caps: pointsCaps });
      const earnedCarryover = clampEarn({ current: current.carryoverPoints, requested: requestedCarryover, hourUsed: carryHour, dayUsed: carryDay, caps: capsFor('carryover') });
      const localPoints = earnedPoints.value;
      const localAllTimePoints = earnedAllTime.value;
      const localCarryoverPoints = earnedCarryover.value;
      if (earnedPoints.clamped || earnedAllTime.clamped || earnedCarryover.clamped) {
        console.warn(JSON.stringify({ event: 'earn.clamped', accountId: session.user.id, roomCode, requested: { points: requestedPoints, allTime: requestedAllTime, carryover: requestedCarryover } }));
      }
      const logRows = [
        { kind: 'points', amount: earnedPoints.gained },
        { kind: 'carryover', amount: earnedCarryover.gained },
      ].filter((r) => r.amount > 0).map((r) => ({ accountId: session.user.id, roomCode, ...r }));
      if (logRows.length) await db.insert(earnLog).values(logRows);

      if (legacyMember) {
        await db.update(companyMembers).set({
          accountId: session.user.id,
          name: memberName || legacyMember.name,
          color: color || legacyMember.color,
          // Claiming by display name proves nothing, so never inherit admin rights.
          role: legacyMember.role === 'admin' || legacyMember.role === 'coadmin' ? 'employee' : legacyMember.role,
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
            role: newMemberRole,
            points: localPoints,
            allTimePoints: localAllTimePoints,
            carryoverPoints: localCarryoverPoints,
            profile: profile && typeof profile === 'object' ? profile : null,
          })
          .onDuplicateKeyUpdate({
            set: {
              name: memberName || sql`${companyMembers.name}`,
              color: color || sql`${companyMembers.color}`,
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
      // The price comes from the server's catalog; whatever the client sends is only checked against it.
      const cost = rewardPrice(rewardName);
      if (cost === null) return res.status(400).json({ error: 'Unknown reward' });
      if (Number(points) !== cost) return res.status(400).json({ error: 'Price mismatch' });
      // Rewards are physical and an admin fulfils them: cap how many a member can have open or request per day.
      const redeemed = await db.select({ status: rewardRedemptions.status, redeemedAt: rewardRedemptions.redeemedAt }).from(rewardRedemptions)
        .where(and(eq(rewardRedemptions.roomCode, roomCode), eq(rewardRedemptions.memberName, member[0].name)));
      const pending = redeemed.filter((r) => r.status === 'pending_fulfillment').length;
      const lastDay = redeemed.filter((r) => new Date(r.redeemedAt).getTime() > Date.now() - 86_400_000).length;
      if (pending >= 3 || lastDay >= 5) return res.status(429).json({ error: 'Redemption limit reached. Wait for your open rewards to be fulfilled.' });
      // Atomic conditional debit: two concurrent redeems cannot both spend the same balance.
      const debit = await db.update(companyMembers)
        .set({ carryoverPoints: sql`${companyMembers.carryoverPoints} - ${cost}` })
        .where(and(eq(companyMembers.id, member[0].id), sql`${companyMembers.carryoverPoints} >= ${cost}`));
      if (Number(debit[0].affectedRows) !== 1) return res.status(400).json({ error: 'Not enough points' });
      const result = await db.insert(rewardRedemptions).values({ roomCode, memberName: member[0].name, rewardName, points: cost });
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
      // The creator is the room's owner: nobody can demote them, so "creator is admin" stays true.
      const [ownerRow] = await db.select({ createdBy: companyRooms.createdByAccountId }).from(companyRooms).where(eq(companyRooms.roomCode, roomCode)).limit(1);
      if (ownerRow?.createdBy && target[0].accountId === ownerRow.createdBy && role !== 'admin') {
        return res.status(403).json({ error: 'The room creator cannot be demoted' });
      }

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
