import { expect, test } from '@playwright/test';
import trivia from '../../../src/content/data/trivia.json' with { type: 'json' };
import { createRoom, newUser, trackErrors } from './helpers';

test.describe('single user in a room', () => {
  test('create room, every page and game loads without errors', async ({ browser }) => {
    const { ctx, page } = await newUser(browser, 'Solo Tester');
    const errors = trackErrors(page);
    const code = await createRoom(page, 'Solo Co', 'Solo Tester');

    await page.goto('challenges');
    await expect(page.getByText(code).first()).toBeVisible();

    const routes = ['games', 'flappy', 'freezeria', 'snake', 'memory', 'trivia', 'set', 'crossy', 'typing', 'typing-race', 'leaderboard', 'closet', 'rewards', 'points-history', 'profile', 'admin'];
    for (const route of routes) {
      await page.goto(route);
      await expect(page, route).toHaveURL(new RegExp(`/${route}$`));
      await expect(page.locator('body'), route).not.toContainText(/something went wrong|application error/i);
    }
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('session survives reload and the room persists', async ({ browser }) => {
    const { ctx, page } = await newUser(browser, 'Persist Tester');
    const code = await createRoom(page, 'Persist Co', 'Persist Tester');
    await page.reload();
    await page.goto('challenges');
    await expect(page.getByText(code).first()).toBeVisible();
    await ctx.close();
  });

  test('trivia: a correct answer earns points', async ({ browser }) => {
    const { ctx, page } = await newUser(browser, 'Trivia Tester');
    await createRoom(page, 'Trivia Co', 'Trivia Tester');
    await page.goto('trivia');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('1/10')).toBeVisible();
    const text = await page.locator('body').innerText();
    const q = (trivia as { question: string; answers: string[]; correct: number }[]).find((x) => text.includes(x.question));
    expect(q).toBeTruthy();
    await page.getByRole('button', { name: q!.answers[q!.correct] }).click();
    await expect(page.getByText(/[1-9]\d* pts/).first()).toBeVisible();
    await ctx.close();
  });

  test('snake: starts and responds to the keyboard', async ({ browser }) => {
    const { ctx, page } = await newUser(browser, 'Snake Tester');
    const errors = trackErrors(page);
    await createRoom(page, 'Snake Co', 'Snake Tester');
    await page.goto('snake');
    await page.getByRole('button', { name: 'Start Game' }).click();
    for (const k of ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) {
      await page.keyboard.press(k);
      await page.waitForTimeout(150);
    }
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('memory: starts a game', async ({ browser }) => {
    const { ctx, page } = await newUser(browser, 'Memory Tester');
    await createRoom(page, 'Memory Co', 'Memory Tester');
    await page.goto('memory');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText(/Moves|moves/).first()).toBeVisible();
    await ctx.close();
  });

  test('typing: countdown starts', async ({ browser }) => {
    const { ctx, page } = await newUser(browser, 'Typing Tester');
    await createRoom(page, 'Typing Co', 'Typing Tester');
    await page.goto('typing');
    await page.getByRole('button', { name: 'Start Game' }).click();
    await expect(page.getByText('Get ready…')).toBeVisible();
    await ctx.close();
  });

  test('avatar shop and rewards show locked state with zero balance', async ({ browser }) => {
    const { ctx, page } = await newUser(browser, 'Shop Tester');
    await createRoom(page, 'Shop Co', 'Shop Tester');
    await page.goto('closet');
    await expect(page.getByText('Avatar Closet')).toBeVisible();
    await page.goto('rewards');
    await expect(page.getByText('Classic T-shirt')).toBeVisible();
    await page.getByRole('button', { name: 'Redeem reward' }).first().click();
    await expect(page.getByText(/not enough|need|insufficient|more diamonds/i).first()).toBeVisible();
    await ctx.close();
  });

  test('admin panel works for the room creator', async ({ browser }) => {
    const { ctx, page } = await newUser(browser, 'Admin Tester');
    await createRoom(page, 'Admin Co', 'Admin Tester');
    await page.goto('admin');
    await expect(page.getByText('Admin Panel')).toBeVisible();
    await expect(page.getByText('Member Management')).toBeVisible();
    await ctx.close();
  });
});
