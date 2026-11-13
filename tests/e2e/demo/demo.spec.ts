import { expect, test, type Page } from '@playwright/test';

async function createDemoRoom(page: Page) {
  await page.goto('room');
  await page.getByRole('tab', { name: 'Create' }).click();
  await page.getByPlaceholder('Acme Corp').fill('Acme Demo');
  await page.getByPlaceholder('Jordan').fill('Jordan Demo');
  await page.getByRole('button', { name: /Create room/ }).click();
  await page.waitForURL(/challenges/);
}

test('demo loads signed in, shows the banner and never calls /api on the network', async ({ page }) => {
  const apiRequests: string[] = [];
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.includes('/api/')) apiRequests.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));

  await page.goto('./');
  await expect(page).toHaveURL(/profile/);
  await expect(page.getByRole('status')).toContainText('Demo');
  await createDemoRoom(page);
  for (const p of ['games', 'leaderboard', 'closet', 'rewards', 'points-history', 'admin', 'typing-race']) {
    await page.goto(p);
    await expect(page.locator('main, body').first()).not.toBeEmpty();
  }
  expect(apiRequests).toEqual([]);
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

test('deep link survives a refresh', async ({ page }) => {
  await createDemoRoom(page);
  await page.goto('leaderboard');
  await page.reload();
  await expect(page).toHaveURL(/leaderboard/);
  await expect(page.getByText('Leaderboard').first()).toBeVisible();
});

test('joining the sample room works and shows labeled sample members', async ({ page }) => {
  await page.goto('room');
  await page.getByRole('tab', { name: 'Join' }).click();
  await page.getByPlaceholder('AB3X7K').fill('DEMO42');
  await page.getByPlaceholder('Alex').fill('Visitor');
  await page.getByRole('button', { name: /Enter room/ }).click();
  await page.waitForURL(/challenges/);
  await page.goto('leaderboard');
  await expect(page.getByText('Sample: Ada').first()).toBeVisible();
});

test('a trivia score saves and survives reload', async ({ page }) => {
  await createDemoRoom(page);
  await page.goto('trivia');
  await page.getByRole('button', { name: 'Start Game' }).click();
  await expect(page.getByText('1/10')).toBeVisible();
  // Answer one question correctly so the points counter moves.
  const trivia = (await import('../../../src/content/data/trivia.json', { with: { type: 'json' } })).default as { question: string; answers: string[]; correct: number }[];
  const question = await page.locator('main').innerText();
  const match = trivia.find((q) => question.includes(q.question));
  expect(match).toBeTruthy();
  await page.getByRole('button', { name: new RegExp(match!.answers[match!.correct].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
  await expect(page.getByText(/[1-9]\d* pts/).first()).toBeVisible();
  const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ibs')).length);
  await page.reload();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ibs')).length)).toBe(stored);
});

test('typing race is solo practice', async ({ page }) => {
  await createDemoRoom(page);
  await page.goto('typing-race');
  await expect(page.getByRole('status')).toContainText('Live races need the full server');
});
