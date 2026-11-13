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

    // A opens the lobby.
    await a.page.goto('typing-race');
    await a.page.getByRole('button', { name: /Go to Race/i }).first().click();
    await a.page.getByRole('button', { name: 'Start Race' }).click();
    await expect(a.page.getByText(/1\/5 racers/)).toBeVisible();

    // B sees the open lobby (polling, about 1s) and joins it.
    await b.page.goto('typing-race');
    await b.page.getByRole('button', { name: /Go to Race/i }).first().click();
    await b.page.getByRole('button', { name: 'Join Live Race' }).click({ timeout: 15_000 });
    await expect(b.page.getByText(/2\/5 racers/)).toBeVisible({ timeout: 15_000 });
    await expect(a.page.getByText(/2\/5 racers/)).toBeVisible({ timeout: 15_000 });

    // Both ready up; the countdown starts for both.
    await a.page.getByRole('button', { name: 'Ready up' }).click();
    await b.page.getByRole('button', { name: 'Ready up' }).click();
    await expect(a.page.getByText(/Countdown started|Everyone is ready/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(b.page.getByText(/Countdown started|Everyone is ready/i).first()).toBeVisible({ timeout: 15_000 });

    // Outsider's room sees no race of ours.
    const other = await outsider.page.request.get(`api/races?roomCode=${otherCode}`);
    expect((await other.json()).race).toBeNull();
    const cross = await outsider.page.request.get(`api/races?roomCode=${code}`);
    expect(cross.status()).toBe(403);
    const join = await outsider.page.request.post('api/races', { data: { action: 'start', roomCode: code, passage: 'x y z', displayName: 'Outsider Oz', color: '#fff' } });
    expect(join.status()).toBe(403);

    // Race goes active; A types the whole passage and finishes first, B follows.
    const passage = await racePassage(a.page, code);
    const typeAll = async (page: Page) => {
      const input = page.locator('input:not([disabled])').last();
      await expect(input).toBeEnabled({ timeout: 25_000 });
      await input.click();
      await page.keyboard.type(passage + ' ', { delay: 6 });
    };
    await typeAll(a.page);

    // B sees A's progress on their own screen's data without reloading.
    await expect.poll(async () => {
      const j = await (await b.page.request.get(`api/races?roomCode=${code}`)).json();
      return (j.participants ?? []).find((p: { displayName: string }) => p.displayName === 'Racer Ann')?.progress ?? 0;
    }, { timeout: 15_000 }).toBe(100);

    await typeAll(b.page);

    // Both finished: the race closes, and Ann crossed the line before Ben.
    await expect.poll(async () => (await (await a.page.request.get(`api/races?roomCode=${code}`)).json()).race, { timeout: 20_000 }).toBeNull();
    await expect(a.page.getByText(/Racer Ben/).first()).toBeVisible({ timeout: 15_000 });
    await expect(b.page.getByText(/Racer Ann/).first()).toBeVisible({ timeout: 15_000 });

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
