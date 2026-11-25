import { expect, test } from '@playwright/test';
import { apiUser, enterRoom, race, randomRoomCode, type ApiUser } from './api-users';
import { ageRace } from './db';

/** A room with the given players, a race in the lobby with all of them in it. */
async function lobby(names: string[]) {
  const users: ApiUser[] = [];
  for (const n of names) users.push(await apiUser(n));
  const code = randomRoomCode();
  for (const u of users) await enterRoom(u, code);
  const started = await race.start(users[0], code);
  expect(started.status()).toBe(201);
  const raceId = (await started.json()).race.id as string;
  for (const u of users.slice(1)) expect((await race.join(u, code, raceId)).ok()).toBeTruthy();
  return { users, code, raceId };
}

async function toActive(users: ApiUser[], code: string, raceId: string) {
  for (const u of users) expect((await race.ready(u, code, raceId)).ok()).toBeTruthy();
  expect((await race.get(users[0], code)).race?.status).toBe('countdown');
  await expect.poll(async () => (await race.get(users[0], code)).race?.status, { timeout: 10_000 }).toBe('active');
}

test.describe('Typing Race state machine, one test per transition', () => {
  test('start -> lobby, join -> lobby, ready x all -> countdown -> active -> finished, in finish order', async () => {
    const { users, code, raceId } = await lobby(['Ann', 'Ben']);
    const view = await race.get(users[0], code);
    expect(view.race?.status).toBe('lobby');
    expect(view.participants.map((p) => p.displayName).sort()).toEqual(['Ann', 'Ben']);

    // One ready is not enough: still a lobby.
    await race.ready(users[0], code, raceId);
    expect((await race.get(users[1], code)).race?.status).toBe('lobby');

    await toActive(users, code, raceId);
    await race.progress(users[0], code, raceId, 50);
    await race.progress(users[1], code, raceId, 20);
    const mid = await race.get(users[1], code);
    expect(mid.participants.find((p) => p.displayName === 'Ann')?.progress).toBe(50);

    await race.progress(users[0], code, raceId, 100, true);
    expect((await race.get(users[1], code)).race?.status).toBe('active'); // Ben still racing
    await race.progress(users[1], code, raceId, 100, true);
    expect((await race.get(users[0], code)).race).toBeNull(); // all finished -> closed
  });

  test('a late join is rejected once the countdown has started', async () => {
    const { users, code, raceId } = await lobby(['Cal', 'Dee']);
    const late = await apiUser('Latecomer');
    await enterRoom(late, code);
    for (const u of users) await race.ready(u, code, raceId);
    const res = await race.join(late, code, raceId);
    expect(res.status()).toBe(409);
    expect((await race.start(late, code)).status()).toBe(409); // cannot open a second race either
  });

  test('a sixth racer is rejected: the lobby holds five', async () => {
    const { users, code, raceId } = await lobby(['P1', 'P2', 'P3', 'P4', 'P5']);
    const sixth = await apiUser('P6');
    await enterRoom(sixth, code);
    expect((await race.join(sixth, code, raceId)).status()).toBe(409);
    expect(users).toHaveLength(5);
  });

  test('a user outside the room cannot see or join its race (wrong room code)', async () => {
    const { code, raceId } = await lobby(['Eve', 'Fay']);
    const outsider = await apiUser('Outsider');
    const otherRoom = randomRoomCode();
    await enterRoom(outsider, otherRoom);
    expect((await outsider.api.get(`api/races?roomCode=${code}`)).status()).toBe(403);
    expect((await race.join(outsider, code, raceId)).status()).toBe(403);
    expect((await race.get(outsider, otherRoom)).race).toBeNull();
  });

  test('two races at once in different rooms do not affect each other', async () => {
    const one = await lobby(['R1a', 'R1b']);
    const two = await lobby(['R2a', 'R2b']);
    await toActive(one.users, one.code, one.raceId);
    await toActive(two.users, two.code, two.raceId);
    await race.progress(one.users[0], one.code, one.raceId, 100, true);
    await race.progress(one.users[1], one.code, one.raceId, 100, true);
    expect((await race.get(one.users[0], one.code)).race).toBeNull();
    const still = await race.get(two.users[0], two.code);
    expect(still.race?.status).toBe('active');
    expect(still.participants.every((p) => p.finishedAt === null)).toBe(true);
  });

  test('a player leaving mid-race is DNF (progress -1) and the others carry on', async () => {
    const { users, code, raceId } = await lobby(['Gus', 'Hal', 'Ivy']);
    await toActive(users, code, raceId);
    expect((await race.leave(users[1], code, raceId)).ok()).toBeTruthy();
    const view = await race.get(users[0], code);
    expect(view.race?.status).toBe('active');
    expect(view.participants.find((p) => p.displayName === 'Hal')?.progress).toBe(-1);
    await race.progress(users[0], code, raceId, 100, true);
    await race.progress(users[2], code, raceId, 100, true);
    expect((await race.get(users[0], code)).race).toBeNull();
  });

  test('the host leaving does not end the race for everyone else', async () => {
    const { users, code, raceId } = await lobby(['Host', 'Joe']);
    await toActive(users, code, raceId);
    await race.leave(users[0], code, raceId); // users[0] opened the lobby
    const view = await race.get(users[1], code);
    expect(view.race?.status).toBe('active');
    await race.progress(users[1], code, raceId, 100, true);
    expect((await race.get(users[1], code)).race).toBeNull();
  });

  test('a refresh mid-race loses nothing: progress is kept on the server', async () => {
    const { users, code, raceId } = await lobby(['Kim', 'Lou']);
    await toActive(users, code, raceId);
    await race.progress(users[0], code, raceId, 60);
    // "Refresh" = a brand new client reading the same state.
    const fresh = await race.get(users[0], code);
    expect(fresh.race?.id).toBe(raceId);
    expect(fresh.participants.find((p) => p.displayName === 'Kim')?.progress).toBe(60);
  });

  test('a silent disconnect cannot block the room: an idle active race closes after 2 minutes', async () => {
    const { users, code, raceId } = await lobby(['Max', 'Nia', 'Oli']);
    await toActive(users, code, raceId);
    await race.progress(users[0], code, raceId, 100, true);
    await race.progress(users[1], code, raceId, 100, true); // Oli never reports again
    expect((await race.get(users[0], code)).race?.status).toBe('active');
    await ageRace(raceId, 150);
    expect((await race.get(users[0], code)).race).toBeNull();
    expect((await race.start(users[0], code)).status()).toBe(201); // the room is free again
  });

  test('a stale countdown closes, and a new race can start', async () => {
    const { users, code, raceId } = await lobby(['Pat', 'Quin']);
    for (const u of users) await race.ready(u, code, raceId);
    await ageRace(raceId, 60);
    expect((await race.get(users[0], code)).race).toBeNull();
    expect((await race.start(users[1], code)).status()).toBe(201);
  });

  test('an abandoned lobby closes after 10 minutes and a new start replaces it', async () => {
    const { users, code, raceId } = await lobby(['Ray', 'Sue']);
    await ageRace(raceId, 11 * 60);
    expect((await race.get(users[0], code)).race).toBeNull();
    const fresh = await race.start(users[0], code);
    expect(fresh.status()).toBe(201);
    expect((await fresh.json()).race.id).not.toBe(raceId);
  });
});
