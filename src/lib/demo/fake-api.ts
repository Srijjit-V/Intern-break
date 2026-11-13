/**
 * In-browser stand-in for the Express API, installed only in demo builds.
 * It answers every /api request locally so the static site never hits a server.
 * State mirrors the real server's rules closely enough for the UI (first member
 * of a room is admin, points only go up on sync, solo typing race lifecycle).
 */
import { DEMO_ROOM_CODE, getDemoAccount } from './mode';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const DB_KEY = 'ibs-demo-db';

interface Db {
  rooms: Record<string, { roomCode: string; companyName: string; roomData: Json | null }>;
  members: Json[];
  history: Json[];
  redemptions: Json[];
  race: Json | null;
  nextId: number;
}

const SAMPLE = [
  { name: 'Sample: Ada', color: '#F59E0B', points: 420, role: 'admin' },
  { name: 'Sample: Bo', color: '#1BDBDB', points: 310, role: 'employee' },
  { name: 'Sample: Cy', color: '#A78BFA', points: 180, role: 'employee' },
  { name: 'Sample: Di', color: '#F472B6', points: 95, role: 'manager' },
];

function fresh(): Db {
  const db: Db = { rooms: {}, members: [], history: [], redemptions: [], race: null, nextId: 100 };
  db.rooms[DEMO_ROOM_CODE] = { roomCode: DEMO_ROOM_CODE, companyName: 'Sample Interns (demo data)', roomData: null };
  SAMPLE.forEach((s, i) =>
    db.members.push({ id: i + 1, roomCode: DEMO_ROOM_CODE, accountId: `sample-${i}`, ...s, allTimePoints: s.points, carryoverPoints: s.points, profile: null, updatedAt: new Date().toISOString() }),
  );
  return db;
}

function load(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* fall through */
  }
  return fresh();
}

function save(db: Db): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* in-memory only when storage is blocked */
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function company(db: Db, method: string, query: URLSearchParams, body: Json): Response {
  const me = getDemoAccount();
  if (method === 'GET') {
    const code = (query.get('roomCode') ?? '').trim();
    const room = db.rooms[code];
    if (!room) return json({ error: 'Company room not found' }, 404);
    return json({ room, members: db.members.filter((m) => m.roomCode === code), redemptions: db.redemptions.filter((r) => r.roomCode === code) });
  }
  const { action, roomCode } = body;
  if (!action || !roomCode) return json({ error: 'roomCode and action are required' }, 400);
  const mine = db.members.find((m) => m.roomCode === roomCode && m.accountId === me.id);
  if (action === 'sync-member') {
    db.rooms[roomCode] ??= { roomCode, companyName: body.companyName || 'Company', roomData: null };
    if (mine) {
      Object.assign(mine, { name: body.memberName || mine.name, color: body.color || mine.color, updatedAt: new Date().toISOString() });
      for (const k of ['points', 'allTimePoints', 'carryoverPoints']) mine[k] = Math.max(mine[k], Math.max(0, Number(body[k]) || 0));
      if (body.profile && typeof body.profile === 'object') mine.profile = { ...(mine.profile ?? {}), ...body.profile };
    } else {
      const first = !db.members.some((m) => m.roomCode === roomCode);
      db.members.push({
        id: db.nextId++, roomCode, accountId: me.id, name: body.memberName, color: body.color || '#1BDBDB', role: first ? 'admin' : 'employee',
        points: Math.max(0, Number(body.points) || 0), allTimePoints: Math.max(0, Number(body.allTimePoints) || 0),
        carryoverPoints: Math.max(0, Number(body.carryoverPoints) || 0), profile: body.profile ?? null, updatedAt: new Date().toISOString(),
      });
    }
    return json({ ok: true }, 201);
  }
  if (action === 'sync-room-data') {
    if (!mine) return json({ error: 'You are not a member of this room' }, 403);
    db.rooms[roomCode].roomData = body.roomData;
    return json({ ok: true });
  }
  if (action === 'redeem') {
    const cost = Number(body.points);
    if (!mine) return json({ error: 'Member not found' }, 404);
    if (!Number.isInteger(cost) || cost <= 0) return json({ error: 'points must be a positive integer' }, 400);
    if (mine.carryoverPoints < cost) return json({ error: 'Not enough points' }, 400);
    mine.carryoverPoints -= cost;
    const id = db.nextId++;
    db.redemptions.push({ id, roomCode, memberName: mine.name, rewardName: body.rewardName, points: cost, status: 'pending_fulfillment', fulfilled: false, redeemedAt: new Date().toISOString(), fulfilledAt: null });
    return json({ ok: true, redemptionId: id }, 201);
  }
  if (!mine || !['admin', 'coadmin'].includes(mine.role)) return json({ error: 'Admin access required' }, 403);
  if (action === 'set-role') {
    const t = db.members.find((m) => m.roomCode === roomCode && (body.accountId ? m.accountId === body.accountId : m.name === body.memberName));
    if (!t) return json({ error: 'Member not found' }, 404);
    t.role = body.role;
    return json({ ok: true, member: t });
  }
  if (action === 'fulfill-redemption') {
    const r = db.redemptions.find((x) => x.id === Number(body.redemptionId) && x.roomCode === roomCode);
    if (r) Object.assign(r, { fulfilled: true, status: 'fulfilled', fulfilledAt: new Date().toISOString() });
    return json({ ok: true });
  }
  return json({ error: 'Unknown action' }, 400);
}

function account(db: Db, method: string, body: Json): Response {
  const me = getDemoAccount();
  if (method === 'GET') {
    const rooms = db.history.filter((h) => h.accountId === me.id).map((h) => ({ ...h, companyName: db.rooms[h.roomCode]?.companyName ?? h.roomCode }));
    return json({ account: me, rooms });
  }
  const { action, roomCode } = body;
  if (action === 'upsert-membership') {
    const now = new Date().toISOString();
    const row = db.history.find((h) => h.accountId === me.id && h.roomCode === roomCode);
    const first = !db.members.some((m) => m.roomCode === roomCode);
    const entry = { displayName: body.displayName, avatarColor: body.avatarColor, avatarEmoji: body.avatarEmoji || null, leftAt: null, lastVisitedAt: now };
    if (row) Object.assign(row, entry);
    else db.history.push({ id: db.nextId++, accountId: me.id, roomCode, role: first ? 'admin' : 'employee', joinedAt: now, ...entry });
    db.rooms[roomCode] ??= { roomCode, companyName: body.companyName || 'Intern Break Space', roomData: null };
    return json({ ok: true }, 201);
  }
  if (action === 'leave-room') {
    db.members = db.members.filter((m) => !(m.roomCode === roomCode && m.accountId === me.id));
    db.history = db.history.filter((h) => !(h.accountId === me.id && h.roomCode === roomCode));
    return json({ ok: true });
  }
  return json({ error: 'Unknown action' }, 400);
}

/** Solo practice: the same lobby > countdown > active > finished states, one racer. */
function races(db: Db, method: string, query: URLSearchParams, body: Json): Response {
  const me = getDemoAccount();
  const r = db.race;
  if (method === 'GET') {
    if (!r || r.race.status === 'finished') return json({ race: null, participants: [] });
    if (r.race.status === 'countdown' && new Date(r.race.startsAt).getTime() <= Date.now()) r.race.status = 'active';
    save(db);
    return json(r);
  }
  const mkP = () => ({ raceId: r?.race.id, accountId: me.id, displayName: body.displayName, color: body.color, progress: 0, ready: false, accuracy: 100, wpm: 0, finishedAt: null });
  if (body.action === 'start') {
    if (!r || r.race.status === 'finished') {
      const id = `race_${body.roomCode}_${Date.now()}`;
      db.race = { race: { id, roomCode: body.roomCode, passage: body.passage, status: 'lobby', startsAt: null }, participants: [] };
      db.race.participants.push({ ...mkP(), raceId: id });
    }
    return json(db.race, 201);
  }
  if (!r) return json({ error: 'Race not found' }, 404);
  const p = r.participants[0];
  if (body.action === 'ready') {
    p.ready = true;
    r.race = { ...r.race, status: 'countdown', startsAt: new Date(Date.now() + 3000).toISOString() };
  } else if (body.action === 'progress') {
    Object.assign(p, { progress: Math.min(100, Number(body.progress) || 0), accuracy: Number(body.accuracy) || 0, wpm: Number(body.wpm) || 0 });
    if (body.finished && p.progress === 100) {
      p.finishedAt = new Date().toISOString();
      r.race.status = 'finished';
    }
  } else if (body.action === 'leave') {
    Object.assign(p, { progress: -1, finishedAt: new Date().toISOString() });
    r.race.status = 'finished';
  }
  save(db);
  return json({ ok: true, race: r.race, participants: r.participants });
}

export function installFakeApi(): void {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : null;
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.href);
    const path = url.pathname.startsWith(`${base}/api/`) ? url.pathname.slice(base.length) : url.pathname;
    if (!path.startsWith('/api/')) {
      // Anything that is not the app's own API (there is none today) is blocked
      // so a demo build can never talk to a server.
      return Promise.reject(new TypeError(`Demo mode blocked network request to ${url.pathname}`));
    }
    const method = (init?.method ?? req?.method ?? 'GET').toUpperCase();
    let body: Json = {};
    try {
      if (typeof init?.body === 'string') body = JSON.parse(init.body);
    } catch {
      /* non-JSON body */
    }
    const db = load();
    let res: Response;
    if (path === '/api/company') res = company(db, method, url.searchParams, body);
    else if (path === '/api/account') res = account(db, method, body);
    else if (path === '/api/races') res = races(db, method, url.searchParams, body);
    else if (path === '/api/health') res = json({ status: 'ok', demo: true });
    else res = json({ error: 'Not available in demo mode' }, 404);
    save(db);
    return res;
  };
}
