// ─── IBS Store ────────────────────────────────────────────────────────────────
// All localStorage helpers, types, and pure-logic utilities for the portal.

import { DEFAULT_PINNED_GAMES, type GameId } from '@/lib/game-registry';

// ── Types ─────────────────────────────────────────────────────────────────────

export type IBSUser = {
  id?: string;
  name: string;
  roomCode?: string;
  role?: string;
  color?: string;
  points?: number;
  allTimePoints?: number;
  gold?: number;
  diamonds?: number;
  avatarColor?: string;
  avatarEmoji?: string;
  avatarUrl?: string;
  gameHighScore?: number;       // Flappy Bird
  flappyRunsToday?: number;
  flappyRunDate?: string;
  flappyOfficialScore?: number;
  typingHighScore?: number;     // Speed Typing (WPM)
  triviaHighScore?: number;     // Trivia Blitz
  crossyHighScore?: number;     // Crossy Road
  snakeHighScore?: number;      // Snake
  memoryHighScore?: number;     // Memory Match (score = pairs * 10 - moves)
  [key: string]: unknown;
};

export type IBSMember = IBSUser;

export type IBSRoomTheme = {
  primaryColor?: string;
  mode?: 'light' | 'dark';
  defaultMode?: 'light' | 'dark';
  backgroundImage?: string;
  spaceName?: string;
  tagline?: string;
};

export type IBSCompanyChallenge = {
  id?: string;
  title?: string;
  task?: string;
  date?: string;
  points?: number;
  completedBy?: string[];
  type?: string;
  [key: string]: unknown;
};

export type IBSChallenge = {
  id: string;
  type: 'personal' | 'group' | 'company' | 'move';
  fromName: string;
  toName: string;
  task: string;
  emoji?: string;
  completed: boolean;
  points: number;
  date: string;
  groupCompletedBy?: string[];
  groupTitle?: string;
  questGroupId?: string;
  [key: string]: unknown;
};

export type IBSQuestGroup = {
  id: string;
  name: string;
  memberNames: string[];
  createdBy: string;
  createdAt: string;
};

export type IBSFlappyEntry = { name: string; score: number; color?: string; date?: string; [key: string]: unknown };

export type IBSMoveRecord = {
  date: string;
  completed: boolean;
  partnerName?: string;
};

export type IBSRoom = {
  roomCode: string;
  companyName?: string;
  roomTheme?: IBSRoomTheme;
  members?: IBSUser[];
  challenges?: Record<string, IBSChallenge>;
  companyChallenge?: IBSCompanyChallenge;
  flappyLeaderboard?: IBSFlappyEntry[];
  questGroups?: IBSQuestGroup[];
  moveChallenges?: Record<string, IBSMoveRecord>;
  createdAt?: string;
  [key: string]: unknown;
};

export type RunResult = { isNewBest: boolean };

// ── Constants ─────────────────────────────────────────────────────────────────

export const DEFAULT_ROOM_THEME: IBSRoomTheme = { primaryColor: '#1BDBDB', mode: 'dark', defaultMode: 'dark' };

const USER_KEY = 'ibs-user';
const ROOMS_KEY = 'ibs-rooms';
const PERSONAL_KEY = 'ibs-personal-challenges';
const WEEKLY_KEY = 'ibs-weekly-activity';
const PINNED_GAMES_KEY = 'ibs-pinned-games';

// ── User helpers ──────────────────────────────────────────────────────────────

export function getUser(): IBSUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as IBSUser) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: IBSUser): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_KEY);
}

// ── Room helpers ──────────────────────────────────────────────────────────────

export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getRooms(): Record<string, IBSRoom> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(ROOMS_KEY) ?? '{}') as Record<string, IBSRoom>;
  } catch {
    return {};
  }
}

export function getRoom(roomCode: string): IBSRoom | null {
  if (typeof window === 'undefined') return null;
  try {
    const rooms = JSON.parse(window.localStorage.getItem(ROOMS_KEY) ?? '{}') as Record<string, IBSRoom>;
    return rooms[roomCode] ?? null;
  } catch {
    return null;
  }
}

export function saveRoom(roomOrCode: IBSRoom | string, roomData?: IBSRoom): void {
  if (typeof window === 'undefined') return;
  const room: IBSRoom =
    typeof roomOrCode === 'string' ? (roomData ?? { roomCode: roomOrCode }) : roomOrCode;
  try {
    const rooms = JSON.parse(window.localStorage.getItem(ROOMS_KEY) ?? '{}') as Record<string, IBSRoom>;
    rooms[room.roomCode] = room;
    window.localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  } catch {
    window.localStorage.setItem(ROOMS_KEY, JSON.stringify({ [room.roomCode]: room }));
  }
  window.dispatchEvent(new Event('ibs-room-updated'));
}

// ── Sidebar quick-picks helpers ───────────────────────────────────────────────

/** Games pinned to the sidebar rail for one-tap access. Falls back to defaults. */
export function getPinnedGames(): GameId[] {
  if (typeof window === 'undefined') return DEFAULT_PINNED_GAMES;
  try {
    const raw = window.localStorage.getItem(PINNED_GAMES_KEY);
    if (!raw) return DEFAULT_PINNED_GAMES;
    const parsed = JSON.parse(raw) as GameId[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PINNED_GAMES;
  } catch {
    return DEFAULT_PINNED_GAMES;
  }
}

export function savePinnedGames(ids: GameId[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PINNED_GAMES_KEY, JSON.stringify(ids));
}

// ── Theme helpers ─────────────────────────────────────────────────────────────

function hexToHsl(hex: string): string | null {
  const normalized = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return `0 0% ${Math.round(lightness * 100)}%`;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  return `${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function applyRoomTheme(theme: IBSRoomTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = hexToHsl(theme.primaryColor ?? DEFAULT_ROOM_THEME.primaryColor ?? '#1BDBDB');
  if (primary) {
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--sidebar-primary', primary);
    root.style.setProperty('--ring', primary);
    root.style.setProperty('--accent', primary);
  }
  root.dataset.roomTheme = theme.mode ?? theme.defaultMode ?? 'dark';

}

/**
 * Set (or clear) the current user's profile photo, and mirror it onto their
 * room member record so it shows up in the header, leaderboard, and closet.
 */
export function setUserAvatarUrl(avatarUrl: string | null): IBSUser | null {
  const user = getUser();
  if (!user) return null;
  const updated: IBSUser = { ...user, avatarUrl: avatarUrl ?? undefined };
  saveUser(updated);

  if (user.roomCode) {
    const room = getRoom(user.roomCode);
    if (room) {
      const members = (room.members ?? []).map((m) =>
        m.name === user.name ? { ...m, avatarUrl: avatarUrl ?? undefined } : m,
      );
      saveRoom({ ...room, members });
    }
  }

  void persistCurrentRoomProfile(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ibs-currency-updated'));
  }
  return updated;
}

// ── Sync helpers ──────────────────────────────────────────────────────────────

export function syncUserFromRoom(): IBSUser | null {
  const user = getUser();
  if (!user?.roomCode) return user;
  const room = getRoom(user.roomCode);
  const member = room?.members?.find((item) => item.id === user.id || item.name === user.name);
  if (!member) return user;
  const updated = { ...user, ...member };
  saveUser(updated);
  void persistCurrentRoomProfile(updated);
  return updated;
}

/** Save the active room profile to the server without blocking gameplay. */
export async function persistCurrentRoomProfile(user = getUser()): Promise<void> {
  if (!user?.roomCode || typeof window === 'undefined') return;
  const room = getRoom(user.roomCode);
  if (!room) return;
  try {
    await fetch('/api/company', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync-member',
        roomCode: user.roomCode,
        companyName: room.companyName ?? 'Intern Break Space',
        memberName: user.name,
        color: user.color ?? '#1BDBDB',
        role: user.role ?? 'employee',
        points: Number(user.points ?? 0),
        allTimePoints: Number(user.allTimePoints ?? 0),
        carryoverPoints: 0,
        profile: user,
      }),
    });
  } catch {
    // Local state remains available; the next profile sync will retry.
  }
}

// ── Currency helpers ──────────────────────────────────────────────────────────

export function spendGold(roomCode: string, memberName: string, amount: number): boolean {
  const room = getRoom(roomCode);
  const member = room?.members?.find((item) => item.name === memberName);
  if (!room || !member || Number(member.gold ?? member.points ?? 0) < amount) return false;
  const balanceKey = typeof member.gold === 'number' ? 'gold' : 'points';
  member[balanceKey] = Number(member[balanceKey] ?? 0) - amount;
  saveRoom(room);
  syncUserFromRoom();
  return true;
}

export function spendDiamonds(roomCode: string, memberName: string, amount: number): boolean {
  const room = getRoom(roomCode);
  const member = room?.members?.find((item) => item.name === memberName);
  if (!room || !member || Number(member.diamonds ?? 0) < amount) return false;
  member.diamonds = Number(member.diamonds ?? 0) - amount;
  saveRoom(room);
  syncUserFromRoom();
  return true;
}

// ── Points helpers ────────────────────────────────────────────────────────────

/** Award gold + diamonds to a user after a game win. */
export function awardGamePoints(user: IBSUser, points: number): IBSUser {
  const goldGain = Math.max(1, Math.round(points * 0.5));
  const diamondGain = Math.max(1, Math.round(points * 0.25));
  const updated: IBSUser = {
    ...user,
    points: Number(user.points ?? 0) + points,
    gold: Number(user.gold ?? 0) + goldGain,
    diamonds: Number(user.diamonds ?? 0) + diamondGain,
  };
  saveUser(updated);
  // Sync to room member too
  const room = getRoom(updated.roomCode ?? '');
  if (room) {
    const members = (room.members ?? []).map((m) =>
      m.name === updated.name
        ? { ...m, gold: Number(m.gold ?? 0) + goldGain, diamonds: Number(m.diamonds ?? 0) + diamondGain }
        : m,
    );
    saveRoom({ ...room, members });
  }
  void persistCurrentRoomProfile(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ibs-currency-updated'));
  }
  return updated;
}

/** Award points + gold + diamonds to a room member after completing a challenge. */
export function awardChallengePoints(roomCode: string, memberName: string, points: number): void {
  const room = getRoom(roomCode);
  if (!room) return;
  const goldGain = Math.max(1, Math.round(points * 0.5));
  const diamondGain = Math.max(1, Math.round(points * 0.25));
  const members = (room.members ?? []).map((m) => {
    if (m.name !== memberName) return m;
    return {
      ...m,
      points: Number(m.points ?? 0) + points,
      allTimePoints: Number(m.allTimePoints ?? 0) + points,
      gold: Number(m.gold ?? 0) + goldGain,
      diamonds: Number(m.diamonds ?? 0) + diamondGain,
    };
  });
  saveRoom({ ...room, members });
  const updatedUser = syncUserFromRoom();
  void persistCurrentRoomProfile(updatedUser);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ibs-currency-updated'));
  }
}

// ── Flappy helpers ────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordFlappyRun(score: number): RunResult {
  const user = getUser();
  if (!user) return { isNewBest: false };
  const prevBest = Number(user.gameHighScore ?? 0);
  const isNewBest = score > prevBest;
  const goldGain = isNewBest ? Math.max(1, Math.round(score * 0.5)) : 1;
  const diamondGain = isNewBest ? Math.max(1, Math.round(score * 0.25)) : 0;
  const updated: IBSUser = {
    ...user,
    gameHighScore: Math.max(prevBest, score),
    flappyRunsToday: (user.flappyRunDate === todayStr() ? Number(user.flappyRunsToday ?? 0) : 0) + 1,
    flappyRunDate: todayStr(),
    gold: Number(user.gold ?? 0) + goldGain,
    diamonds: Number(user.diamonds ?? 0) + diamondGain,
  };
  saveUser(updated);
  const room = getRoom(updated.roomCode ?? '');
  if (room) {
    const members = (room.members ?? []).map((m) =>
      m.name === updated.name
        ? { ...m, gameHighScore: updated.gameHighScore, gold: Number(m.gold ?? 0) + goldGain, diamonds: Number(m.diamonds ?? 0) + diamondGain }
        : m,
    );
    saveRoom({ ...room, members });
  }
  void persistCurrentRoomProfile(updated);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('ibs-currency-updated'));
  return { isNewBest };
}

/** Save a Crossy Road score — persists to user + room member, awards gold+diamonds on new best. */
export function recordCrossyScore(score: number): boolean {
  const user = getUser();
  if (!user) return false;
  const prev = Number(user.crossyHighScore ?? 0);
  const isNewBest = score > prev;
  if (!isNewBest) return false;
  const goldGain = Math.max(1, Math.round(score * 0.5));
  const diamondGain = Math.max(1, Math.round(score * 0.25));
  const updated: IBSUser = { ...user, crossyHighScore: score, gold: Number(user.gold ?? 0) + goldGain, diamonds: Number(user.diamonds ?? 0) + diamondGain };
  saveUser(updated);
  const room = getRoom(updated.roomCode ?? '');
  if (room) {
    const members = (room.members ?? []).map((m) =>
      m.name === updated.name ? { ...m, crossyHighScore: score, gold: Number(m.gold ?? 0) + goldGain, diamonds: Number(m.diamonds ?? 0) + diamondGain } : m,
    );
    saveRoom({ ...room, members });
  }
  void persistCurrentRoomProfile(updated);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('ibs-currency-updated'));
  return true;
}

/** Save a Snake score — persists to user + room member, awards gold+diamonds on new best. */
export function recordSnakeScore(score: number): boolean {
  const user = getUser();
  if (!user) return false;
  const prev = Number(user.snakeHighScore ?? 0);
  const isNewBest = score > prev;
  if (!isNewBest) return false;
  const goldGain = Math.max(1, Math.round(score * 2));
  const diamondGain = Math.max(1, Math.round(score * 1));
  const updated: IBSUser = { ...user, snakeHighScore: score, gold: Number(user.gold ?? 0) + goldGain, diamonds: Number(user.diamonds ?? 0) + diamondGain };
  saveUser(updated);
  const room = getRoom(updated.roomCode ?? '');
  if (room) {
    const members = (room.members ?? []).map((m) =>
      m.name === updated.name ? { ...m, snakeHighScore: score, gold: Number(m.gold ?? 0) + goldGain, diamonds: Number(m.diamonds ?? 0) + diamondGain } : m,
    );
    saveRoom({ ...room, members });
  }
  void persistCurrentRoomProfile(updated);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('ibs-currency-updated'));
  return true;
}

/** Save a Memory Match score — persists to user + room member, awards gold+diamonds on new best. */
export function recordMemoryScore(score: number): boolean {
  const user = getUser();
  if (!user) return false;
  const prev = Number(user.memoryHighScore ?? 0);
  const isNewBest = score > prev;
  if (!isNewBest) return false;
  const goldGain = Math.max(1, Math.round(score * 0.3));
  const diamondGain = Math.max(1, Math.round(score * 0.15));
  const updated: IBSUser = { ...user, memoryHighScore: score, gold: Number(user.gold ?? 0) + goldGain, diamonds: Number(user.diamonds ?? 0) + diamondGain };
  saveUser(updated);
  const room = getRoom(updated.roomCode ?? '');
  if (room) {
    const members = (room.members ?? []).map((m) =>
      m.name === updated.name ? { ...m, memoryHighScore: score, gold: Number(m.gold ?? 0) + goldGain, diamonds: Number(m.diamonds ?? 0) + diamondGain } : m,
    );
    saveRoom({ ...room, members });
  }
  void persistCurrentRoomProfile(updated);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('ibs-currency-updated'));
  return true;
}

// ── Personal challenge helpers ────────────────────────────────────────────────

const PERSONAL_POOL: Array<{ emoji: string; task: string; points: number }> = [
  { emoji: '🧘', task: 'Take a 5-minute breathing break', points: 10 },
  { emoji: '💧', task: 'Drink a full glass of water', points: 5 },
  { emoji: '🚶', task: 'Walk around the block once', points: 15 },
  { emoji: '📵', task: 'Put your phone face-down for 30 min', points: 10 },
  { emoji: '🌿', task: 'Step outside for 10 minutes', points: 15 },
  { emoji: '🎵', task: 'Listen to one song without multitasking', points: 5 },
  { emoji: '✍️', task: 'Write down 3 things you\'re grateful for', points: 10 },
  { emoji: '🤸', task: 'Do 10 jumping jacks', points: 10 },
  { emoji: '😴', task: 'Close your eyes and rest for 5 minutes', points: 10 },
  { emoji: '📖', task: 'Read something non-work for 10 minutes', points: 10 },
];

function deterministicIndex(seed: string, len: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % len;
}

export function getPersonalChallengeStatus(
  room: IBSRoom,
  memberName: string,
  date: string,
): { challenge: { emoji: string; task: string; points: number }; completed: boolean } {
  const seed = `${room.roomCode ?? ''}:${memberName}:${date}`;
  const idx = deterministicIndex(seed, PERSONAL_POOL.length);
  const challenge = PERSONAL_POOL[idx];
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(PERSONAL_KEY) ?? '{}',
    ) as Record<string, boolean>;
    const completed = stored[seed] === true;
    return { challenge, completed };
  } catch {
    return { challenge, completed: false };
  }
}

export function completePersonalChallenge(
  roomCode: string,
  memberName: string,
  date: string,
): void {
  const room = getRoom(roomCode);
  if (!room) return;
  const seed = `${roomCode}:${memberName}:${date}`;
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(PERSONAL_KEY) ?? '{}',
    ) as Record<string, boolean>;
    if (stored[seed]) return;
    stored[seed] = true;
    window.localStorage.setItem(PERSONAL_KEY, JSON.stringify(stored));
    const { challenge } = getPersonalChallengeStatus(room, memberName, date);
    awardChallengePoints(roomCode, memberName, challenge.points);
  } catch {
    // ignore
  }
}

// ── Move challenge helpers ────────────────────────────────────────────────────

const MOVE_POOL: Array<{ emoji: string; task: string; points: number; minutes: number; alt: string }> = [
  { emoji: '🏃', task: 'Walk to the nearest coffee shop and back', points: 20, minutes: 10, alt: 'Walk around the office floor twice instead.' },
  { emoji: '🧗', task: 'Take the stairs instead of the elevator', points: 15, minutes: 5, alt: 'Do 10 calf raises at your desk.' },
  { emoji: '🤸', task: 'Do a 5-minute stretch routine', points: 15, minutes: 5, alt: 'Roll your shoulders and neck for 2 minutes.' },
  { emoji: '🚴', task: 'Bike or walk around the block twice', points: 25, minutes: 15, alt: 'March in place for 3 minutes.' },
  { emoji: '💃', task: 'Dance to one full song', points: 20, minutes: 4, alt: 'Tap your feet and sway in your chair for one song.' },
  { emoji: '🏋️', task: 'Do 20 bodyweight squats', points: 20, minutes: 3, alt: 'Do 20 seated leg lifts instead.' },
  { emoji: '🧘', task: 'Hold a plank for 60 seconds', points: 20, minutes: 2, alt: 'Do a seated core hold for 30 seconds.' },
  { emoji: '🌳', task: 'Find a tree outside and touch it', points: 15, minutes: 8, alt: 'Step outside for 2 minutes of fresh air.' },
];

export function getMoveChallengeStatus(
  room: IBSRoom,
  memberName: string,
  date: string,
): {
  challenge: { emoji: string; task: string; points: number; minutes: number; alt: string };
  partner: string | null;
  completed: boolean;
} {
  const seed = `move:${room.roomCode ?? ''}:${memberName}:${date}`;
  const idx = deterministicIndex(seed, MOVE_POOL.length);
  const challenge = MOVE_POOL[idx];

  // Pick a partner deterministically
  const others = (room.members ?? [])
    .map((m) => m.name)
    .filter((n) => n !== memberName);
  const partner =
    others.length > 0 ? others[deterministicIndex(seed + 'p', others.length)] : null;

  const moveKey = `${room.roomCode ?? ''}:${memberName}:${date}`;
  const completed = room.moveChallenges?.[moveKey]?.completed === true;

  return { challenge, partner: partner ?? null, completed };
}

export function completeMoveChallenge(
  roomCode: string,
  memberName: string,
  date: string,
): void {
  const room = getRoom(roomCode);
  if (!room) return;
  const moveKey = `${roomCode}:${memberName}:${date}`;
  if (room.moveChallenges?.[moveKey]?.completed) return;
  const { challenge } = getMoveChallengeStatus(room, memberName, date);
  const updated: IBSRoom = {
    ...room,
    moveChallenges: {
      ...(room.moveChallenges ?? {}),
      [moveKey]: { date, completed: true },
    },
  };
  saveRoom(updated);
  awardChallengePoints(roomCode, memberName, challenge.points);
}

// ── Weekly activity helpers ───────────────────────────────────────────────────

export function recordWeeklyActivity(
  roomCode: string,
  memberName: string,
  type: string,
  points: number,
): void {
  try {
    const key = `${WEEKLY_KEY}:${roomCode}:${memberName}`;
    const stored = JSON.parse(
      window.localStorage.getItem(key) ?? '[]',
    ) as Array<{ date: string; type: string; points: number }>;
    stored.push({ date: todayStr(), type, points });
    window.localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // ignore
  }
}

export function getWeeklyActivity(
  roomCode: string,
  memberName: string,
): Array<{ date: string; type: string; points: number }> {
  try {
    const key = `${WEEKLY_KEY}:${roomCode}:${memberName}`;
    return JSON.parse(
      window.localStorage.getItem(key) ?? '[]',
    ) as Array<{ date: string; type: string; points: number }>;
  } catch {
    return [];
  }
}
