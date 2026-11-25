import { request as pw, type APIRequestContext } from '@playwright/test';
import { PASSWORD, uniqueEmail } from './helpers';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export interface ApiUser {
  name: string;
  api: APIRequestContext;
}

/** A signed-in user without a browser: fast, for API-level cross-play tests. */
export async function apiUser(name: string): Promise<ApiUser> {
  const api = await pw.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: new URL(BASE).origin } });
  const res = await api.post('api/auth/sign-up/email', { data: { email: uniqueEmail('api'), password: PASSWORD, name } });
  if (!res.ok()) throw new Error(`sign-up failed for ${name}: ${res.status()}`);
  return { name, api };
}

export const randomRoomCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

/** Join (or create, if the code is new) a room as this user. The creator becomes admin. */
export async function enterRoom(user: ApiUser, code: string, company = 'Race Test Co'): Promise<void> {
  const res = await user.api.post('api/company', { data: { action: 'sync-member', roomCode: code, companyName: company, memberName: user.name, color: '#1BDBDB' } });
  if (res.status() !== 201) throw new Error(`enterRoom failed for ${user.name}: ${res.status()}`);
}

export const race = {
  start: (u: ApiUser, code: string) => u.api.post('api/races', { data: { action: 'start', roomCode: code, passage: 'one two three', displayName: u.name, color: '#1BDBDB' } }),
  join: (u: ApiUser, code: string, raceId: string) => u.api.post('api/races', { data: { action: 'join', roomCode: code, raceId, displayName: u.name, color: '#1BDBDB' } }),
  ready: (u: ApiUser, code: string, raceId: string) => u.api.post('api/races', { data: { action: 'ready', roomCode: code, raceId } }),
  progress: (u: ApiUser, code: string, raceId: string, progress: number, finished = false) =>
    u.api.post('api/races', { data: { action: 'progress', roomCode: code, raceId, progress, accuracy: 100, wpm: 60, finished } }),
  leave: (u: ApiUser, code: string, raceId: string) => u.api.post('api/races', { data: { action: 'leave', roomCode: code, raceId } }),
  get: async (u: ApiUser, code: string) => (await u.api.get(`api/races?roomCode=${code}`)).json() as Promise<{ race: { id: string; status: string; startsAt: string | null } | null; participants: { displayName: string; progress: number; finishedAt: string | null }[] }>,
};
