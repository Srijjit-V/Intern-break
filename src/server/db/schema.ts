import { boolean, int, json, mysqlTable, text, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';

export const companyRooms = mysqlTable('company_rooms', {
  id: int('id').primaryKey().autoincrement(),
  roomCode: varchar('room_code', { length: 64 }).notNull().unique(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  roomData: json('room_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// A unique constraint on (roomCode, accountId) makes duplicate member rows
// structurally impossible — even if two "join room" requests race, MySQL's
// ON DUPLICATE KEY UPDATE (see sync-member in POST.ts) resolves them into a
// single row instead of creating two "copies" of the same person.
export const companyMembers = mysqlTable('company_members', {
  id: int('id').primaryKey().autoincrement(),
  roomCode: varchar('room_code', { length: 64 }).notNull(),
  accountId: varchar('account_id', { length: 36 }),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 32 }).notNull(),
  role: varchar('role', { length: 16 }).notNull().default('employee'),
  points: int('points').notNull().default(0),
  allTimePoints: int('all_time_points').notNull().default(0),
  carryoverPoints: int('carryover_points').notNull().default(0),
  profile: json('profile'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  oneMemberPerAccountPerRoom: unique('company_members_room_account_unique').on(table.roomCode, table.accountId),
}));

export const accountRoomHistory = mysqlTable('account_room_history', {
  id: int('id').primaryKey().autoincrement(),
  accountId: varchar('account_id', { length: 36 }).notNull(),
  roomCode: varchar('room_code', { length: 64 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  avatarColor: varchar('avatar_color', { length: 32 }).notNull(),
  avatarEmoji: varchar('avatar_emoji', { length: 16 }),
  role: varchar('role', { length: 16 }).notNull().default('employee'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  lastVisitedAt: timestamp('last_visited_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
});

export const typingRaces = mysqlTable('typing_races', {
  id: varchar('id', { length: 64 }).primaryKey(),
  roomCode: varchar('room_code', { length: 64 }).notNull(),
  passage: text('passage').notNull(),
  status: varchar('status', { length: 16 }).notNull().default('lobby'),
  startsAt: timestamp('starts_at'),
  createdByAccountId: varchar('created_by_account_id', { length: 36 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().onUpdateNow(),
});

export const typingRaceParticipants = mysqlTable('typing_race_participants', {
  id: int('id').primaryKey().autoincrement(),
  raceId: varchar('race_id', { length: 64 }).notNull(),
  accountId: varchar('account_id', { length: 36 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  color: varchar('color', { length: 32 }).notNull(),
  progress: int('progress').notNull().default(0),
  ready: boolean('ready').notNull().default(false),
  accuracy: int('accuracy').notNull().default(100),
  wpm: int('wpm').notNull().default(0),
  finishedAt: timestamp('finished_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull().onUpdateNow(),
}, (table) => ({
  oneParticipantPerRace: unique('typing_race_participants_race_account_unique').on(table.raceId, table.accountId),
}));

export const rewardRedemptions = mysqlTable('reward_redemptions', {
  id: int('id').primaryKey().autoincrement(),
  roomCode: varchar('room_code', { length: 64 }).notNull(),
  memberName: varchar('member_name', { length: 255 }).notNull(),
  rewardName: varchar('reward_name', { length: 255 }).notNull(),
  points: int('points').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending_fulfillment'),
  fulfilled: boolean('fulfilled').notNull().default(false),
  redeemedAt: timestamp('redeemed_at').defaultNow().notNull(),
  fulfilledAt: timestamp('fulfilled_at'),
});

// ── BetterAuth tables ────────────────────────────────────────────────────────

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  image: text('image'),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const session = mysqlTable('session', {
  id: varchar('id', { length: 36 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const account = mysqlTable('account', {
  id: varchar('id', { length: 36 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: varchar('password', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const verification = mysqlTable('verification', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
