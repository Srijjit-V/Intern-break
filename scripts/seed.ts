/**
 * Seed demo data: one room (code DEMO), an admin and a few fake members.
 * All names and emails are fictional. Safe to re-run.
 * Usage: npm run db:seed   (needs BETTER_AUTH_SECRET and DB_* set)
 */
import { eq } from 'drizzle-orm';
import { getAuth } from '../src/lib/auth/auth';
import { closeConnection, db } from '../src/server/db/client';
import { accountRoomHistory, companyMembers, companyRooms, user } from '../src/server/db/schema';

const ROOM = 'DEMO01'; // room codes are exactly 6 characters
const PASSWORD = process.env.SEED_PASSWORD || 'demo-password-123';
const people = [
  { email: 'admin@example.test', name: 'Ada Admin', role: 'admin', color: '#F59E0B', points: 420 },
  { email: 'bo@example.test', name: 'Bo Byte', role: 'employee', color: '#1BDBDB', points: 310 },
  { email: 'cy@example.test', name: 'Cy Cache', role: 'employee', color: '#A78BFA', points: 180 },
  { email: 'di@example.test', name: 'Di Delta', role: 'manager', color: '#F472B6', points: 95 },
];

await db.insert(companyRooms).values({ roomCode: ROOM, companyName: 'Demo Interns' }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

for (const p of people) {
  let [row] = await db.select().from(user).where(eq(user.email, p.email)).limit(1);
  if (!row) {
    await getAuth().api.signUpEmail({ body: { email: p.email, password: PASSWORD, name: p.name } });
    [row] = await db.select().from(user).where(eq(user.email, p.email)).limit(1);
  }
  await db.insert(companyMembers)
    .values({ roomCode: ROOM, accountId: row.id, name: p.name, color: p.color, role: p.role, points: p.points, allTimePoints: p.points, carryoverPoints: p.points })
    .onDuplicateKeyUpdate({ set: { name: p.name, role: p.role } });
  const [hist] = await db.select().from(accountRoomHistory).where(eq(accountRoomHistory.accountId, row.id)).limit(1);
  if (!hist) await db.insert(accountRoomHistory).values({ accountId: row.id, roomCode: ROOM, displayName: p.name, avatarColor: p.color, role: p.role });
}
console.log(`seeded room ${ROOM} with ${people.length} fake members (admin: ${people[0].email})`);
await closeConnection();
