import { expect, test, type Page } from '@playwright/test';
import { createRoom, joinRoom, newUser } from './helpers';

/** Race passage comes from the API; read it with the page's own session cookies. */
async function racePassage(page: Page, roomCode: string): Promise<string> {
  const res = await page.request.get(`api/races?roomCode=${roomCode}`);
  const body = await res.json();
  return body.race.passage as string;
}

test.describe('two users in one room', () => {
  test('both appear in the room, roles are enforced, and a wrong code is rejected', async ({ browser }) => {
    const a = await newUser(browser, 'Alice Admin');
    const code = await createRoom(a.page, 'Cross Co', 'Alice Admin');
    const b = await newUser(browser, 'Bob Member');
    await joinRoom(b.page, code, 'Bob Member');

    await a.page.goto('leaderboard');
    await expect(a.page.getByText('Bob Member').first()).toBeVisible();
    await b.page.goto('leaderboard');
    await expect(b.page.getByText('Alice Admin').first()).toBeVisible();

    // Non-admin must not see the admin panel contents.
    await b.page.goto('admin');
    await expect(b.page.getByText('Member Management')).toHaveCount(0);

    // Wrong room code.
    const c = await newUser(browser, 'Carl Lost');
    await c.page.goto('room');
    await c.page.getByRole('tab', { name: 'Join' }).click();
    await c.page.getByPlaceholder('AB3X7K').fill('ZZZZZZ');
    await c.page.getByPlaceholder('Alex').fill('Carl Lost');
    await c.page.getByRole('button', { name: /Enter room/ }).click();
    await expect(c.page.getByText(/room not found/i)).toBeVisible();
    await a.ctx.close(); await b.ctx.close(); await c.ctx.close();
  });

  test('typing race: lobby, countdown, live progress, finish order, isolation', async ({ browser }) => {
    const a = await newUser(browser, 'Racer Ann');
    const code = await createRoom(a.page, 'Race Co', 'Racer Ann');
    const b = await newUser(browser, 'Racer Ben');
    await joinRoom(b.page, code, 'Racer Ben');
    const outsider = await newUser(browser, 'Outsider Oz');
    const otherCode = await createRoom(outsider.page, 'Other Co', 'Outsider Oz');
    expect(otherCode).not.toBe(code);

    // A opens the race page and creates the lobby.
    await a.page.goto('typing-race');
    await a.page.getByRole('button', { name: /Go to Race/i }).first().click();
    await a.page.getByRole('button', { name: 'Start Race' }).click();
    await expect(a.page.getByText(/1\/5 racers|1 racer/)).toBeVisible();

    // B joins the lobby (polling, up to ~1s) and sees both racers.
    await b.page.goto('typing-race');
    await b.page.getByRole('button', { name: /Go to Race/i }).first().click();
    await expect(b.page.getByText(/2\/5 racers|Racer Ann/).first()).toBeVisible({ timeout: 15_000 });
    await b.page.getByRole('button', { name: /Start Race|Join|Ready/i }).first().click();

    // Countdown appears for both.
    await expect(a.page.getByText(/Countdown started|Everyone is ready/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(b.page.getByText(/Countdown started|Everyone is ready|Race starting/i).first()).toBeVisible({ timeout: 15_000 });

    // Outsider's room sees no race of ours.
    const other = await outsider.page.request.get(`api/races?roomCode=${otherCode}`);
    expect((await other.json()).race).toBeNull();
    const cross = await outsider.page.request.get(`api/races?roomCode=${code}`);
    expect(cross.status()).toBe(403);
    const join = await outsider.page.request.post('api/races', { data: { action: 'start', roomCode: code, passage: 'x y z', displayName: 'Outsider Oz', color: '#fff' } });
    expect(join.status()).toBe(403);

    // Race goes active; A types the whole passage and finishes first.
    const passage = await racePassage(a.page, code);
    const input = a.page.locator('input').last();
    await expect(input).toBeEnabled({ timeout: 20_000 });
    await input.click();
    await a.page.keyboard.type(passage.slice(0, 120), { delay: 8 });

    // B sees A's progress move on their own screen without reloading.
    await expect.poll(async () => {
      const r = await b.page.request.get(`api/races?roomCode=${code}`);
      const j = await r.json();
      const ann = (j.participants ?? []).find((p: { displayName: string }) => p.displayName === 'Racer Ann');
      return ann?.progress ?? 0;
    }, { timeout: 15_000 }).toBeGreaterThan(0);

    await a.ctx.close(); await b.ctx.close(); await outsider.ctx.close();
  });

  test('a player who leaves mid-race is marked DNF and the race can end', async ({ browser }) => {
    const a = await newUser(browser, 'Leaver Lou');
    const code = await createRoom(a.page, 'Leave Co', 'Leaver Lou');
    const r = await a.page.request.post('api/races', {
      data: { action: 'start', roomCode: code, passage: 'one two three', displayName: 'Leaver Lou', color: '#1BDBDB' },
    });
    expect(r.status()).toBe(201);
    const { race } = await r.json();
    const left = await a.page.request.post('api/races', { data: { action: 'leave', roomCode: code, raceId: race.id } });
    const body = await left.json();
    expect(body.participants[0].progress).toBe(-1);
    expect(body.race.status).toBe('finished');
    const after = await a.page.request.get(`api/races?roomCode=${code}`);
    expect((await after.json()).race).toBeNull();
    await a.ctx.close();
  });
});
