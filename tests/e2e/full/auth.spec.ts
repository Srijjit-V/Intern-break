import { expect, test } from '@playwright/test';
import { PASSWORD, signIn, signUp, uniqueEmail } from './helpers';

test('sign up, survive reload, sign out, sign in again', async ({ page }) => {
  const email = await signUp(page, 'Auth Tester');
  await expect(page.getByText(email).first()).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/profile/);
  await expect(page.getByText(email).first()).toBeVisible();

  await page.getByRole('button', { name: /sign out|logout/i }).first().click();
  await expect(page).toHaveURL(/login/);

  await signIn(page, email);
  await expect(page).toHaveURL(/profile|room|challenges/);
});

test('wrong password is rejected', async ({ page }) => {
  const email = uniqueEmail('wrongpw');
  await signUp(page, 'Wrong Pw');
  await page.context().clearCookies();
  await signIn(page, email, 'not-the-password-1');
  await expect(page).toHaveURL(/login/);
  await expect(page.getByText(/invalid|incorrect|wrong|failed|unable/i).first()).toBeVisible();
});

test('duplicate sign up shows an error', async ({ browser, page }) => {
  const email = await signUp(page, 'Dup One');
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto('signup');
  await p2.locator('input[type=text]').first().fill('Dup Two');
  await p2.locator('input[type=email]').fill(email);
  await p2.locator('input[type=password]').fill(PASSWORD);
  await p2.locator('button[type=submit]').click();
  await expect(p2).toHaveURL(/signup/);
  await expect(p2.getByText(/exist|already|taken|registered/i).first()).toBeVisible();
  await ctx2.close();
});

test('logged-out visit to a protected page redirects to login', async ({ page }) => {
  for (const path of ['challenges', 'leaderboard', 'admin', 'typing-race']) {
    await page.goto(path);
    await expect(page).toHaveURL(/login/);
  }
});
